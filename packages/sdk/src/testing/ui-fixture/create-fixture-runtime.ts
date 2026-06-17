import type { PlayerId } from "@dreamboard/manifest-contract";
import type {
  PluginRuntimeAPI,
  PluginRuntimeDiagnosticEvent,
} from "../../runtime/api/createPluginRuntimeAPI.js";
import type { PluginStateSnapshot } from "../../runtime/index.js";
import type {
  PluginSessionState,
  SubmissionError,
  ValidationResult,
} from "../../runtime/types/runtime-api.js";
import { digestUIFixtureTransportRequest } from "./canonical.js";
import type {
  UIFixtureFrame,
  UIFixtureProtocolStep,
  UIScenarioFixture,
} from "./schema.js";

export interface FixtureRuntimeEvent {
  readonly sequence: number;
  readonly atMs: number;
  readonly kind: "frame" | "validate" | "submit" | "refresh" | "diagnostic";
  readonly requestDigest?: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly result?: "accepted" | "rejected";
}

export interface FixtureRuntimeHarness {
  readonly runtime: PluginRuntimeAPI;
  readonly fixture: UIScenarioFixture;
  reset(): void;
  flush(): Promise<void>;
  getCurrentFrameId(): string;
  getEvents(): readonly FixtureRuntimeEvent[];
  assertConsumed(): void;
}

export interface CreateFixtureRuntimeOptions {
  readonly fixture: UIScenarioFixture;
  readonly strict?: boolean;
  readonly latencyMs?: number;
  readonly onEvent?: (event: FixtureRuntimeEvent) => void;
  readonly nowMs?: () => number;
}

export function createFixtureRuntime(
  options: CreateFixtureRuntimeOptions,
): FixtureRuntimeHarness {
  const fixture = options.fixture;
  const strict = options.strict ?? true;
  const latencyMs = options.latencyMs ?? 0;
  const stateListeners = new Set<(state: PluginStateSnapshot) => void>();
  const sessionListeners = new Set<(state: PluginSessionState) => void>();
  const events: FixtureRuntimeEvent[] = [];
  let sequence = 0;
  let stepCursor = 0;
  let disconnected = false;
  let diagnosticHandler:
    | ((event: PluginRuntimeDiagnosticEvent) => void)
    | undefined;
  const frameById = new Map(
    fixture.protocol.frames.map((frame) => [frame.id, frame]),
  );
  let currentFrame = fixture.protocol.frames[0];

  if (!currentFrame) {
    throw new Error(`UI fixture '${fixture.id}' does not contain frames.`);
  }

  const record = (event: Omit<FixtureRuntimeEvent, "sequence" | "atMs">) => {
    const entry = {
      sequence: ++sequence,
      atMs: options.nowMs?.() ?? sequence,
      ...event,
    };
    events.push(entry);
    options.onEvent?.(entry);
  };

  const emitDiagnostic = (event: PluginRuntimeDiagnosticEvent) => {
    record({ kind: "diagnostic" });
    diagnosticHandler?.(event);
  };

  const createFixtureError = (
    code: string,
    message: string,
  ): SubmissionError => {
    const error = new Error(message) as SubmissionError;
    error.name = "FixtureRuntimeError";
    error.errorCode = code;
    emitDiagnostic({
      type: "internalError",
      code,
      message,
    });
    return error;
  };

  const sessionFromFrame = (frame: UIFixtureFrame): PluginSessionState => ({
    status: "ready",
    sessionId: fixture.protocol.session.sessionId,
    controllablePlayerIds: fixture.protocol.session.players.map(
      (player) => player.playerId,
    ),
    controllingPlayerId: frame.frame.perspectivePlayerId,
    userId: null,
  });

  const snapshotFromFrame = (frame: UIFixtureFrame): PluginStateSnapshot =>
    ({
      view: frame.frame.view,
      gameplay: {
        currentPhase: frame.frame.flow.currentPhase,
        currentStage: frame.frame.flow.currentStage,
        activePlayers: [...frame.frame.flow.activePlayers],
        simultaneousPhase: frame.frame.flow.simultaneousPhase,
        availableInteractions: frame.frame.availableInteractions,
        zones: frame.frame.zones,
      },
      lobby: null,
      notifications: [],
      session: sessionFromFrame(frame),
      history: null,
      syncId: frame.frame.gameVersion,
    }) as unknown as PluginStateSnapshot;

  const publishFrame = (frameId: string) => {
    const nextFrame = frameById.get(frameId);
    if (!nextFrame) {
      throw createFixtureError(
        "fixture-missing-frame",
        `UI fixture '${fixture.id}' references missing frame '${frameId}'.`,
      );
    }
    currentFrame = nextFrame;
    record({
      kind: "frame",
      frameId: nextFrame.id,
      projectionDigest: nextFrame.projectionDigest,
    });
    const snapshot = snapshotFromFrame(nextFrame);
    for (const listener of stateListeners) {
      listener(snapshot);
    }
    const session = sessionFromFrame(nextFrame);
    for (const listener of sessionListeners) {
      listener(session);
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
  ): Extract<UIFixtureProtocolStep, { kind: Kind }> => {
    const step = fixture.protocol.steps[stepCursor];
    if (!step) {
      throw createFixtureError(
        "fixture-protocol-exhausted",
        `UI fixture '${fixture.id}' has no remaining protocol step for ${kind}.`,
      );
    }
    if (step.kind !== kind) {
      throw createFixtureError(
        "fixture-protocol-step-mismatch",
        `Expected protocol step '${step.kind}' but received '${kind}'.`,
      );
    }
    if (step.fromFrameId !== currentFrame.id) {
      throw createFixtureError(
        "fixture-protocol-frame-mismatch",
        `Expected protocol from frame '${step.fromFrameId}' but current frame is '${currentFrame.id}'.`,
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
    return step as Extract<UIFixtureProtocolStep, { kind: Kind }>;
  };

  const toValidationResult = (
    step: Extract<UIFixtureProtocolStep, { kind: "client.validate" }>,
  ): ValidationResult => {
    return step.response;
  };

  const rejectSubmission = (
    response: Extract<
      Extract<UIFixtureProtocolStep, { kind: "client.submit" }>["response"],
      { accepted: false }
    >,
  ): SubmissionError => {
    return createFixtureError(
      response.errorCode,
      response.message ?? "Fixture protocol rejected submission.",
    );
  };

  const commandBasis = () => ({
    gameVersion: currentFrame.frame.gameVersion,
    actionSetVersion: currentFrame.frame.actionSetVersion,
    perspectivePlayerId: currentFrame.frame.perspectivePlayerId,
  });

  const drainHostFrames = () => {
    while (fixture.protocol.steps[stepCursor]?.kind === "host.frame") {
      const step = fixture.protocol.steps[stepCursor] as Extract<
        UIFixtureProtocolStep,
        { kind: "host.frame" }
      >;
      stepCursor += 1;
      publishFrame(step.frameId);
    }
  };

  const runtime: PluginRuntimeAPI = {
    getSessionState: () => sessionFromFrame(currentFrame),
    _subscribeToSessionState: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getSnapshot: () => snapshotFromFrame(currentFrame),
    subscribeToState: (listener) => {
      stateListeners.add(listener);
      return () => {
        stateListeners.delete(listener);
      };
    },
    validateInteraction: async (playerId, interactionId, payload) => {
      if (disconnected) {
        return {
          valid: false,
          errorCode: "fixture-runtime-disconnected",
          message: "Fixture runtime is disconnected.",
        };
      }
      const requestDigest = digestUIFixtureTransportRequest({
        operation: "validate",
        basis: commandBasis(),
        interactionId,
        payload,
      });
      void playerId;
      const step = consumeExpectedStep("client.validate", requestDigest);
      const result = toValidationResult(step);
      record({
        kind: "validate",
        requestDigest,
        result: result.valid ? "accepted" : "rejected",
      });
      await waitForConfiguredLatency();
      return result;
    },
    submitInteraction: async (playerId, interactionId, payload) => {
      if (disconnected) {
        throw createFixtureError(
          "fixture-runtime-disconnected",
          "Fixture runtime is disconnected.",
        );
      }
      const requestDigest = digestUIFixtureTransportRequest({
        operation: "submit",
        basis: commandBasis(),
        interactionId,
        payload,
      });
      void playerId;
      const step = consumeExpectedStep("client.submit", requestDigest);
      record({
        kind: "submit",
        requestDigest,
        result: step.response.accepted ? "accepted" : "rejected",
      });
      if (!step.response.accepted) {
        throw rejectSubmission(step.response);
      }
      await waitForConfiguredLatency();
      drainHostFrames();
    },
    disconnect: () => {
      disconnected = true;
      stateListeners.clear();
      sessionListeners.clear();
    },
    switchPlayer: (playerId: PlayerId) => {
      if (
        !sessionFromFrame(currentFrame).controllablePlayerIds.includes(playerId)
      ) {
        throw createFixtureError(
          "fixture-unsupported-player-switch",
          `Fixture '${fixture.id}' cannot switch to uncontrolled player '${playerId}'.`,
        );
      }
      throw createFixtureError(
        "fixture-unsupported-player-switch",
        "Fixture runtime cannot mutate session identity without a recorded frame.",
      );
    },
    restoreHistory: () => {
      throw createFixtureError(
        "fixture-unsupported-operation",
        "Fixture runtime does not support history restoration.",
      );
    },
    markNotificationRead: () => {
      throw createFixtureError(
        "fixture-unsupported-operation",
        "Fixture runtime does not support notification mutation.",
      );
    },
    setDiagnosticHandler: (handler) => {
      diagnosticHandler = handler;
    },
    emitDiagnostic,
  };

  const harness: FixtureRuntimeHarness = {
    runtime,
    fixture,
    reset() {
      stepCursor = 0;
      disconnected = false;
      currentFrame = fixture.protocol.frames[0]!;
      events.length = 0;
      sequence = 0;
      drainHostFrames();
    },
    async flush() {
      await waitForConfiguredLatency();
    },
    getCurrentFrameId() {
      return currentFrame.id;
    },
    getEvents() {
      return events.map((event) => ({ ...event }));
    },
    assertConsumed() {
      if (stepCursor !== fixture.protocol.steps.length) {
        throw createFixtureError(
          "fixture-unconsumed-protocol-steps",
          `UI fixture '${fixture.id}' consumed ${stepCursor} of ${fixture.protocol.steps.length} protocol step(s).`,
        );
      }
    },
  };

  drainHostFrames();

  return harness;
}
