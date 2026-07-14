import {
  HostToPluginEnvelopeSchema,
  RuntimeJsonSchema,
  type GameplayBasis,
  type HostToPluginEnvelope,
  type InteractionResult,
  type PluginGameplayFrame,
  type PluginSessionDescriptor,
} from "@dreamboard-games/plugin-runtime-contract";
import type {
  PluginRuntimeClient,
  PluginRuntimeClientOptions,
  RuntimeClock,
  RuntimeIdFactory,
} from "./types.js";

const defaultClock: RuntimeClock = {
  now: () => Date.now(),
};

const defaultIdFactory: RuntimeIdFactory = {
  nextId: (prefix) => {
    const cryptoLike = (
      globalThis as typeof globalThis & {
        crypto?: { randomUUID?: () => string };
      }
    ).crypto;
    if (cryptoLike?.randomUUID) {
      try {
        return `${prefix}-${cryptoLike.randomUUID()}`;
      } catch {
        // Fall through to deterministic-enough fallback for older test DOMs.
      }
    }
    return `${prefix}-${Date.now().toString(16)}-${Math.random()
      .toString(16)
      .slice(2)}`;
  },
};

function createSubmissionError(
  result: Extract<InteractionResult, { accepted: false }>,
): Error & { errorCode?: string } {
  const error = new Error(result.message ?? "Submission failed") as Error & {
    errorCode?: string;
  };
  error.name = "SubmissionError";
  error.errorCode = result.errorCode;
  return error;
}

export function createPluginRuntimeClient(
  options: PluginRuntimeClientOptions,
): PluginRuntimeClient {
  const clock = options.clock ?? defaultClock;
  const idFactory = options.idFactory ?? defaultIdFactory;
  const requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  let session: PluginSessionDescriptor | null = null;
  let frame: PluginGameplayFrame | null = null;
  let disconnected = false;
  let stopTransport: (() => void) | undefined;
  const sessionListeners = new Set<() => void>();
  const frameListeners = new Set<() => void>();
  const pendingSubmissions = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error & { errorCode?: string }) => void;
    }
  >();

  const notifySession = () => {
    for (const listener of sessionListeners) {
      listener();
    }
  };

  const notifyFrame = () => {
    for (const listener of frameListeners) {
      listener();
    }
  };

  const currentBasis = (): GameplayBasis => {
    if (!frame) {
      throw new Error("Plugin runtime has not received a gameplay frame.");
    }
    return frame.basis;
  };

  const sendRuntimeError = (message: string, code?: string) => {
    if (disconnected) {
      return;
    }
    options.transport.send({
      type: "runtime.error",
      message,
      ...(code ? { code } : {}),
    });
  };

  const handleHostMessage = (rawMessage: HostToPluginEnvelope) => {
    if (disconnected) {
      return;
    }
    const parseResult = HostToPluginEnvelopeSchema.safeParse(rawMessage);
    if (!parseResult.success) {
      sendRuntimeError(
        "Invalid host-to-plugin protocol envelope.",
        "invalid-envelope",
      );
      return;
    }
    const message = parseResult.data;
    const clientReceivedAtMs = clock.now();

    switch (message.payload.type) {
      case "runtime.init": {
        session = message.payload.session;
        notifySession();
        options.transport.send({ type: "runtime.ready" });
        options.transport.send({
          type: "runtime.ack",
          sequence: message.sequence,
          clientReceivedAtMs,
        });
        break;
      }
      case "gameplay.frame": {
        frame = message.payload.frame;
        notifyFrame();
        const sendRenderedAck = () => {
          if (disconnected) {
            return;
          }
          options.transport.send({
            type: "runtime.ack",
            sequence: message.sequence,
            clientReceivedAtMs,
            clientRenderedAtMs: clock.now(),
          });
        };
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(sendRenderedAck);
        } else {
          queueMicrotask(sendRenderedAck);
        }
        break;
      }
      case "interaction.result": {
        const pending = pendingSubmissions.get(message.payload.clientActionId);
        if (!pending) {
          break;
        }
        pendingSubmissions.delete(message.payload.clientActionId);
        if (message.payload.accepted) {
          pending.resolve();
        } else {
          pending.reject(createSubmissionError(message.payload));
        }
        break;
      }
      default: {
        const _exhaustive: never = message.payload;
        return _exhaustive;
      }
    }
  };

  stopTransport = options.transport.start(handleHostMessage);

  const rejectPending = () => {
    for (const pending of pendingSubmissions.values()) {
      const error = new Error("Plugin runtime disconnected") as Error & {
        errorCode?: string;
      };
      error.name = "SubmissionError";
      error.errorCode = "runtime-disconnected";
      pending.reject(error);
    }
    pendingSubmissions.clear();
  };

  return {
    getSession: () => session,
    subscribeSession: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getFrame: () => frame,
    subscribeFrame: (listener) => {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    submitInteraction: async (interactionId, params) =>
      new Promise((resolve, reject) => {
        if (disconnected) {
          const error = new Error("Plugin runtime disconnected") as Error & {
            errorCode?: string;
          };
          error.name = "SubmissionError";
          error.errorCode = "runtime-disconnected";
          reject(error);
          return;
        }
        const parsedParams = RuntimeJsonSchema.safeParse(params);
        if (!parsedParams.success) {
          const error = new Error(
            "Interaction params must be runtime JSON.",
          ) as Error & { errorCode?: string };
          error.name = "SubmissionError";
          error.errorCode = "invalid-runtime-json";
          reject(error);
          return;
        }
        let basis: GameplayBasis;
        try {
          basis = currentBasis();
        } catch (error) {
          const submissionError = new Error(
            error instanceof Error
              ? error.message
              : "Plugin runtime is not ready.",
          ) as Error & { errorCode?: string };
          submissionError.name = "SubmissionError";
          submissionError.errorCode = "runtime-not-ready";
          reject(submissionError);
          return;
        }
        const clientActionId = idFactory.nextId("action");
        pendingSubmissions.set(clientActionId, { resolve, reject });
        options.transport.send({
          type: "interaction.submit",
          clientActionId,
          basis,
          interactionId,
          params: parsedParams.data,
        });
        setTimeout(() => {
          const pending = pendingSubmissions.get(clientActionId);
          if (!pending) {
            return;
          }
          pendingSubmissions.delete(clientActionId);
          const error = new Error("Submission request timed out") as Error & {
            errorCode?: string;
          };
          error.name = "SubmissionError";
          error.errorCode = "submission-timeout";
          pending.reject(error);
        }, requestTimeoutMs);
      }),
    disconnect: () => {
      disconnected = true;
      stopTransport?.();
      stopTransport = undefined;
      sessionListeners.clear();
      frameListeners.clear();
      rejectPending();
      session = null;
      frame = null;
    },
  };
}
