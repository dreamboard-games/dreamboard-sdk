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

/**
 * Plugin session state
 */
export interface PluginSessionState {
  /** Session initialization status */
  status: "loading" | "ready";
  /** Current session ID (null if not initialized) */
  sessionId: string | null;
  /** Player IDs that this user can control (immutable after game starts) */
  controllablePlayerIds: PlayerId[];
  /** The currently selected player ID that the user is controlling */
  controllingPlayerId: PlayerId | null;
  /** User ID of the controller (null if not initialized) */
  userId: string | null;
}

/**
 * RuntimeAPI provides the interface between plugin code and the game runtime.
 * This API is exposed to plugin iframes for subscribing to game events and submitting actions.
 */
export interface RuntimeAPI {
  /**
   * Validate a player interaction before submitting it. `params` is typed
   * as `unknown` because a `promptInput` collector can declare a scalar
   * response schema (`z.enum([...])`, `z.string()`, `z.number()`, ...)
   * while ordinary collectors pass an object.
   *
   * @param playerId - ID of the player performing the interaction
   * @param interactionId - Identifier of the interaction
   * @param params - Interaction-specific payload
   * @returns Promise that resolves with validation result
   */
  validateInteraction: (
    playerId: PlayerId,
    interactionId: string,
    params: unknown,
  ) => Promise<ValidationResult>;

  /**
   * Submit a player interaction to the game server. `submitInteraction`
   * is the single submission verb for every interaction kind — authors
   * do not split between "action" and "prompt response" calls.
   *
   * @param playerId - ID of the player performing the interaction
   * @param interactionId - Identifier of the interaction
   * @param params - Interaction-specific payload (see
   *   {@link validateInteraction} for the `unknown` typing rationale)
   * @throws SubmissionError if submission is rejected by the authority.
   */
  submitInteraction: (
    playerId: PlayerId,
    interactionId: string,
    params: unknown,
  ) => Promise<void>;

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

  /**
   * Request to switch to a different player.
   * Only works if the user controls multiple seats.
   * The parent window will handle the switch and update the session state.
   *
   * @param playerId - ID of the player to switch to
   *
   * @example
   * ```typescript
   * // Switch to player-2
   * runtime.switchPlayer?.('player-2');
   * ```
   */
  switchPlayer?: (playerId: PlayerId) => void;
}
