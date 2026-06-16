import type { PlayerId } from "@dreamboard/manifest-contract";
import type {
  RuntimeAPI,
  PluginSessionState,
  ValidationResult,
} from "../types/runtime-api.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import {
  HostToPluginEnvelopeSchema,
  PluginInitEnvelopeSchema,
  assertTransportEnvelopeWithinLimits,
  createPluginEnvelope,
  type HostToPluginPayload,
  type PluginChannel,
  type PluginToHostPayload,
} from "../plugin-protocol.js";

export type PluginRuntimeDiagnosticEvent =
  | {
      type: "runtimeLog";
      level: "log" | "warn" | "error";
      message: string;
      details?: readonly unknown[];
    }
  | {
      type: "internalError";
      code: string;
      message: string;
      stack?: string;
    };

export type PluginRuntimeDiagnosticHandler = (
  event: PluginRuntimeDiagnosticEvent,
) => void;

export type PluginRuntimeAPIOptions = {
  onDiagnostic?: PluginRuntimeDiagnosticHandler;
};

/**
 * Extended RuntimeAPI with plugin-specific methods for state-sync architecture.
 */
export interface PluginRuntimeAPI extends RuntimeAPI {
  /**
   * Get the current state snapshot.
   * Returns null if no state-sync has been received yet.
   *
   * @example
   * ```typescript
   * const snapshot = runtime.getSnapshot();
   * if (snapshot?.view) {
   *   console.log('Current view:', snapshot.view);
   * }
   * ```
   */
  getSnapshot: () => PluginStateSnapshot | null;

  /**
   * Subscribe to state changes from state-sync messages.
   * Called whenever the host sends a new state-sync.
   *
   * @param listener - Callback invoked with new state snapshot
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = runtime.subscribeToState((state) => {
   *   console.log('New phase:', state.gameplay.currentPhase);
   * });
   * ```
   */
  subscribeToState: (
    listener: (state: PluginStateSnapshot) => void,
  ) => () => void;

  /** Internal API for RuntimeContext to subscribe to session state changes */
  _subscribeToSessionState: (
    listener: (state: PluginSessionState) => void,
  ) => () => void;

  /**
   * Request to restore game state to a previous history entry.
   * Only works if the user is the host.
   *
   * @param entryId - ID of the history entry to restore to
   *
   * @example
   * ```typescript
   * // Restore to a previous state
   * runtime.restoreHistory?.('entry-abc-123');
   * ```
   */
  restoreHistory?: (entryId: string) => void;
  markNotificationRead?: (notificationId: string) => void;
  setDiagnosticHandler?: (
    handler: PluginRuntimeDiagnosticHandler | undefined,
  ) => void;
  emitDiagnostic?: (event: PluginRuntimeDiagnosticEvent) => void;
}

/**
 * Mint a client-side correlation id for a single submitted interaction.
 * This id flows plugin -> host gateway -> backend HTTP header
 * (`X-Dreamboard-Client-Action-Id`), and back to the host via the recorded
 * `version -> actionId` map so the full t0..t8 latency trace can be
 * assembled for Tier-0 input-latency observability. Falls back to a
 * timestamp-seeded pseudo-uuid on environments without `crypto.randomUUID`
 * (older sandboxed browsers in tests) so we never crash the plugin.
 */
const mintClientActionId = (): string => {
  const cryptoLike = (
    globalThis as typeof globalThis & {
      crypto?: { randomUUID?: () => string };
    }
  ).crypto;
  if (cryptoLike?.randomUUID) {
    try {
      return cryptoLike.randomUUID();
    } catch {
      // fall through to fallback
    }
  }
  const rand = Math.random().toString(16).slice(2);
  return `cid-${Date.now().toString(16)}-${rand}`;
};

const PLUGIN_RUNTIME_SINGLETON_KEY = "__dreamboardPluginRuntimeApi";

type PluginRuntimeGlobal = typeof globalThis & {
  [PLUGIN_RUNTIME_SINGLETON_KEY]?: PluginRuntimeAPI;
};

/**
 * Creates a RuntimeAPI implementation for plugin iframes.
 *
 * Architecture (state-sync):
 * - Host maintains all state in GameSessionStore
 * - Host sends complete state snapshots via state-sync messages
 * - Plugin stores received state and notifies subscribers
 * - No buffering needed - plugin only renders when state exists
 *
 * Security:
 * - Plugin runs in sandboxed iframe (no network access, no same-origin)
 * - All backend communication goes through main app
 *
 * @returns PluginRuntimeAPI instance
 */
export function createPluginRuntimeAPI(
  options: PluginRuntimeAPIOptions = {},
): PluginRuntimeAPI {
  const existingRuntime = (globalThis as PluginRuntimeGlobal)[
    PLUGIN_RUNTIME_SINGLETON_KEY
  ];
  if (existingRuntime) {
    existingRuntime.setDiagnosticHandler?.(options.onDiagnostic);
    return existingRuntime;
  }
  let onDiagnostic = options.onDiagnostic;
  let channel: PluginChannel | null = null;
  let disconnected = false;

  const emitDiagnostic = (event: PluginRuntimeDiagnosticEvent): void => {
    if (onDiagnostic) {
      try {
        onDiagnostic(event);
        return;
      } catch {
        // Fall through to console so callback failures stay visible.
      }
    }
    switch (event.type) {
      case "runtimeLog": {
        const args = [event.message, ...(event.details ?? [])];
        if (event.level === "warn") {
          console.warn(...args);
        } else if (event.level === "error") {
          console.error(...args);
        } else {
          console.log(...args);
        }
        break;
      }
      case "internalError":
        console.error(
          `[Plugin RuntimeAPI] ${event.code}:`,
          event.message,
          event.stack ?? "",
        );
        break;
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  };

  // State-sync state
  let currentStateSnapshot: PluginStateSnapshot | null = null;
  const stateListeners = new Set<(state: PluginStateSnapshot) => void>();

  // Session state
  const sessionState: PluginSessionState = {
    status: "loading",
    sessionId: null,
    controllablePlayerIds: [],
    controllingPlayerId: null,
    userId: null,
  };
  const sessionStateListeners = new Set<(state: PluginSessionState) => void>();

  // Pending validation requests
  const pendingValidations = new Map<
    string,
    (result: ValidationResult) => void
  >();
  let validationIdCounter = 0;
  const pendingSubmissions = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error & { errorCode?: string }) => void;
    }
  >();
  let submitIdCounter = 0;

  // Helper functions
  const postToHost = (payload: PluginToHostPayload): void => {
    if (channel === null || disconnected) {
      throw new Error("Plugin runtime is not initialized.");
    }
    channel.hostWindow.postMessage(
      createPluginEnvelope(payload, channel),
      channel.hostOrigin,
    );
  };

  const rejectPendingRequests = () => {
    pendingValidations.forEach((resolve) => {
      resolve({
        valid: false,
        errorCode: "runtime-disconnected",
        message: "Plugin runtime disconnected",
      });
    });
    pendingValidations.clear();
    pendingSubmissions.forEach((pending) => {
      pending.reject(
        createSubmissionError(
          "runtime-disconnected",
          "Plugin runtime disconnected",
        ),
      );
    });
    pendingSubmissions.clear();
  };

  const notifySessionStateChange = () => {
    sessionStateListeners.forEach((listener) => {
      try {
        listener({ ...sessionState });
      } catch {
        // Silently catch listener errors
      }
    });
  };

  const notifyStateListeners = () => {
    if (!currentStateSnapshot) return;
    const snapshot = currentStateSnapshot;
    stateListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // Silently catch listener errors
      }
    });
  };

  const createSubmissionError = (
    errorCode?: string,
    message?: string,
  ): Error & { errorCode?: string } => {
    const error = new Error(message ?? "Submission failed") as Error & {
      errorCode?: string;
      name: string;
    };
    error.name = "SubmissionError";
    error.errorCode = errorCode;
    return error;
  };

  const submitViaParent = (payload: {
    type: "interaction";
    playerId: PlayerId;
    interactionId: string;
    params: unknown;
    clientActionId?: string;
  }): Promise<void> =>
    new Promise((resolve, reject) => {
      if (channel === null || disconnected) {
        reject(
          createSubmissionError(
            "runtime-not-initialized",
            "Plugin runtime is not initialized.",
          ),
        );
        return;
      }
      const messageId = `submit-${++submitIdCounter}`;
      pendingSubmissions.set(messageId, { resolve, reject });

      // Plugin-iframe `Date.now()` ships alongside the postMessage
      // as the `t0_click` timestamp for Tier-0 input-latency
      // observability. Date.now() (not performance.now()) is
      // intentional: the iframe and the host share a wall-clock
      // base but not a `performance.now()` origin.
      const clientSubmittedAtMs = Date.now();

      if (payload.clientActionId && typeof performance !== "undefined") {
        try {
          performance.mark(`dreamboard.t0_click.${payload.clientActionId}`, {
            detail: { clientActionId: payload.clientActionId },
          });
        } catch {
          // performance.mark detail arg not supported in older browsers; ignore
        }
      }

      try {
        postToHost({ ...payload, messageId, clientSubmittedAtMs });
      } catch (error) {
        pendingSubmissions.delete(messageId);
        reject(
          createSubmissionError(
            "runtime-not-initialized",
            error instanceof Error
              ? error.message
              : "Plugin runtime is not initialized.",
          ),
        );
        return;
      }

      setTimeout(() => {
        const pending = pendingSubmissions.get(messageId);
        if (!pending) {
          return;
        }
        pendingSubmissions.delete(messageId);
        pending.reject(
          createSubmissionError(
            "submission-timeout",
            "Submission request timed out",
          ),
        );
      }, 10000);
    });

  const applyInitMessage = (
    message: Extract<HostToPluginPayload, { type: "init" }>,
  ) => {
    emitDiagnostic({
      type: "runtimeLog",
      level: "log",
      message: "[Plugin RuntimeAPI] Received init message",
    });

    sessionState.status = "ready";
    sessionState.sessionId = message.sessionId;
    sessionState.controllablePlayerIds =
      message.controllablePlayerIds as PlayerId[];
    sessionState.controllingPlayerId = message.controllingPlayerId as PlayerId;
    sessionState.userId = message.userId;
    notifySessionStateChange();

    if (message.state) {
      applyStateSyncMessage({
        type: "state-sync",
        syncId: message.state.syncId,
        state: message.state,
      });
    }
  };

  const applyStateSyncMessage = (
    message: Extract<HostToPluginPayload, { type: "state-sync" }>,
  ) => {
    emitDiagnostic({
      type: "runtimeLog",
      level: "log",
      message: "[Plugin RuntimeAPI] Received state-sync, syncId:",
      details: [message.syncId],
    });

    const clientReceivedAtMs = Date.now();
    if (typeof performance !== "undefined") {
      try {
        performance.mark(
          `dreamboard.t7_state_sync_received.sync-${message.syncId}`,
          { detail: { syncId: message.syncId } },
        );
      } catch {
        // performance.mark detail arg not supported; ignore
      }
    }

    currentStateSnapshot = message.state;

    if (message.state.session) {
      sessionState.sessionId = message.state.session.sessionId;
      sessionState.controllablePlayerIds =
        message.state.session.controllablePlayerIds;
      sessionState.controllingPlayerId =
        message.state.session.controllingPlayerId;
      sessionState.userId = message.state.session.userId;
      sessionState.status = "ready";
      notifySessionStateChange();
    }

    notifyStateListeners();

    postToHost({
      type: "state-ack",
      syncId: message.syncId,
      clientReceivedAtMs,
    });

    const schedulePostRender = () => {
      const send = () => {
        const clientRenderedAtMs = Date.now();
        if (typeof performance !== "undefined") {
          try {
            performance.mark(
              `dreamboard.t8_render_commit.sync-${message.syncId}`,
              {
                detail: { syncId: message.syncId },
              },
            );
          } catch {
            // ignore
          }
        }
        if (!disconnected && channel !== null) {
          postToHost({
            type: "state-rendered",
            syncId: message.syncId,
            clientReceivedAtMs,
            clientRenderedAtMs,
          });
        }
      };
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(send);
      } else {
        queueMicrotask(send);
      }
    };
    queueMicrotask(schedulePostRender);
  };

  // Message handler
  const handleMessage = (event: MessageEvent) => {
    if (disconnected || event.source !== window.parent) {
      return;
    }

    try {
      assertTransportEnvelopeWithinLimits(event.data);
    } catch (error) {
      emitDiagnostic({
        type: "runtimeLog",
        level: "warn",
        message: "[Plugin RuntimeAPI] Rejected oversized or non-JSON message:",
        details: [error instanceof Error ? error.name : "unknown"],
      });
      return;
    }

    if (channel === null) {
      const initResult = PluginInitEnvelopeSchema.safeParse(event.data);
      if (!initResult.success) {
        return;
      }
      channel = {
        channelId: initResult.data.channelId,
        hostOrigin: event.origin,
        hostWindow: window.parent,
      };
      applyInitMessage(initResult.data.payload);
      postToHost({ type: "ready" });
      return;
    }

    if (
      event.source !== channel.hostWindow ||
      event.origin !== channel.hostOrigin
    ) {
      return;
    }

    const parseResult = HostToPluginEnvelopeSchema.safeParse(event.data);
    if (
      !parseResult.success ||
      parseResult.data.channelId !== channel.channelId
    ) {
      const rawPayload = (event.data as { payload?: { type?: unknown } })
        ?.payload;
      if (typeof rawPayload?.type === "string") {
        emitDiagnostic({
          type: "runtimeLog",
          level: "warn",
          message: "[Plugin RuntimeAPI] Invalid message received:",
          details: [rawPayload.type],
        });
      }
      return;
    }

    const message = parseResult.data.payload;

    switch (message.type) {
      case "init": {
        // A bound channel cannot be rebound by a second init envelope.
        break;
      }

      case "ping": {
        postToHost({ type: "pong" });
        break;
      }

      case "state-sync": {
        applyStateSyncMessage(message);
        break;
      }

      case "validate-interaction-result": {
        const resolver = pendingValidations.get(message.messageId);
        if (resolver) {
          pendingValidations.delete(message.messageId);
          resolver({
            valid: message.result.valid,
            errorCode: message.result.errorCode ?? undefined,
            message: message.result.message ?? undefined,
          });
        }
        break;
      }

      case "submit-result": {
        const pending = pendingSubmissions.get(message.messageId);
        if (!pending) {
          break;
        }

        if (typeof performance !== "undefined") {
          try {
            performance.mark(`dreamboard.t3b_ack.${message.messageId}`, {
              detail: { messageId: message.messageId },
            });
          } catch {
            // ignore
          }
        }

        pendingSubmissions.delete(message.messageId);
        if (message.accepted) {
          pending.resolve();
        } else {
          pending.reject(
            createSubmissionError(
              message.errorCode ?? undefined,
              message.message ?? undefined,
            ),
          );
        }
        break;
      }
    }
  };

  window.addEventListener("message", handleMessage);

  // Error handlers
  const sendErrorToParent = (message: string, code: string, stack?: string) => {
    emitDiagnostic({
      type: "internalError",
      code,
      message,
      ...(stack ? { stack } : {}),
    });
    if (channel !== null && !disconnected) {
      postToHost({
        type: "error",
        message: stack ? `${message}\n${stack}` : message,
        code,
      });
    }
  };

  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage =
      typeof message === "string" ? message : error?.message || "Unknown error";
    const location = source ? ` at ${source}:${lineno}:${colno}` : "";
    sendErrorToParent(errorMessage + location, "UNCAUGHT_ERROR", error?.stack);
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : JSON.stringify(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    sendErrorToParent(message, "UNHANDLED_REJECTION", stack);
  };

  emitDiagnostic({
    type: "runtimeLog",
    level: "log",
    message: "[Plugin RuntimeAPI] Initialized (state-sync architecture)",
  });

  const runtime: PluginRuntimeAPI = {
    // State-sync methods
    getSnapshot: () => currentStateSnapshot,

    subscribeToState: (listener) => {
      stateListeners.add(listener);
      // Immediately notify with current state if available
      if (currentStateSnapshot) {
        try {
          listener(currentStateSnapshot);
        } catch {
          // Silently catch listener errors
        }
      }
      return () => {
        stateListeners.delete(listener);
      };
    },

    validateInteraction: async (playerId, interactionId, params) => {
      return new Promise((resolve) => {
        if (channel === null || disconnected) {
          resolve({
            valid: false,
            errorCode: "runtime-not-initialized",
            message: "Plugin runtime is not initialized.",
          });
          return;
        }
        const messageId = `validate-${++validationIdCounter}`;
        pendingValidations.set(messageId, resolve);

        try {
          postToHost({
            type: "validate-interaction",
            playerId,
            interactionId,
            params,
            messageId,
          });
        } catch {
          pendingValidations.delete(messageId);
          resolve({
            valid: false,
            errorCode: "runtime-not-initialized",
            message: "Plugin runtime is not initialized.",
          });
          return;
        }

        // Timeout after 10 seconds to avoid hanging forever
        setTimeout(() => {
          if (pendingValidations.has(messageId)) {
            pendingValidations.delete(messageId);
            resolve({
              valid: false,
              errorCode: "validation-timeout",
              message: "Validation request timed out",
            });
          }
        }, 10000);
      });
    },

    submitInteraction: async (playerId, interactionId, params) =>
      submitViaParent({
        type: "interaction",
        playerId,
        interactionId,
        params,
        clientActionId: mintClientActionId(),
      }),

    getSessionState: () => ({ ...sessionState }),

    disconnect: () => {
      window.removeEventListener("message", handleMessage);
      window.onerror = null;
      window.onunhandledrejection = null;
      disconnected = true;
      channel = null;
      sessionStateListeners.clear();
      stateListeners.clear();
      rejectPendingRequests();
      currentStateSnapshot = null;
    },

    switchPlayer: (playerId: PlayerId) => {
      postToHost({ type: "switch-player", playerId });
    },

    restoreHistory: (entryId: string) => {
      postToHost({ type: "restore-history", entryId });
    },

    markNotificationRead: (notificationId: string) => {
      postToHost({ type: "mark-notification-read", notificationId });
    },

    setDiagnosticHandler: (handler) => {
      onDiagnostic = handler;
    },
    emitDiagnostic,

    _subscribeToSessionState: (
      listener: (state: PluginSessionState) => void,
    ) => {
      sessionStateListeners.add(listener);
      listener({ ...sessionState });
      return () => {
        sessionStateListeners.delete(listener);
      };
    },
  };

  (globalThis as PluginRuntimeGlobal)[PLUGIN_RUNTIME_SINGLETON_KEY] = runtime;

  return runtime;
}
