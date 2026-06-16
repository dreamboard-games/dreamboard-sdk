import React from "react";
import { InteractionUiProvider } from "../context/InteractionDraftContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { PluginStateProvider } from "../context/PluginStateContext.js";
import { RuntimeProvider } from "../context/RuntimeContext.js";
import type { PluginRuntimeAPI } from "../api/createPluginRuntimeAPI.js";

export function PluginRuntimeBoundary({
  runtime,
  children,
}: {
  runtime: PluginRuntimeAPI;
  children: React.ReactNode;
}) {
  return (
    <RuntimeProvider runtime={runtime}>
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
