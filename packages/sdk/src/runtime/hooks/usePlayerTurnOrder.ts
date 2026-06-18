import { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { usePluginSessionDescriptor } from "../context/PluginSessionContext.js";

/**
 * Returns the player ids in turn order, as provided by the lobby seat
 * assignments. Matches `q.player.order()` on the reducer side: the
 * engine's turn order is seeded from the same seat assignments.
 *
 * - Returns an empty array before the first lobby snapshot arrives.
 * - Stable reference across renders when the seats don't change.
 *
 * Prefer this hook (combined with `useActivePlayers()` for the current
 * seat) over re-projecting `turnOrder` into the view — flow state
 * belongs to the engine and the SDK, not to game-specific projections.
 */
export function usePlayerTurnOrder(): readonly PlayerId[] {
  const sessionDescriptor = usePluginSessionDescriptor();
  return useMemo(
    () =>
      sessionDescriptor.players.map((player) => player.playerId as PlayerId),
    [sessionDescriptor],
  );
}
