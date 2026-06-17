import React from "react";
import { usePluginRuntime } from "../hooks/usePluginRuntime.js";
import { GameSkeleton } from "../../ui.js";
import type { RuntimeDiagnosticHandler } from "../types/runtime-api.js";
import { PluginRuntimeBoundary } from "./PluginRuntimeBoundary.js";

export interface PluginRuntimeProps {
  /** Child components to render after gameplay frame has started */
  children: React.ReactNode;
  /**
   * Timeout in milliseconds to wait for the first gameplay-frame snapshot.
   * @default 10000 (10 seconds)
   */
  timeout?: number;
  /** Custom loading component to show while waiting for gameplay frame */
  loadingComponent?: React.ReactNode;
  /** Custom error component to show when initialization fails */
  errorComponent?: (error: string) => React.ReactNode;
  onDiagnostic?: RuntimeDiagnosticHandler;
}

/**
 * PluginRuntime provides the RuntimeContext for plugin components.
 *
 * This component:
 * - Creates a transport-backed runtime client
 * - Waits for the first projected gameplay frame before rendering children
 * - Provides runtime commands plus session/frame state to all child components
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
    <PluginRuntimeBoundary runtime={runtime}>{children}</PluginRuntimeBoundary>
  );
}
