import { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import {
  usePluginSessionDescriptor,
  usePluginSession,
} from "../context/PluginSessionContext.js";
import type { Player } from "../../ui/types/player-state.js";
import type { HexColor } from "../../ui.js";

// Re-export for consumers
export type { Player } from "../../ui/types/player-state.js";

/**
 * Hook to get information about the player currently being controlled by this user.
 * Returns the currently selected player that the user is controlling.
 *
 * @returns Currently controlled player's info
 * @throws Error if called before session is ready or if player not found in lobby
 */
export function useMe(): Player {
  const { controllingPlayerId } = usePluginSession();
  const sessionDescriptor = usePluginSessionDescriptor();

  return useMemo(() => {
    if (!controllingPlayerId) {
      throw new Error(
        "useMe: No controlling player available. Ensure session is initialized and user is not a spectator.",
      );
    }

    const player = sessionDescriptor.players.find(
      (candidate) => candidate.playerId === controllingPlayerId,
    );
    if (player) {
      return {
        playerId: player.playerId as PlayerId,
        name: player.displayName,
        isHost: false,
        color: player.color as HexColor | undefined,
      };
    }

    throw new Error(
      `useMe: Player ${controllingPlayerId} not found in the plugin session descriptor.`,
    );
  }, [controllingPlayerId, sessionDescriptor]);
}
