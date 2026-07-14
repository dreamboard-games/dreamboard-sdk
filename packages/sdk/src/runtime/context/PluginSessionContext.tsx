import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  PluginPlayerSummary,
  PluginSessionDescriptor,
} from "@dreamboard-games/plugin-runtime-contract";
import type { PluginRuntimeClient } from "../core/types.js";
import type { PluginSessionState } from "../types/runtime-api";

/**
 * Context for plugin session metadata.
 * This context is provided by the RuntimeContext after receiving init message from parent.
 */
type PluginSessionContextRegistry = {
  session: React.Context<PluginSessionState | null>;
  descriptor: React.Context<PluginSessionDescriptor | null>;
};

const contextRegistryKey = "__dreamboardPluginSessionContext";
const contextRegistryGlobal = globalThis as typeof globalThis & {
  [contextRegistryKey]?: PluginSessionContextRegistry;
};
const contextRegistry =
  contextRegistryGlobal[contextRegistryKey] ??
  (contextRegistryGlobal[contextRegistryKey] = {
    session: createContext<PluginSessionState | null>(null),
    descriptor: createContext<PluginSessionDescriptor | null>(null),
  });

export const PluginSessionContext = contextRegistry.session;
const PluginSessionDescriptorContext = contextRegistry.descriptor;

function sessionStateFromClient(
  runtime: PluginRuntimeClient,
): PluginSessionState {
  const session = runtime.getSession();
  const frame = runtime.getFrame();
  return {
    status: session ? "ready" : "loading",
    sessionId: session?.sessionId ?? null,
    controllingPlayerId: frame?.basis.perspectivePlayerId ?? null,
  };
}

function pluginSessionStatesEqual(
  left: PluginSessionState,
  right: PluginSessionState,
): boolean {
  if (
    left.status !== right.status ||
    left.sessionId !== right.sessionId ||
    left.controllingPlayerId !== right.controllingPlayerId
  ) {
    return false;
  }
  return true;
}

function pluginSessionDescriptorsEqual(
  left: PluginSessionDescriptor | null,
  right: PluginSessionDescriptor | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  if (
    left.sessionId !== right.sessionId ||
    left.players.length !== right.players.length
  ) {
    return false;
  }

  return left.players.every((player, index) => {
    const next = right.players[index];
    return (
      player.playerId === next?.playerId &&
      player.displayName === next.displayName &&
      player.color === next.color
    );
  });
}

export function PluginSessionProvider({
  runtime,
  children,
}: {
  runtime: PluginRuntimeClient;
  children: ReactNode;
}) {
  const sessionStore = useMemo(() => {
    let current = sessionStateFromClient(runtime);
    return {
      subscribe: (onStoreChange: () => void) => {
        const refresh = () => {
          const next = sessionStateFromClient(runtime);
          if (pluginSessionStatesEqual(current, next)) {
            return;
          }
          current = next;
          onStoreChange();
        };
        const unsubscribeSession = runtime.subscribeSession(refresh);
        const unsubscribeFrame = runtime.subscribeFrame(refresh);
        return () => {
          unsubscribeFrame();
          unsubscribeSession();
        };
      },
      getSnapshot: () => current,
      getServerSnapshot: () => current,
    };
  }, [runtime]);
  const descriptorStore = useMemo(() => {
    let current = runtime.getSession();
    return {
      subscribe: (onStoreChange: () => void) => {
        const refresh = () => {
          const next = runtime.getSession();
          if (pluginSessionDescriptorsEqual(current, next)) {
            return;
          }
          current = next;
          onStoreChange();
        };
        const unsubscribeSession = runtime.subscribeSession(refresh);
        return () => {
          unsubscribeSession();
        };
      },
      getSnapshot: () => current,
      getServerSnapshot: () => current,
    };
  }, [runtime]);
  const sessionState = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  const sessionDescriptor = useSyncExternalStore(
    descriptorStore.subscribe,
    descriptorStore.getSnapshot,
    descriptorStore.getServerSnapshot,
  );

  return (
    <PluginSessionContext.Provider value={sessionState}>
      <PluginSessionDescriptorContext.Provider value={sessionDescriptor}>
        {children}
      </PluginSessionDescriptorContext.Provider>
    </PluginSessionContext.Provider>
  );
}

export function PluginSessionDescriptorProvider({
  descriptor,
  children,
}: {
  descriptor: PluginSessionDescriptor | null;
  children: ReactNode;
}) {
  return (
    <PluginSessionDescriptorContext.Provider value={descriptor}>
      {children}
    </PluginSessionDescriptorContext.Provider>
  );
}

/**
 * Hook to access plugin session metadata.
 * Returns session initialization status and IDs.
 *
 * @returns Plugin session state with status, sessionId, and controllingPlayerId
 *
 * @example
 * ```tsx
 * function MyPluginComponent() {
 *   const { status, sessionId, controllingPlayerId } = usePluginSession();
 *
 *   if (status === "loading") {
 *     return <div>Initializing...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Session: {sessionId}</p>
 *       <p>Current perspective: {controllingPlayerId}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePluginSession(): PluginSessionState {
  const context = useContext(PluginSessionContext);

  if (context === null) {
    throw new Error(
      "usePluginSession must be used within a PluginSessionContext.Provider (provided by RuntimeContext)",
    );
  }

  return context;
}

export function useOptionalPluginSessionDescriptor(): PluginSessionDescriptor | null {
  return useContext(PluginSessionDescriptorContext);
}

export function usePluginSessionDescriptor(): PluginSessionDescriptor {
  const descriptor = useOptionalPluginSessionDescriptor();
  if (!descriptor) {
    throw new Error(
      "usePluginSessionDescriptor must be used within PluginSessionProvider.",
    );
  }
  return descriptor;
}

export function usePluginPlayers(): readonly PluginPlayerSummary[] {
  return usePluginSessionDescriptor().players;
}
