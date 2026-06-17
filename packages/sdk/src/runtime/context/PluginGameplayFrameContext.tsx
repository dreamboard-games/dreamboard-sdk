import {
  default as React,
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  digestPluginGameplayFrame,
  type PluginGameplayFrame,
} from "@dreamboard-games/plugin-runtime-contract";
import type { PluginRuntimeClient } from "../core/types.js";
import type {
  InteractionDescriptor,
  ZoneHandlesSnapshot,
} from "../types/plugin-state.js";
import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "../../browser-interaction/index.js";
import {
  defaultRuntimeSnapshotEquality,
  type EqualityFn,
  useRuntimeSnapshotSelector,
} from "../hooks/useRuntimeSnapshotSelector.js";

type PluginGameplayFrameStore = {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => PluginGameplayFrame | null;
  getServerSnapshot: () => PluginGameplayFrame | null;
};

const PluginGameplayFrameStoreContext =
  createContext<PluginGameplayFrameStore | null>(null);
const PluginGameplayFrameContext = createContext<PluginGameplayFrame | null>(
  null,
);

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

export interface PluginGameplayFrameProviderProps {
  runtime: PluginRuntimeClient;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function PluginGameplayFrameProvider({
  runtime,
  children,
  loadingComponent = <DefaultLoadingScreen />,
}: PluginGameplayFrameProviderProps) {
  const storeApi = useMemo<PluginGameplayFrameStore>(() => {
    let current = runtime.getFrame();
    return {
      subscribe: (onStoreChange) =>
        runtime.subscribeFrame(() => {
          current = runtime.getFrame();
          onStoreChange();
        }),
      getSnapshot: () => current,
      getServerSnapshot: () => current,
    };
  }, [runtime]);

  return (
    <PluginGameplayFrameStoreProvider
      store={storeApi}
      loadingComponent={loadingComponent}
    >
      {children}
    </PluginGameplayFrameStoreProvider>
  );
}

function PluginGameplayFrameStoreProvider({
  store,
  children,
  loadingComponent,
}: {
  store: PluginGameplayFrameStore;
  children: React.ReactNode;
  loadingComponent: React.ReactNode;
}) {
  const frame = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  if (!frame) {
    return <>{loadingComponent}</>;
  }

  return (
    <PluginGameplayFrameStoreContext.Provider value={store}>
      <PluginGameplayFrameContext.Provider value={frame}>
        <SemanticGameplayFrameMarker frame={frame} />
        {children}
      </PluginGameplayFrameContext.Provider>
    </PluginGameplayFrameStoreContext.Provider>
  );
}

export function usePluginGameplayFrame(): PluginGameplayFrame {
  const frame = useContext(PluginGameplayFrameContext);
  if (!frame) {
    throw new Error(
      "usePluginGameplayFrame must be used within PluginGameplayFrameProvider.",
    );
  }
  return frame;
}

export function usePluginGameplayFrameSelector<T>(
  selector: (frame: PluginGameplayFrame) => T,
  equalityFn: EqualityFn<T> = defaultRuntimeSnapshotEquality,
): T {
  const store = useContext(PluginGameplayFrameStoreContext);
  if (!store) {
    throw new Error(
      "usePluginGameplayFrameSelector must be used within PluginGameplayFrameProvider.",
    );
  }

  return useRuntimeSnapshotSelector(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
    (frame) => selector(requirePluginGameplayFrame(frame)),
    equalityFn,
  );
}

type AuthoredPluginGameplayFrame = Omit<
  PluginGameplayFrame,
  "availableInteractions" | "zones"
> & {
  readonly availableInteractions: readonly InteractionDescriptor[];
  readonly zones: Readonly<Record<string, ZoneHandlesSnapshot>>;
};

export function useAuthoredPluginGameplayFrameSelector<T>(
  selector: (frame: AuthoredPluginGameplayFrame) => T,
  equalityFn: EqualityFn<T> = defaultRuntimeSnapshotEquality,
): T {
  return usePluginGameplayFrameSelector(
    (frame) => selector(frame as unknown as AuthoredPluginGameplayFrame),
    equalityFn,
  );
}

function requirePluginGameplayFrame(
  frame: PluginGameplayFrame | null,
): PluginGameplayFrame {
  if (!frame) {
    throw new Error("Plugin gameplay frame is not available.");
  }
  return frame;
}

const GAMEPLAY_BROWSER_SCOPE_ID = "runtime";
const BROWSER_PROJECTION_DIGEST_ATTRIBUTE = "data-dreamboard-projection-digest";

export function RuntimeSemanticProjectionMarker() {
  const frame = usePluginGameplayFrame();
  return <SemanticGameplayFrameMarker frame={frame} />;
}

export function SemanticGameplayFrameMarker({
  frame,
}: {
  frame: PluginGameplayFrame;
}) {
  const digest = digestPluginGameplayFrame(frame);
  return (
    <span
      aria-hidden="true"
      style={{ display: "none" }}
      {...{
        [BROWSER_INTERACTION_ATTRIBUTES.protocol]:
          DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
        [BROWSER_INTERACTION_ATTRIBUTES.surface]:
          GAMEPLAY_BROWSER_INTERACTION_SURFACE,
        [BROWSER_INTERACTION_ATTRIBUTES.scope]: GAMEPLAY_BROWSER_SCOPE_ID,
        [BROWSER_INTERACTION_ATTRIBUTES.role]: "projection",
        [BROWSER_PROJECTION_DIGEST_ATTRIBUTE]: digest,
      }}
    />
  );
}
