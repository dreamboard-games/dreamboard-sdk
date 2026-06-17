import { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { useOptionalPluginSessionDescriptor } from "../context/PluginSessionContext.js";
import { useLobbyState } from "./useLobby.js";
import type { Player } from "./useMe.js";
import type { HexColor } from "../../ui.js";

export function usePlayerInfo(): Map<PlayerId, Player> {
  const sessionDescriptor = useOptionalPluginSessionDescriptor();
  const lobby = useLobbyState();

  return useMemo(() => {
    if (sessionDescriptor) {
      const playerMap = new Map<PlayerId, Player>();
      for (const player of sessionDescriptor.players) {
        const playerId = player.playerId as PlayerId;
        playerMap.set(playerId, {
          playerId,
          name: player.displayName,
          isHost: false,
          color: player.color as HexColor | undefined,
        });
      }
      return playerMap;
    }

    if (!lobby) {
      return new Map();
    }

    const playerMap = new Map<PlayerId, Player>();

    for (const seat of lobby.seats) {
      const playerId = seat.playerId as PlayerId;
      playerMap.set(playerId, {
        playerId,
        name: seat.displayName,
        isHost: seat.isHost,
        color: seat.playerColor,
      });
    }

    return playerMap;
  }, [lobby, sessionDescriptor]);
}
