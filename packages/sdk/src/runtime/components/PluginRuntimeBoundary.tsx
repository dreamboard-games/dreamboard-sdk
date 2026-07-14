import React, { useMemo } from "react";
import { InteractionUiProvider } from "../context/InteractionDraftContext.js";
import {
  PluginSessionProvider,
  usePluginSession,
} from "../context/PluginSessionContext.js";
import { PluginGameplayFrameProvider } from "../context/PluginGameplayFrameContext.js";
import { RuntimeContext } from "../context/RuntimeContext.js";
import type { PluginRuntimeClient } from "../core/types.js";
import type { RuntimeAPI } from "../types/runtime-api.js";

function runtimeApiFromClient(runtime: PluginRuntimeClient): RuntimeAPI {
  return {
    validateInteraction: (interactionId, params) =>
      runtime.validateInteraction(interactionId, params),
    submitInteraction: (interactionId, params) =>
      runtime.submitInteraction(interactionId, params),
    getSessionState: () => {
      const session = runtime.getSession();
      const frame = runtime.getFrame();
      return {
        status: session ? "ready" : "loading",
        sessionId: session?.sessionId ?? null,
        controllingPlayerId: frame?.perspectivePlayerId ?? null,
      };
    },
    disconnect: () => runtime.disconnect(),
  };
}

export function PluginRuntimeBoundary({
  runtime,
  children,
}: {
  runtime: PluginRuntimeClient;
  children: React.ReactNode;
}) {
  const runtimeApi = useMemo(() => runtimeApiFromClient(runtime), [runtime]);

  return (
    <RuntimeContext.Provider value={runtimeApi}>
      <PluginSessionProvider runtime={runtime}>
        <PluginGameplayFrameProvider runtime={runtime}>
          <SessionScopedInteractionUiProvider>
            {children}
          </SessionScopedInteractionUiProvider>
        </PluginGameplayFrameProvider>
      </PluginSessionProvider>
    </RuntimeContext.Provider>
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
