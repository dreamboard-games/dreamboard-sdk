import React, { useMemo } from "react";
import type {
  PluginGameplayFrame,
  PluginPlayerSummary,
} from "@dreamboard-games/plugin-runtime-contract";
import {
  useOptionalPluginSessionDescriptor,
  usePluginSession,
} from "./PluginSessionContext.js";
import { usePluginGameplayFrameSelector } from "./PluginGameplayFrameContext.js";
import {
  defaultRuntimeSnapshotEquality,
  type EqualityFn,
} from "../hooks/useRuntimeSnapshotSelector.js";
import type {
  LobbyState,
  PluginRuntimeProjection,
} from "../types/plugin-state.js";

export interface PluginStateProviderProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function PluginStateProvider({ children }: PluginStateProviderProps) {
  return <>{children}</>;
}

function projectionFromFrame(
  frame: PluginGameplayFrame,
  session: ReturnType<typeof usePluginSession>,
  players: readonly PluginPlayerSummary[] | undefined,
): PluginRuntimeProjection {
  return {
    view: frame.view,
    gameplay: {
      currentPhase: frame.flow.currentPhase,
      currentStage: frame.flow.currentStage,
      activePlayers: [...frame.flow.activePlayers],
      simultaneousPhase:
        frame.flow.simultaneousPhase as PluginRuntimeProjection["gameplay"]["simultaneousPhase"],
      availableInteractions:
        frame.availableInteractions as PluginRuntimeProjection["gameplay"]["availableInteractions"],
      zones: frame.zones as PluginRuntimeProjection["gameplay"]["zones"],
    },
    lobby: (players
      ? {
          seats: players.map((player) => ({
            playerId: player.playerId,
            displayName: player.displayName,
            ...(player.color ? { playerColor: player.color } : {}),
          })),
          canStart: players.length > 0,
          hostUserId: "",
        }
      : null) as LobbyState | null,
    notifications: [],
    session: {
      sessionId: session.sessionId,
      controllablePlayerIds: frame.perspectivePlayerId
        ? [frame.perspectivePlayerId]
        : [],
      controllingPlayerId: session.controllingPlayerId,
      userId: null,
    },
    history: null,
    syncId: frame.gameVersion,
  };
}

export function usePluginState<T>(
  selector: (state: PluginRuntimeProjection) => T,
  equalityFn: EqualityFn<T> = defaultRuntimeSnapshotEquality,
): T {
  const session = usePluginSession();
  const descriptor = useOptionalPluginSessionDescriptor();
  const players = descriptor?.players;
  const projectionSelector = useMemo(
    () => (frame: PluginGameplayFrame) =>
      selector(projectionFromFrame(frame, session, players)),
    [players, selector, session],
  );

  return usePluginGameplayFrameSelector(projectionSelector, equalityFn);
}
