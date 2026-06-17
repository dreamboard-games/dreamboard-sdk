import { useMemo, useSyncExternalStore } from "react";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import type { LobbyState } from "../types/plugin-state.js";
import type { PluginRuntimeAPI } from "../api/createPluginRuntimeAPI.js";
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
  const runtime = useRuntimeContext() as PluginRuntimeAPI;
  const legacyStore = useMemo(
    () => ({
      subscribe: (onStoreChange: () => void) =>
        runtime.subscribeToState?.(() => {
          onStoreChange();
        }) ?? (() => {}),
      getSnapshot: () => runtime.getSnapshot?.()?.lobby ?? null,
      getServerSnapshot: () => runtime.getSnapshot?.()?.lobby ?? null,
    }),
    [runtime],
  );
  const legacyLobbyState = useSyncExternalStore(
    legacyStore.subscribe,
    legacyStore.getSnapshot,
    legacyStore.getServerSnapshot,
  );

  const sessionLobbyState = useMemo<LobbyState | null>(() => {
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

  if (sessionLobbyState) {
    return sessionLobbyState;
  }
  return legacyLobbyState;
}

/**
 * Hook to subscribe to lobby state updates.
 * Returns the latest lobby information from state-sync messages.
 *
 * State is provided by PluginStateProvider from host's state-sync messages.
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
