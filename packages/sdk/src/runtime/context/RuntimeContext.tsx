import React, { createContext, useContext, useState, useEffect } from "react";
import type { RuntimeAPI, PluginSessionState } from "../types/runtime-api.js";
import { PluginSessionContext } from "./PluginSessionContext.js";

/**
 * React Context for providing RuntimeAPI to plugin components.
 * This context must be provided by the plugin wrapper, not by the plugin code itself.
 */
export const RuntimeContext = createContext<RuntimeAPI | null>(null);

/**
 * Hook to access the RuntimeAPI from context.
 *
 * @throws Error if used outside of RuntimeContext.Provider
 * @returns RuntimeAPI instance
 *
 * @example
 * ```typescript
 * function MyPluginComponent() {
 *   const runtime = useRuntimeContext();
 *   return (
 *     <button onClick={() => runtime.submitInteraction("pass", {})}>
 *       Pass
 *     </button>
 *   );
 * }
 * ```
 */
export function useRuntimeContext(): RuntimeAPI {
  const context = useContext(RuntimeContext);

  if (!context) {
    throw new Error(
      "useRuntimeContext must be used within a RuntimeContext.Provider",
    );
  }

  return context;
}

/**
 * RuntimeProvider component that provides both RuntimeAPI and PluginSessionContext.
 * This component subscribes to session state changes from the RuntimeAPI and provides
 * them through PluginSessionContext.
 *
 * @example
 * ```tsx
 * function PluginRoot() {
 *   const runtime = createPluginRuntimeClient({ transport });
 *
 *   return (
 *     <RuntimeProvider runtime={runtime}>
 *       <App />
 *     </RuntimeProvider>
 *   );
 * }
 * ```
 */
export function RuntimeProvider({
  runtime,
  children,
}: {
  runtime: RuntimeAPI;
  children: React.ReactNode;
}) {
  // Subscribe to session state changes
  const [sessionState, setSessionState] = useState<PluginSessionState>(() =>
    runtime.getSessionState(),
  );

  useEffect(() => {
    // Subscribe to session state changes via internal API
    const runtimeWithInternal = runtime as RuntimeAPI & {
      _subscribeToSessionState?: (
        listener: (state: PluginSessionState) => void,
      ) => () => void;
    };

    if (runtimeWithInternal._subscribeToSessionState) {
      return runtimeWithInternal._subscribeToSessionState((state) => {
        setSessionState(state);
      });
    }

    // Fallback: no session state subscription available
    return () => {};
  }, [runtime]);

  return (
    <RuntimeContext.Provider value={runtime}>
      <PluginSessionContext.Provider value={sessionState}>
        {children}
      </PluginSessionContext.Provider>
    </RuntimeContext.Provider>
  );
}
