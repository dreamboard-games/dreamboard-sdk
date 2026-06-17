import { useMemo } from "react";
import { useOptionalPluginSessionDescriptor } from "../context/PluginSessionContext.js";
import type { HexColor } from "../../ui.js";

export interface PluginLobbySeat {
  playerId: string;
  displayName: string;
  playerColor?: HexColor;
}

export interface PluginLobbyState {
  seats: PluginLobbySeat[];
  canStart: boolean;
}

/**
 * Reads plugin-visible player roster metadata from the runtime session
 * descriptor. Host-only lobby controls remain outside the plugin iframe.
 */
export function useLobbyState(): PluginLobbyState | null {
  const sessionDescriptor = useOptionalPluginSessionDescriptor();
  return useMemo<PluginLobbyState | null>(() => {
    if (!sessionDescriptor) {
      return null;
    }
    return {
      seats: sessionDescriptor.players.map((player) => ({
        playerId: player.playerId,
        displayName: player.displayName,
        playerColor: player.color as HexColor | undefined,
      })),
      canStart: sessionDescriptor.players.length > 0,
    };
  }, [sessionDescriptor]);
}

/**
 * Hook to read plugin-visible player roster metadata.
 * Returns the latest plugin-visible roster information.
 *
 * @returns Current lobby state (never null - throws if not available)
 * @throws Error if lobby state is not available
 *
 * @example
 * ```typescript
 * function LobbyScreen() {
 *   const lobby = useLobby();
 *   // lobby is guaranteed to be non-null
 *   return <div>{lobby.seats.length} seats</div>;
 * }
 * ```
 */
export function useLobby(): PluginLobbyState {
  const lobbyState = useLobbyState();
  if (lobbyState === null) {
    throw new Error(
      "useLobby: Lobby state not available. " +
        "The host should only render the plugin when lobby state is ready.",
    );
  }

  return lobbyState;
}
