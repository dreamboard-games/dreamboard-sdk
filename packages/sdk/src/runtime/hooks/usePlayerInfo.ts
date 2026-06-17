import { useMemo } from "react";
import type { PlayerId } from "@dreamboard/manifest-contract";
import { usePluginSessionDescriptor } from "../context/PluginSessionContext.js";
import type { Player } from "./useMe.js";
import type { HexColor } from "../../ui.js";

export function usePlayerInfo(): Map<PlayerId, Player> {
  const sessionDescriptor = usePluginSessionDescriptor();

  return useMemo(() => {
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
  }, [sessionDescriptor]);
}
