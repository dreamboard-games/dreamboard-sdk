import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  type HostToPluginEnvelope,
  type PluginProtocolTape,
  type PluginToHostPayload,
  type SubmitInteractionCommand,
  type ValidateInteractionCommand,
} from "@dreamboard-games/plugin-runtime-contract";
import type { PluginTransport } from "../../runtime/core/types.js";
import { digestUIFixtureTransportRequest } from "./canonical.js";

export interface FixtureHostEvent {
  readonly sequence: number;
  readonly atMs: number;
  readonly kind:
    | "frame-sent"
    | "validate-received"
    | "submit-received"
    | "ack-received"
    | "ready-received"
    | "diagnostic";
  readonly requestDigest?: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly result?: "accepted" | "rejected";
}

export interface FixtureHostHarness {
  readonly transport: PluginTransport;
  readonly tape: PluginProtocolTape;
  reset(): void;
  flush(): Promise<void>;
  advanceHost(): Promise<void>;
  getCurrentFrameId(): string;
  getEvents(): readonly FixtureHostEvent[];
  assertConsumed(): void;
}

export interface CreateFixtureHostHarnessOptions {
  readonly tape: PluginProtocolTape;
  readonly strict?: boolean;
  readonly latencyMs?: number;
  readonly channelId?: string;
  readonly onEvent?: (event: FixtureHostEvent) => void;
  readonly nowMs?: () => number;
}

const DEFAULT_CHANNEL_ID = "fixture-channel";

export function createFixtureHostHarness(
  options: CreateFixtureHostHarnessOptions,
): FixtureHostHarness {
  const strict = options.strict ?? true;
  const latencyMs = options.latencyMs ?? 0;
  const channelId = options.channelId ?? DEFAULT_CHANNEL_ID;
  const events: FixtureHostEvent[] = [];
  const frameById = new Map(
    options.tape.frames.map((frame) => [frame.id, frame]),
  );
  let eventSequence = 0;
  let envelopeSequence = 0;
  let stepCursor = 0;
  let currentFrameId: string | null = null;
  let onMessage: ((message: HostToPluginEnvelope) => void) | null = null;

  const record = (event: Omit<FixtureHostEvent, "sequence" | "atMs">) => {
    const entry = {
      sequence: ++eventSequence,
      atMs: options.nowMs?.() ?? eventSequence,
      ...event,
    };
    events.push(entry);
    options.onEvent?.(entry);
  };

  const createFixtureError = (code: string, message: string): Error => {
    record({ kind: "diagnostic" });
    const error = new Error(message);
    error.name = "FixtureHostHarnessError";
    Object.assign(error, { errorCode: code });
    return error;
  };

  const sendHostPayload = (payload: HostToPluginEnvelope["payload"]) => {
    if (!onMessage) {
      return;
    }
    onMessage({
      protocol: DREAMBOARD_PLUGIN_PROTOCOL,
      version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      channelId,
      sequence: ++envelopeSequence,
      payload,
    });
  };

  const sendInit = () => {
    sendHostPayload({
      type: "runtime.init",
      session: options.tape.session,
    });
  };

  const publishFrame = (frameId: string) => {
    const frame = frameById.get(frameId);
    if (!frame) {
      throw createFixtureError(
        "fixture-missing-frame",
        `Plugin protocol tape references missing frame '${frameId}'.`,
      );
    }
    currentFrameId = frame.id;
    record({
      kind: "frame-sent",
      frameId: frame.id,
      projectionDigest: frame.projectionDigest,
    });
    sendHostPayload({
      type: "gameplay.frame",
      frame: frame.frame,
    });
  };

  const drainHostFrames = () => {
    while (options.tape.steps[stepCursor]?.kind === "host.frame") {
      const step = options.tape.steps[stepCursor] as Extract<
        PluginProtocolTape["steps"][number],
        { kind: "host.frame" }
      >;
      stepCursor += 1;
      publishFrame(step.frameId);
    }
  };

  const waitForConfiguredLatency = async () => {
    if (latencyMs <= 0) {
      await Promise.resolve();
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
  };

  const consumeExpectedStep = <
    Kind extends "client.validate" | "client.submit",
  >(
    kind: Kind,
    requestDigest: string,
  ): Extract<PluginProtocolTape["steps"][number], { kind: Kind }> => {
    const step = options.tape.steps[stepCursor];
    if (!step) {
      throw createFixtureError(
        "fixture-protocol-exhausted",
        `Plugin protocol tape has no remaining step for ${kind}.`,
      );
    }
    if (step.kind !== kind) {
      throw createFixtureError(
        "fixture-protocol-step-mismatch",
        `Expected protocol step '${step.kind}' but received '${kind}'.`,
      );
    }
    if (step.fromFrameId !== currentFrameId) {
      throw createFixtureError(
        "fixture-protocol-frame-mismatch",
        `Expected protocol from frame '${step.fromFrameId}' but current frame is '${currentFrameId ?? "<none>"}'.`,
      );
    }
    if (step.requestDigest !== requestDigest) {
      const mode = strict ? "strict" : "compatible";
      throw createFixtureError(
        "fixture-protocol-digest-mismatch",
        `${mode} fixture protocol digest mismatch for ${kind}: expected ${step.requestDigest}, received ${requestDigest}.`,
      );
    }
    stepCursor += 1;
    return step as Extract<PluginProtocolTape["steps"][number], { kind: Kind }>;
  };

  const handleValidate = async (command: ValidateInteractionCommand) => {
    const requestDigest = digestUIFixtureTransportRequest({
      operation: "validate",
      basis: command.basis,
      interactionId: command.interactionId,
      payload: command.params,
    });
    const step = consumeExpectedStep("client.validate", requestDigest);
    record({
      kind: "validate-received",
      requestDigest,
      result: step.response.valid ? "accepted" : "rejected",
    });
    await waitForConfiguredLatency();
    sendHostPayload({
      type: "interaction.validation-result",
      requestId: command.requestId,
      result: step.response,
    });
  };

  const handleSubmit = async (command: SubmitInteractionCommand) => {
    const requestDigest = digestUIFixtureTransportRequest({
      operation: "submit",
      basis: command.basis,
      interactionId: command.interactionId,
      payload: command.params,
    });
    const step = consumeExpectedStep("client.submit", requestDigest);
    record({
      kind: "submit-received",
      requestDigest,
      result: step.response.accepted ? "accepted" : "rejected",
    });
    await waitForConfiguredLatency();
    sendHostPayload({
      type: "interaction.submit-result",
      requestId: command.requestId,
      result: step.response,
    });
    if (step.response.accepted) {
      await waitForConfiguredLatency();
      drainHostFrames();
    }
  };

  const handleClientPayload = (payload: PluginToHostPayload) => {
    switch (payload.type) {
      case "runtime.ready":
        record({ kind: "ready-received" });
        break;
      case "runtime.ack":
        record({ kind: "ack-received" });
        break;
      case "interaction.validate":
        void handleValidate(payload);
        break;
      case "interaction.submit":
        void handleSubmit(payload);
        break;
      case "runtime.error":
        record({ kind: "diagnostic" });
        break;
      default: {
        const _exhaustive: never = payload;
        return _exhaustive;
      }
    }
  };

  const transport: PluginTransport = {
    start(nextOnMessage) {
      onMessage = nextOnMessage;
      queueMicrotask(() => {
        sendInit();
        drainHostFrames();
      });
      return () => {
        onMessage = null;
      };
    },
    send(message) {
      handleClientPayload(message);
    },
  };

  return {
    transport,
    tape: options.tape,
    reset() {
      eventSequence = 0;
      envelopeSequence = 0;
      stepCursor = 0;
      currentFrameId = null;
      events.length = 0;
      if (onMessage) {
        sendInit();
        drainHostFrames();
      }
    },
    async flush() {
      await waitForConfiguredLatency();
      await Promise.resolve();
    },
    async advanceHost() {
      await waitForConfiguredLatency();
      drainHostFrames();
    },
    getCurrentFrameId() {
      if (!currentFrameId) {
        throw createFixtureError(
          "fixture-frame-not-started",
          "Fixture host has not emitted a gameplay frame.",
        );
      }
      return currentFrameId;
    },
    getEvents() {
      return events.map((event) => ({ ...event }));
    },
    assertConsumed() {
      if (stepCursor !== options.tape.steps.length) {
        throw createFixtureError(
          "fixture-unconsumed-protocol-steps",
          `Plugin protocol tape consumed ${stepCursor} of ${options.tape.steps.length} protocol step(s).`,
        );
      }
    },
  };
}
