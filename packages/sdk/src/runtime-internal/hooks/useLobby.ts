import { useState, useEffect } from "react";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import type { LobbyState } from "../types/plugin-state.js";
import type { PluginRuntimeAPI } from "../runtime/createPluginRuntimeAPI.js";

// Re-export LobbyState for convenience
export type { LobbyState };

/**
 * Subscribes to lobby updates from the plugin runtime snapshot when present.
 * Returns `null` until the host provides lobby state (SSR/tests/minimal runtimes).
 */
export function useLobbyState(): LobbyState | null {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;

  const getStateFromSnapshot = (): LobbyState | null => {
    if (!runtime.getSnapshot) return null;
    const snapshot = runtime.getSnapshot();
    if (!snapshot?.lobby) return null;
    return snapshot.lobby;
  };

  const [lobbyState, setLobbyState] = useState<LobbyState | null>(
    getStateFromSnapshot,
  );

  useEffect(() => {
    if (!runtime.subscribeToState) {
      return;
    }

    const initialState = runtime.getSnapshot?.();
    if (initialState?.lobby) {
      setLobbyState(initialState.lobby);
    }

    return runtime.subscribeToState((snapshot) => {
      if (snapshot.lobby) {
        setLobbyState(snapshot.lobby);
      }
    });
  }, [runtime]);

  return lobbyState;
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
