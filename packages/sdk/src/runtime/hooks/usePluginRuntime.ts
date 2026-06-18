import { useState, useEffect, useRef } from "react";
import packageJson from "../../../package.json";
import { createPostMessagePluginTransport } from "../browser/post-message-transport.js";
import { createPluginRuntimeClient } from "../core/create-plugin-runtime-client.js";
import type { PluginRuntimeClient } from "../core/types.js";
import type { RuntimeDiagnosticHandler } from "../types/runtime-api.js";

const BUNDLED_SDK_VERSION =
  typeof packageJson.version === "string" ? packageJson.version : "unknown";

export interface UsePluginRuntimeOptions {
  /**
   * Timeout in milliseconds to wait for the first gameplay frame.
   * @default 10000 (10 seconds)
   */
  timeout?: number;
  onDiagnostic?: RuntimeDiagnosticHandler;
}

export interface UsePluginRuntimeResult {
  /** The transport-agnostic plugin runtime client. */
  runtime: PluginRuntimeClient;
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

function hasProjectedView(runtime: PluginRuntimeClient): boolean {
  const frame = runtime.getFrame();
  return (
    frame !== null && frame.view !== null && typeof frame.view !== "undefined"
  );
}

/**
 * Hook that creates and manages a PluginRuntimeClient instance.
 *
 * This hook handles:
 * 1. Creating the runtime client
 * 2. Waiting for the first gameplay frame before setting isReady
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
  const { timeout = 10000, onDiagnostic } = options;
  const [error, setError] = useState<string | null>(null);

  // Create runtime once and keep stable reference
  const [runtime] = useState<PluginRuntimeClient>(() =>
    createPluginRuntimeClient({
      transport: createPostMessagePluginTransport({
        bundledSdkVersion: BUNDLED_SDK_VERSION,
        onInvalidMessage: (reason, value) => {
          const message =
            `Plugin runtime rejected a host message (${reason}). ` +
            `Bundled @dreamboard-games/sdk version: ${BUNDLED_SDK_VERSION}. ` +
            "The host and plugin bundle may have incompatible SDK/runtime contract versions.";
          setError(message);
          onDiagnostic?.({
            type: "runtimeLog",
            level: "warn",
            message,
            details: [value],
          });
        },
      }),
    }),
  );
  const [isReady, setIsReady] = useState(() => hasProjectedView(runtime));
  // Latches once we've shown a view, so a later view-less snapshot reads as a
  // mid-game wait rather than a fresh load. (A ref, so it never re-triggers a
  // render on its own.)
  const hasBeenReadyRef = useRef(false);
  if (isReady) hasBeenReadyRef.current = true;

  useEffect(() => {
    void onDiagnostic;
  }, [onDiagnostic]);

  // Subscribe to gameplay frames and set isReady when the first projected view arrives.
  useEffect(() => {
    const markReadyFromFrame = () => {
      if (!hasProjectedView(runtime)) {
        return false;
      }
      setError(null);
      setIsReady(true);
      return true;
    };

    if (markReadyFromFrame()) {
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!markReadyFromFrame()) {
        setError(
          `Timed out waiting for the initial projected view after ${timeout}ms. ` +
            "Ensure the host sends a gameplay frame with a seat view.",
        );
      }
    }, timeout);

    // Fallback poll for dev/HMR flows where the runtime frame may already
    // exist but the first subscribe callback is missed.
    const pollId = setInterval(() => {
      if (markReadyFromFrame()) {
        clearInterval(pollId);
        clearTimeout(timeoutId);
      }
    }, 100);

    const unsubscribe = runtime.subscribeFrame(() => {
      if (!hasProjectedView(runtime)) {
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
