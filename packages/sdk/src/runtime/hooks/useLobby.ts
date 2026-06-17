import { useMemo } from "react";
import type { LobbyState } from "../types/plugin-state.js";
import { useOptionalPluginSessionDescriptor } from "../context/PluginSessionContext.js";
import type { HexColor } from "../../ui.js";

// Re-export LobbyState for convenience
export type { LobbyState };

/**
 * Subscribes to lobby updates from the plugin runtime snapshot when present.
 * Returns `null` until the host provides lobby state (SSR/tests/minimal runtimes).
 */
export function useLobbyState(): LobbyState | null {
  const sessionDescriptor = useOptionalPluginSessionDescriptor();
  return useMemo<LobbyState | null>(() => {
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
      hostUserId: "",
    };
  }, [sessionDescriptor]);
}

/**
 * Hook to read plugin-visible player roster metadata.
 * Returns the latest lobby information from gameplay-frame messages.
 *
 * State is provided by PluginStateProvider from host's gameplay-frame messages.
 * The host transforms raw SSE LOBBY_UPDATE messages into clean LobbyState objects.
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
export function useLobby(): LobbyState {
  const lobbyState = useLobbyState();
  if (lobbyState === null) {
    throw new Error(
      "useLobby: Lobby state not available. " +
        "The host should only render the plugin when lobby state is ready.",
    );
  }

  return lobbyState;
}
