import type { PlayerId } from "@dreamboard/manifest-contract";

/**
 * Result of validating a player action
 */
export interface ValidationResult {
  /** Whether the action is valid */
  valid: boolean;
  /** Machine-readable error code if validation failed */
  errorCode?: string;
  /** Human-readable error message if validation failed */
  message?: string;
}

/**
 * Structured authoritative submission failure returned by runtime submit APIs.
 */
export interface SubmissionError extends Error {
  /** Machine-readable error code when available */
  errorCode?: string;
}

export type RuntimeDiagnosticEvent =
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

export type RuntimeDiagnosticHandler = (event: RuntimeDiagnosticEvent) => void;

/**
 * Plugin session state
 */
export interface PluginSessionState {
  /** Session initialization status */
  status: "loading" | "ready";
  /** Current session ID (null if not initialized) */
  sessionId: string | null;
  /** The player perspective represented by the current gameplay frame */
  controllingPlayerId: PlayerId | null;
}

/**
 * RuntimeAPI provides the interface between plugin code and the game runtime.
 * This API is exposed to plugin iframes for subscribing to game events and submitting actions.
 */
export interface RuntimeAPI {
  /**
   * Submit a player interaction to the game server. `submitInteraction`
   * is the single submission verb for every interaction kind — authors
   * do not split between "action" and "prompt response" calls.
   *
   * @param interactionId - Identifier of the interaction
   * @param params - Interaction-specific runtime JSON payload; prompt
   *   collectors may submit scalars while ordinary collectors submit objects.
   * @throws SubmissionError if submission is rejected by the authority.
   */
  submitInteraction: (interactionId: string, params: unknown) => Promise<void>;

  emitDiagnostic?: (event: RuntimeDiagnosticEvent) => void;
  setDiagnosticHandler?: (
    handler: RuntimeDiagnosticHandler | undefined,
  ) => void;

  /**
   * Get the current plugin session state.
   * Returns initialization status and session/player IDs.
   *
   * @returns Current plugin session state
   *
   * @example
   * ```typescript
   * const { status, sessionId, playerId } = runtime.getSessionState();
   * if (status === "ready") {
   *   console.log('Connected to session:', sessionId);
   * }
   * ```
   */
  getSessionState: () => PluginSessionState;

  /**
   * Disconnect from the runtime and clean up all listeners.
   * Should be called when the plugin is unmounting.
   */
  disconnect: () => void;
}
