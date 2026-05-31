import {
  default as React,
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import { useRuntimeContext } from "./RuntimeContext.js";
import type { PluginRuntimeAPI } from "../runtime/createPluginRuntimeAPI.js";

/**
 * React Context for providing plugin state from state-sync messages.
 * This is the new architecture where the host app maintains state and syncs to plugin.
 */
const PluginStateContext = createContext<PluginStateSnapshot | null>(null);

/**
 * Loading component shown while waiting for initial state
 */
function DefaultLoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        color: "#666",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e0e0e0",
            borderTopColor: "#666",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p>Loading game view...</p>
      </div>
    </div>
  );
}

export interface PluginStateProviderProps {
  children: React.ReactNode;
  /**
   * Custom loading component to show while waiting for state
   * @default DefaultLoadingScreen
   */
  loadingComponent?: React.ReactNode;
}

/**
 * PluginStateProvider subscribes to state-sync messages from the host
 * and provides the state to child components via context.
 *
 * In the new architecture:
 * - Host only renders authored game UI after state-sync begins
 * - Plugin receives complete state in first state-sync message
 * - No buffering or waiting needed - state is immediately available
 *
 * This replaces the complex usePluginRuntime hook which had:
 * - waitForGameStart() promise handling
 * - finishSetup() coordination with queueMicrotask
 * - Error timeout handling
 *
 * @example
 * ```tsx
 * function PluginRoot() {
 *   return (
 *     <RuntimeProvider runtime={runtime}>
 *       <PluginStateProvider>
 *         <App />
 *       </PluginStateProvider>
 *     </RuntimeProvider>
 *   );
 * }
 * ```
 */
export function PluginStateProvider({
  children,
  loadingComponent = <DefaultLoadingScreen />,
}: PluginStateProviderProps) {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;
  const [state, setState] = useState<PluginStateSnapshot | null>(
    () => runtime.getSnapshot?.() ?? null,
  );

  useEffect(() => {
    // Get initial state if available
    const initialState = runtime.getSnapshot?.();
    if (initialState) {
      setState(initialState);
    }

    // Subscribe to state changes
    if (runtime.subscribeToState) {
      return runtime.subscribeToState((newState) => {
        setState(newState);
      });
    }

    return () => {};
  }, [runtime]);

  // Don't render children until state is available
  // In the new architecture, host guarantees state exists before rendering plugin
  if (!state) {
    return <>{loadingComponent}</>;
  }

  return (
    <PluginStateContext.Provider value={state}>
      {children}
    </PluginStateContext.Provider>
  );
}

/**
 * Hook to access the full plugin state snapshot.
 *
 * @throws Error if used outside of PluginStateProvider
 * @returns Current plugin state snapshot
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const state = usePluginStateSnapshot();
 *   console.log('Current phase:', state.gameplay.currentPhase);
 * }
 * ```
 */
export function usePluginStateSnapshot(): PluginStateSnapshot {
  const state = useContext(PluginStateContext);

  if (!state) {
    throw new Error(
      "usePluginStateSnapshot must be used within PluginStateProvider. " +
        "Make sure you have wrapped your app with <PluginStateProvider>.",
    );
  }

  return state;
}

/**
 * Hook to select a specific part of the plugin state.
 * Uses useSyncExternalStore for optimal performance - only re-renders
 * when the selected value changes (using reference equality).
 *
 * @param selector - Function to select a part of the state
 * @returns Selected value from state
 *
 * @example
 * ```typescript
 * // Only re-renders when gameplay.currentPhase changes
 * function CurrentStateDisplay() {
 *   const currentState = usePluginState((s) => s.gameplay.currentPhase);
 *   return <div>State: {currentState}</div>;
 * }
 * ```
 */
export function usePluginState<T>(
  selector: (state: PluginStateSnapshot) => T,
): T {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;

  const subscribe = (onStoreChange: () => void) => {
    if (!runtime.subscribeToState) {
      return () => {};
    }
    return runtime.subscribeToState(() => {
      onStoreChange();
    });
  };

  const getSnapshot = () => {
    const state = runtime.getSnapshot?.();
    if (!state) {
      throw new Error(
        "usePluginState: No state available. " +
          "Make sure you have wrapped your app with <PluginStateProvider>.",
      );
    }
    return state;
  };

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => selector(state), [selector, state]);
}

/**
 * Hook to access plugin actions (like marking notifications read).
 *
 * @returns Object with action functions
 *
 * @example
 * ```typescript
 * function NotificationsList() {
 *   const notifications = usePluginState((s) => s.notifications);
 *   const { markNotificationRead, switchPlayer } = usePluginActions();
 *
 *   return (
 *     <ul>
 *       {notifications.map((n) => (
 *         <li key={n.id} onClick={() => markNotificationRead(n.id)}>
 *           {n.type}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function usePluginActions(): {
  markNotificationRead: (notificationId: string) => void;
  switchPlayer: (playerId: string) => void;
  submitInteraction: (
    playerId: string,
    interactionId: string,
    params: unknown,
  ) => Promise<void>;
} {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;

  return {
    /**
     * Mark a notification as read.
     * Sends message to host which updates the notification in GameSessionStore.
     */
    markNotificationRead: (notificationId: string) => {
      window.parent.postMessage(
        { type: "mark-notification-read", notificationId },
        "*",
      );
    },

    /**
     * Switch to a different player (for users controlling multiple seats).
     */
    switchPlayer: (playerId: string) => {
      runtime.switchPlayer?.(playerId);
    },

    /**
     * Submit a player interaction (action or prompt response).
     */
    submitInteraction: runtime.submitInteraction,
  };
}

export { PluginStateContext };
