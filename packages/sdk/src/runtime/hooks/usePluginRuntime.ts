import { useState, useEffect, useRef } from "react";
import {
  createPluginRuntimeAPI,
  type PluginRuntimeAPI,
} from "../api/createPluginRuntimeAPI.js";

export interface UsePluginRuntimeOptions {
  /**
   * Timeout in milliseconds to wait for state-sync.
   * @default 10000 (10 seconds)
   */
  timeout?: number;
}

export interface UsePluginRuntimeResult {
  /** The RuntimeAPI instance */
  runtime: PluginRuntimeAPI;
  /** Whether the initial reducer-native snapshot is available and ready */
  isReady: boolean;
  /**
   * True when the plugin was ready before but the current snapshot has no
   * projected view — e.g. you've acted and are waiting on the rest of the
   * table in a simultaneous phase. Lets the loading affordance read as a
   * mid-game wait rather than a cold "still loading" stall.
   */
  waiting: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

function hasProjectedView(
  snapshot: ReturnType<PluginRuntimeAPI["getSnapshot"]> | null | undefined,
): boolean {
  return (
    snapshot !== null &&
    snapshot !== undefined &&
    snapshot.view !== null &&
    snapshot.view !== undefined
  );
}

/**
 * Hook that creates and manages a PluginRuntimeAPI instance.
 *
 * This hook handles:
 * 1. Creating the RuntimeAPI
 * 2. Waiting for the first state-sync snapshot before setting isReady
 *
 * In the new architecture, the host only renders the plugin when a reducer-native
 * snapshot is available, so isReady should become true quickly after init.
 *
 * @example
 * ```tsx
 * function PluginRuntime({ children }: { children: React.ReactNode }) {
 *   const { runtime, isReady, error } = usePluginRuntime();
 *
 *   if (error) {
 *     return <div>Error: {error}</div>;
 *   }
 *
 *   if (!isReady) {
 *     return <GameSkeleton message="Waiting for game state..." />;
 *   }
 *
 *   return <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>;
 * }
 * ```
 */
export function usePluginRuntime(
  options: UsePluginRuntimeOptions = {},
): UsePluginRuntimeResult {
  const { timeout = 10000 } = options;

  // Create runtime once and keep stable reference
  const [runtime] = useState<PluginRuntimeAPI>(() => createPluginRuntimeAPI());
  const [isReady, setIsReady] = useState(() => {
    const snapshot = runtime.getSnapshot?.();
    return hasProjectedView(snapshot);
  });
  const [error, setError] = useState<string | null>(null);
  // Latches once we've shown a view, so a later view-less snapshot reads as a
  // mid-game wait rather than a fresh load. (A ref, so it never re-triggers a
  // render on its own.)
  const hasBeenReadyRef = useRef(false);
  if (isReady) hasBeenReadyRef.current = true;

  // Subscribe to state-sync and set isReady when the first snapshot arrives.
  useEffect(() => {
    const markReadyFromSnapshot = () => {
      const currentSnapshot = runtime.getSnapshot?.();
      if (!hasProjectedView(currentSnapshot)) {
        return false;
      }
      setError(null);
      setIsReady(true);
      return true;
    };

    if (markReadyFromSnapshot()) {
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!markReadyFromSnapshot()) {
        setError(
          `Timed out waiting for the initial projected view after ${timeout}ms. ` +
            "Ensure the host sends a reducer-native state-sync with a seat view.",
        );
      }
    }, timeout);

    // Fallback poll for dev/HMR flows where the runtime snapshot may already
    // exist but the first subscribe callback is missed.
    const pollId = setInterval(() => {
      if (markReadyFromSnapshot()) {
        clearInterval(pollId);
        clearTimeout(timeoutId);
      }
    }, 100);

    // Subscribe to state changes
    const unsubscribe = runtime.subscribeToState?.((state) => {
      if (!hasProjectedView(state)) {
        setIsReady(false);
        return;
      }
      clearInterval(pollId);
      clearTimeout(timeoutId);
      setError(null);
      setIsReady(true);
    });

    return () => {
      clearInterval(pollId);
      clearTimeout(timeoutId);
      unsubscribe?.();
    };
  }, [runtime, timeout]);

  return {
    runtime,
    isReady,
    waiting: hasBeenReadyRef.current && !isReady,
    error,
  };
}
