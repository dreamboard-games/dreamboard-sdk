import React from "react";
import { InteractionUiProvider } from "../context/InteractionDraftContext.js";
import { RuntimeProvider } from "../context/RuntimeContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { RuntimeSemanticProjectionMarker } from "../context/PluginStateContext.js";
import { usePluginRuntime } from "../hooks/usePluginRuntime.js";
import { GameSkeleton } from "../../ui.js";
import type { PluginRuntimeDiagnosticHandler } from "../api/createPluginRuntimeAPI.js";

export interface PluginRuntimeProps {
  /** Child components to render after state sync has started */
  children: React.ReactNode;
  /**
   * Timeout in milliseconds to wait for the first state-sync snapshot.
   * @default 10000 (10 seconds)
   */
  timeout?: number;
  /** Custom loading component to show while waiting for state sync */
  loadingComponent?: React.ReactNode;
  /** Custom error component to show when initialization fails */
  errorComponent?: (error: string) => React.ReactNode;
  onDiagnostic?: PluginRuntimeDiagnosticHandler;
}

/**
 * PluginRuntime provides the RuntimeContext for plugin components.
 *
 * This component:
 * - Creates a RuntimeAPI instance using the SDK-provided implementation
 * - Waits for the first reducer-native state-sync snapshot before rendering children
 * - Provides RuntimeAPI and session state to all child components
 *
 * @example
 * ```tsx
 * // In your plugin's index.tsx
 * import { PluginRuntime } from "./components/dreamboard";
 * import App from './App';
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <PluginRuntime>
 *     <App />
 *   </PluginRuntime>
 * );
 * ```
 */
export function PluginRuntime({
  children,
  timeout = 10000,
  loadingComponent,
  errorComponent,
  onDiagnostic,
}: PluginRuntimeProps) {
  const { runtime, isReady, waiting, error } = usePluginRuntime({
    timeout,
    onDiagnostic,
  });

  if (error) {
    if (errorComponent) {
      return <>{errorComponent(error)}</>;
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <p className="text-red-600 font-medium mb-2">Failed to load game</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    // Once the game has rendered, a view-less snapshot is a mid-game wait (you
    // acted and are waiting on the table), not a cold load — say so rather than
    // reading as a stalled "Waiting for game state".
    return (
      <GameSkeleton
        message={
          waiting
            ? "Waiting for the other players…"
            : "Waiting for game state..."
        }
      />
    );
  }

  return (
    <RuntimeProvider runtime={runtime}>
      <SessionScopedInteractionUiProvider>
        {children}
      </SessionScopedInteractionUiProvider>
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
      <RuntimeSemanticProjectionMarker />
      {children}
    </InteractionUiProvider>
  );
}
