import { useCallback, useMemo, useSyncExternalStore } from "react";

export type EqualityFn<T> = (left: T, right: T) => boolean;

export function defaultRuntimeSnapshotEquality<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

interface SelectorCache<State, Selection> {
  snapshot: State;
  selection: Selection;
}

interface SelectorCacheCell<State, Selection> {
  current: SelectorCache<State, Selection> | null;
  selector: (state: State) => Selection;
  equalityFn: EqualityFn<Selection>;
}

export function useRuntimeSnapshotSelector<State, Selection>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => State,
  getServerSnapshot: () => State,
  selector: (state: State) => Selection,
  equalityFn: EqualityFn<Selection> = defaultRuntimeSnapshotEquality,
): Selection {
  const cache = useMemo<SelectorCacheCell<State, Selection>>(
    () => ({ current: null, selector, equalityFn }),
    [equalityFn, selector],
  );

  const getSelectedFromSnapshot = useCallback(
    (snapshot: State): Selection => {
      const cached = cache.current;
      if (cached && cached.snapshot === snapshot) {
        return cached.selection;
      }

      const nextSelection = selector(snapshot);
      if (cached && equalityFn(cached.selection, nextSelection)) {
        cache.current = {
          snapshot,
          selection: cached.selection,
        };
        return cached.selection;
      }

      cache.current = {
        snapshot,
        selection: nextSelection,
      };
      return nextSelection;
    },
    [cache, equalityFn, selector],
  );

  const getSelectedSnapshot = useCallback(
    () => getSelectedFromSnapshot(getSnapshot()),
    [getSelectedFromSnapshot, getSnapshot],
  );

  const getSelectedServerSnapshot = useCallback(
    () => selector(getServerSnapshot()),
    [getServerSnapshot, selector],
  );

  const subscribeSelected = useCallback(
    (onStoreChange: () => void) =>
      subscribe(() => {
        const previous = cache.current;
        const nextSelection = getSelectedSnapshot();
        if (!previous || !equalityFn(previous.selection, nextSelection)) {
          onStoreChange();
        }
      }),
    [cache, equalityFn, getSelectedSnapshot, subscribe],
  );

  return useSyncExternalStore(
    subscribeSelected,
    getSelectedSnapshot,
    getSelectedServerSnapshot,
  );
}
