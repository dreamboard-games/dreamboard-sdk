import React, { useMemo } from "react";
import { InteractionUiProvider } from "../context/InteractionDraftContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { PluginStateProvider } from "../context/PluginStateContext.js";
import { RuntimeProvider } from "../context/RuntimeContext.js";
import type { PluginRuntimeAPI } from "../api/createPluginRuntimeAPI.js";
import type { PluginRuntimeClient } from "../core/types.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import type { PluginSessionState } from "../types/runtime-api.js";

type BoundaryRuntime = PluginRuntimeAPI | PluginRuntimeClient;

function isPluginRuntimeClient(
  runtime: BoundaryRuntime,
): runtime is PluginRuntimeClient {
  return "getFrame" in runtime && "subscribeFrame" in runtime;
}

function snapshotFromClient(runtime: PluginRuntimeClient): PluginStateSnapshot | null {
  const frame = runtime.getFrame();
  if (!frame) {
    return null;
  }
  return {
    view: frame.view,
    gameplay: {
      currentPhase: frame.flow.currentPhase,
      currentStage: frame.flow.currentStage,
      activePlayers: [...frame.flow.activePlayers],
      simultaneousPhase: frame.flow.simultaneousPhase,
      availableInteractions: frame.availableInteractions,
      zones: frame.zones,
    },
    lobby: null,
    notifications: [],
    session: sessionStateFromClient(runtime),
    history: null,
    syncId: frame.gameVersion,
  } as unknown as PluginStateSnapshot;
}

function sessionStateFromClient(runtime: PluginRuntimeClient): PluginSessionState {
  const session = runtime.getSession();
  const frame = runtime.getFrame();
  return {
    status: session ? "ready" : "loading",
    sessionId: session?.sessionId ?? null,
    controllablePlayerIds: session?.players.map((player) => player.playerId) ?? [],
    controllingPlayerId: frame?.perspectivePlayerId ?? null,
    userId: null,
  };
}

function createCompatRuntimeAPI(runtime: PluginRuntimeClient): PluginRuntimeAPI {
  const stateListeners = new Set<(state: PluginStateSnapshot) => void>();
  const sessionListeners = new Set<(state: PluginSessionState) => void>();
  const notifyState = () => {
    const snapshot = snapshotFromClient(runtime);
    if (!snapshot) {
      return;
    }
    for (const listener of stateListeners) {
      listener(snapshot);
    }
  };
  const notifySession = () => {
    const session = sessionStateFromClient(runtime);
    for (const listener of sessionListeners) {
      listener(session);
    }
  };
  const unsubscribeFrame = runtime.subscribeFrame(() => {
    notifySession();
    notifyState();
  });
  const unsubscribeSession = runtime.subscribeSession(() => {
    notifySession();
  });

  return {
    getSnapshot: () => snapshotFromClient(runtime),
    subscribeToState: (listener) => {
      stateListeners.add(listener);
      const snapshot = snapshotFromClient(runtime);
      if (snapshot) {
        listener(snapshot);
      }
      return () => {
        stateListeners.delete(listener);
      };
    },
    _subscribeToSessionState: (listener) => {
      sessionListeners.add(listener);
      listener(sessionStateFromClient(runtime));
      return () => {
        sessionListeners.delete(listener);
      };
    },
    validateInteraction: (_playerId, interactionId, params) =>
      runtime.validateInteraction(interactionId, params),
    submitInteraction: (_playerId, interactionId, params) =>
      runtime.submitInteraction(interactionId, params),
    getSessionState: () => sessionStateFromClient(runtime),
    disconnect: () => {
      unsubscribeFrame();
      unsubscribeSession();
      runtime.disconnect();
      stateListeners.clear();
      sessionListeners.clear();
    },
    setDiagnosticHandler: () => undefined,
    emitDiagnostic: () => undefined,
  };
}

export function PluginRuntimeBoundary({
  runtime,
  children,
}: {
  runtime: BoundaryRuntime;
  children: React.ReactNode;
}) {
  const runtimeApi = useMemo(
    () => (isPluginRuntimeClient(runtime) ? createCompatRuntimeAPI(runtime) : runtime),
    [runtime],
  );
  return (
    <RuntimeProvider runtime={runtimeApi}>
      <PluginStateProvider>
        <SessionScopedInteractionUiProvider>
          {children}
        </SessionScopedInteractionUiProvider>
      </PluginStateProvider>
    </RuntimeProvider>
  );
}

function SessionScopedInteractionUiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { controllingPlayerId } = usePluginSession();
  return (
    <InteractionUiProvider key={controllingPlayerId ?? "__no_player__"}>
      {children}
    </InteractionUiProvider>
  );
}
