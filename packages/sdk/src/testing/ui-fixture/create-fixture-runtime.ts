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
  UIFixtureTransportExchange,
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
  const frameById = new Map(fixture.frames.map((frame) => [frame.id, frame]));
  const stateListeners = new Set<(state: PluginStateSnapshot) => void>();
  const sessionListeners = new Set<(state: PluginSessionState) => void>();
  const events: FixtureRuntimeEvent[] = [];
  let sequence = 0;
  let exchangeCursor = 0;
  let disconnected = false;
  let diagnosticHandler:
    | ((event: PluginRuntimeDiagnosticEvent) => void)
    | undefined;
  let currentFrame = fixture.frames[0];

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

  const sessionFromFrame = (
    frame: typeof currentFrame,
  ): PluginSessionState => ({
    status: "ready",
    sessionId: frame.snapshot.session.sessionId,
    controllablePlayerIds: [...frame.snapshot.session.controllablePlayerIds],
    controllingPlayerId: frame.snapshot.session.controllingPlayerId,
    userId: frame.snapshot.session.userId,
  });

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
    for (const listener of stateListeners) {
      listener(nextFrame.snapshot);
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

  const consumeExpectedExchange = (
    operation: UIFixtureTransportExchange["operation"],
    requestDigest: string,
  ): UIFixtureTransportExchange => {
    const exchange = fixture.transport[exchangeCursor];
    if (!exchange) {
      throw createFixtureError(
        "fixture-exchange-exhausted",
        `UI fixture '${fixture.id}' has no remaining transport exchange for ${operation}.`,
      );
    }
    if (exchange.operation !== operation) {
      throw createFixtureError(
        "fixture-exchange-operation-mismatch",
        `Expected transport operation '${exchange.operation}' but received '${operation}'.`,
      );
    }
    if (exchange.fromFrameId !== currentFrame.id) {
      throw createFixtureError(
        "fixture-exchange-frame-mismatch",
        `Expected transport from frame '${exchange.fromFrameId}' but current frame is '${currentFrame.id}'.`,
      );
    }
    if (exchange.requestDigest !== requestDigest) {
      const mode = strict ? "strict" : "compatible";
      throw createFixtureError(
        "fixture-exchange-digest-mismatch",
        `${mode} fixture transport digest mismatch for ${operation}: expected ${exchange.requestDigest}, received ${requestDigest}.`,
      );
    }
    exchangeCursor += 1;
    return exchange;
  };

  const toValidationResult = (
    exchange: UIFixtureTransportExchange,
  ): ValidationResult => {
    if (exchange.response.kind === "accepted") {
      return { valid: true };
    }
    const diagnostic = exchange.response.diagnostics[0];
    return {
      valid: false,
      errorCode: diagnostic?.code ?? "fixture-rejected",
      message: diagnostic?.message ?? "Fixture transport rejected validation.",
    };
  };

  const rejectSubmission = (
    response: Extract<
      UIFixtureTransportExchange["response"],
      { kind: "rejected" }
    >,
  ): SubmissionError => {
    const diagnostic = response.diagnostics[0];
    return createFixtureError(
      diagnostic?.code ?? "fixture-rejected",
      diagnostic?.message ?? "Fixture transport rejected submission.",
    );
  };

  const runtime: PluginRuntimeAPI = {
    getSessionState: () => sessionFromFrame(currentFrame),
    _subscribeToSessionState: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getSnapshot: () => currentFrame.snapshot,
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
        playerId,
        interactionId,
        payload,
      });
      const exchange = consumeExpectedExchange("validate", requestDigest);
      const result = toValidationResult(exchange);
      record({
        kind: "validate",
        requestDigest,
        result: result.valid ? "accepted" : "rejected",
      });
      await waitForConfiguredLatency();
      if (exchange.response.kind === "accepted") {
        publishFrame(exchange.response.nextFrameId);
      }
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
        playerId,
        interactionId,
        payload,
      });
      const exchange = consumeExpectedExchange("submit", requestDigest);
      record({
        kind: "submit",
        requestDigest,
        result: exchange.response.kind,
      });
      if (exchange.response.kind === "rejected") {
        throw rejectSubmission(exchange.response);
      }
      await waitForConfiguredLatency();
      publishFrame(exchange.response.nextFrameId);
    },
    disconnect: () => {
      disconnected = true;
      stateListeners.clear();
      sessionListeners.clear();
    },
    switchPlayer: (playerId: PlayerId) => {
      if (
        !currentFrame.snapshot.session.controllablePlayerIds.includes(playerId)
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
      exchangeCursor = 0;
      disconnected = false;
      currentFrame = fixture.frames[0]!;
      events.length = 0;
      sequence = 0;
      publishFrame(currentFrame.id);
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
      if (exchangeCursor !== fixture.transport.length) {
        throw createFixtureError(
          "fixture-unconsumed-exchanges",
          `UI fixture '${fixture.id}' consumed ${exchangeCursor} of ${fixture.transport.length} transport exchange(s).`,
        );
      }
    },
  };

  record({
    kind: "frame",
    frameId: currentFrame.id,
    projectionDigest: currentFrame.projectionDigest,
  });

  return harness;
}
