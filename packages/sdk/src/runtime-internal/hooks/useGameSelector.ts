import { useRef, useSyncExternalStore } from "react";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import type { GameView } from "#dreamboard/ui-contract";
import type { PluginStateSnapshot } from "../types/reducer-state.js";
import type { PluginRuntimeAPI } from "../runtime/createPluginRuntimeAPI.js";

type EqualityFn<T> = (left: T, right: T) => boolean;

interface SelectorCache<T> {
  rawView: GameView;
  selected: T;
}

function defaultEquality<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

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
  equalityFn: EqualityFn<T> = defaultEquality,
): T {
  const runtime = useRuntimeContext() as PluginRuntimeAPI;
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  const cacheRef = useRef<SelectorCache<T> | null>(null);

  if (selectorRef.current !== selector || equalityRef.current !== equalityFn) {
    selectorRef.current = selector;
    equalityRef.current = equalityFn;
    cacheRef.current = null;
  }

  const message =
    "useGameSelector: Projected view not available. Ensure the reducer-native host payload is initialized.";

  const getSelectedFromSnapshot = (
    snapshot: PluginStateSnapshot | null | undefined,
  ): T => {
    const view = requireProjectedView(snapshot, message);
    const cached = cacheRef.current;
    if (cached && cached.rawView === view) {
      return cached.selected;
    }

    const nextSelected = selectorRef.current(view);
    if (cached && equalityRef.current(cached.selected, nextSelected)) {
      cacheRef.current = {
        rawView: view,
        selected: cached.selected,
      };
      return cached.selected;
    }

    cacheRef.current = {
      rawView: view,
      selected: nextSelected,
    };
    return nextSelected;
  };

  const subscribe = (onStoreChange: () => void) => {
    if (!runtime.subscribeToState) {
      return () => {};
    }

    return runtime.subscribeToState((snapshot) => {
      const previousCache = cacheRef.current;
      const nextSelected = getSelectedFromSnapshot(
        snapshot as PluginStateSnapshot,
      );
      if (
        !previousCache ||
        !equalityRef.current(previousCache.selected, nextSelected)
      ) {
        onStoreChange();
      }
    });
  };

  const getSnapshot = () =>
    getSelectedFromSnapshot(
      (runtime.getSnapshot?.() ?? null) as PluginStateSnapshot | null,
    );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
