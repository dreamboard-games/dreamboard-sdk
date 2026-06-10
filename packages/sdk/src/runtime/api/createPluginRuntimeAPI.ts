import { z } from "zod";
import type { PlayerId } from "@dreamboard/manifest-contract";
import type {
  RuntimeAPI,
  PluginSessionState,
  ValidationResult,
} from "../types/runtime-api.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";

/**
 * Message schemas from main app to plugin
 * We define them here to avoid circular dependencies with apps/web
 */

// Main → Plugin: Initialize plugin with session info
const InitMessageSchema = z.object({
  type: z.literal("init"),
  sessionId: z.string(),
  controllablePlayerIds: z.array(z.string()),
  controllingPlayerId: z.string(),
  userId: z.string().nullable(),
});

// Main → Plugin: Health check ping
const PingMessageSchema = z.object({
  type: z.literal("ping"),
});

// Main → Plugin: State sync - sends complete state snapshot
const StateSyncMessageSchema = z.object({
  type: z.literal("state-sync"),
  syncId: z.number(),
  state: z.custom<PluginStateSnapshot>((data: unknown) => {
    return (
      typeof data === "object" &&
      data !== null &&
      "session" in data &&
      "notifications" in data
    );
  }),
});

// Main → Plugin: Validation result response
const ValidateInteractionResultMessageSchema = z.object({
  type: z.literal("validate-interaction-result"),
  messageId: z.string(),
  result: z.object({
    valid: z.boolean(),
    errorCode: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
  }),
});

const SubmitResultMessageSchema = z.object({
  type: z.literal("submit-result"),
  messageId: z.string(),
  accepted: z.boolean(),
  errorCode: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});

// Union of all messages from main → plugin
const MainToPluginMessageSchema = z.discriminatedUnion("type", [
  InitMessageSchema,
  PingMessageSchema,
  StateSyncMessageSchema,
  ValidateInteractionResultMessageSchema,
  SubmitResultMessageSchema,
]);

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
export function createPluginRuntimeAPI(): PluginRuntimeAPI {
  const existingRuntime = (globalThis as PluginRuntimeGlobal)[
    PLUGIN_RUNTIME_SINGLETON_KEY
  ];
  if (existingRuntime) {
    return existingRuntime;
  }

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

      window.parent.postMessage(
        { ...payload, messageId, clientSubmittedAtMs },
        "*",
      );

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

  // Message handler
  const handleMessage = (event: MessageEvent) => {
    const rawMessage = event.data;

    const parseResult = MainToPluginMessageSchema.safeParse(rawMessage);
    if (!parseResult.success) {
      // Only warn for messages that look like they're meant for us
      if (rawMessage?.type && typeof rawMessage.type === "string") {
        // eslint-disable-next-line no-console
        console.warn(
          "[Plugin RuntimeAPI] Invalid message received:",
          rawMessage.type,
        );
      }
      return;
    }

    const message = parseResult.data;

    switch (message.type) {
      case "init": {
        // eslint-disable-next-line no-console
        console.log("[Plugin RuntimeAPI] Received init message");

        sessionState.status = "ready";
        sessionState.sessionId = message.sessionId;
        sessionState.controllablePlayerIds =
          message.controllablePlayerIds as PlayerId[];
        sessionState.controllingPlayerId =
          message.controllingPlayerId as PlayerId;
        sessionState.userId = message.userId;

        notifySessionStateChange();
        window.parent.postMessage({ type: "ready" }, "*");
        break;
      }

      case "ping": {
        window.parent.postMessage({ type: "pong" }, "*");
        break;
      }

      case "state-sync": {
        // Handle state-sync from host
        // eslint-disable-next-line no-console
        console.log(
          "[Plugin RuntimeAPI] Received state-sync, syncId:",
          message.syncId,
        );

        // Tier-0 perf: capture `t7_state_sync_received` wall-clock
        // timestamp up-front so the host can stitch it onto the
        // perf HUD via the outgoing state-ack message.
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

        // Update session state from snapshot
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

        // Notify state listeners
        notifyStateListeners();

        // Send acknowledgment (carrying t7 timestamp for the host
        // perf HUD; host ignores it when perf is disabled).
        window.parent.postMessage(
          {
            type: "state-ack",
            syncId: message.syncId,
            clientReceivedAtMs,
          },
          "*",
        );

        // Tier-0 perf: after notifyStateListeners has kicked React's
        // render, schedule a post-commit microtask + rAF chain so the
        // paired `state-rendered` message lands close to when the
        // plugin's DOM would have been painted. `queueMicrotask` is
        // used first because most React listeners finish synchronously;
        // `requestAnimationFrame` then bounces to the next paint tick.
        const schedulePostRender = () => {
          const send = () => {
            const clientRenderedAtMs = Date.now();
            if (typeof performance !== "undefined") {
              try {
                performance.mark(
                  `dreamboard.t8_render_commit.sync-${message.syncId}`,
                  { detail: { syncId: message.syncId } },
                );
              } catch {
                // ignore
              }
            }
            window.parent.postMessage(
              {
                type: "state-rendered",
                syncId: message.syncId,
                clientReceivedAtMs,
                clientRenderedAtMs,
              },
              "*",
            );
          };
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(send);
          } else {
            queueMicrotask(send);
          }
        };
        queueMicrotask(schedulePostRender);

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
    // eslint-disable-next-line no-console
    console.error(`[Plugin RuntimeAPI] ${code}:`, message, stack || "");
    window.parent.postMessage(
      {
        type: "error",
        message: stack ? `${message}\n${stack}` : message,
        code,
      },
      "*",
    );
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

  // eslint-disable-next-line no-console
  console.log("[Plugin RuntimeAPI] ✅ Initialized (state-sync architecture)");

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
        const messageId = `validate-${++validationIdCounter}`;
        pendingValidations.set(messageId, resolve);

        window.parent.postMessage(
          {
            type: "validate-interaction",
            playerId,
            interactionId,
            params,
            messageId,
          },
          "*",
        );

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
      sessionStateListeners.clear();
      stateListeners.clear();
      pendingValidations.clear();
      pendingSubmissions.clear();
      currentStateSnapshot = null;
    },

    switchPlayer: (playerId: PlayerId) => {
      window.parent.postMessage({ type: "switch-player", playerId }, "*");
    },

    restoreHistory: (entryId: string) => {
      window.parent.postMessage({ type: "restore-history", entryId }, "*");
    },

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
