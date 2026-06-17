import { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import {
  useOptionalPluginSessionDescriptor,
  usePluginSession,
} from "../context/PluginSessionContext.js";
import { useLobby } from "./useLobby.js";
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
  const sessionDescriptor = useOptionalPluginSessionDescriptor();
  const lobby = useLobby();

  return useMemo(() => {
    if (!controllingPlayerId) {
      throw new Error(
        "useMe: No controlling player available. Ensure session is initialized and user is not a spectator.",
      );
    }

    const player = sessionDescriptor?.players.find(
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

    const seat = lobby.seats.find((s) => s.playerId === controllingPlayerId);
    if (!seat) {
      throw new Error(
        `useMe: Player ${controllingPlayerId} not found in lobby seats. This should not happen.`,
      );
    }

    return {
      playerId: seat.playerId as PlayerId,
      name: seat.displayName,
      isHost: seat.isHost,
      color: seat.playerColor,
    };
  }, [controllingPlayerId, lobby, sessionDescriptor]);
}
