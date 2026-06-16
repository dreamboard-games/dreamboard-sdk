import { useMemo } from "react";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import type { GameView } from "#dreamboard/ui-contract";
import type { PluginStateSnapshot } from "../types/reducer-state.js";
import type { PluginRuntimeAPI } from "../api/createPluginRuntimeAPI.js";
import {
  defaultRuntimeSnapshotEquality,
  type EqualityFn,
  useRuntimeSnapshotSelector,
} from "./useRuntimeSnapshotSelector.js";

function requireProjectedView(
  snapshot: PluginStateSnapshot | null | undefined,
  message: string,
): GameView {
  const view = snapshot?.view;
  if (view === null || typeof view === "undefined") {
    throw new Error(message);
  }
  return view;
}

/**
 * Hook to select a derived value from the projected reducer view.
 * Only re-renders when the selected slice changes according to the equalityFn.
 *
 * @param selector - Function to extract data from the projected view
 * @param equalityFn - Optional equality function for selected slice comparison
 * @returns Selected value from the current projected view
 */
export function useGameSelector<T>(
  selector: (state: GameView) => T,
  equalityFn: EqualityFn<T> = defaultRuntimeSnapshotEquality,
): T {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;
  const message =
    "useGameSelector: Projected view not available. Ensure the reducer-native host payload is initialized.";

  const storeApi = useMemo(() => {
    const subscribe = (onStoreChange: () => void) => {
      if (!runtime.subscribeToState) {
        return () => {};
      }

      return runtime.subscribeToState(() => {
        onStoreChange();
      });
    };

    const getSnapshot = () =>
      (runtime.getSnapshot?.() ?? null) as PluginStateSnapshot | null;

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
    };
  }, [runtime]);

  return useRuntimeSnapshotSelector(
    storeApi.subscribe,
    storeApi.getSnapshot,
    storeApi.getServerSnapshot,
    (snapshot) => selector(requireProjectedView(snapshot, message)),
    equalityFn,
  );
}
