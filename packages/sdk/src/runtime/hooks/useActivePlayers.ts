import type { PlayerId } from "@dreamboard/manifest-contract";
import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";

/**
 * Returns the list of players the engine currently considers active, as
 * reported by the most recent gameplay snapshot.
 *
 * - For single-active-player phases, this has one entry.
 * - For multi-active-player phases (e.g. "all players discard at once"), it
 *   includes every seat that is expected to act.
 * - Returns an empty array before the first gameplay snapshot arrives.
 *
 * Prefer this hook over re-projecting `currentPlayerId` / `turnOrder` into
 * the view: flow state belongs to the engine, and `useActivePlayers()` is
 * always in lock-step with server-authoritative state.
 */
export function useActivePlayers(): readonly PlayerId[] {
  return usePluginGameplayFrameSelector((frame) => {
    // During a `simultaneousPlayer` phase the engine reports
    // `flow.activePlayers` as `[]` (there is no single turn) and tracks
    // per-seat progress in `simultaneousPhase` instead. Surface the seats that
    // still owe an action so this hook keeps its documented "every seat
    // expected to act" contract — otherwise `canAct`, `useIsMyTurn`, and roster
    // `isActive` would be false for everyone mid-simultaneous-phase. Both
    // branches return references owned by the snapshot, so the selector stays
    // referentially stable for `useSyncExternalStore`.
    const simultaneous = frame.flow.simultaneousPhase;
    if (simultaneous && simultaneous.pendingPlayerIds.length > 0) {
      return simultaneous.pendingPlayerIds;
    }
    return frame.flow.activePlayers;
  });
}
