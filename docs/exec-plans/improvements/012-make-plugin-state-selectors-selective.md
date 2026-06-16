# 012 Make Plugin-State Selectors Selective

- Status: Implemented
- Priority: P2
- Risk: Medium
- Effort: Medium
- Primary owner: SDK runtime
- Depends on: 011
- Planned at: `d84c620`

## Summary

Make `usePluginState(selector)` subscribe to the selected value rather than
rerendering for every plugin snapshot. Reuse one selector-aware external-store
adapter for plugin state and game state, with explicit equality semantics.

## Current State

`PluginStateContext.tsx` subscribes through `useSyncExternalStore` to the full
snapshot and then selects with `useMemo`:

```ts
const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
return useMemo(() => selector(state), [selector, state]);
```

The selector result may be unchanged, but the component already rerendered
because the full snapshot identity changed. This contradicts the public
selective-subscription behavior.

`useGameSelector` already contains selector/equality caching logic, creating a
second implementation to maintain.

## Contract Decision

Use one internal selector adapter:

```ts
useRuntimeSnapshotSelector(
  subscribe,
  getSnapshot,
  getServerSnapshot,
  selector,
  equalityFn,
);
```

`Object.is` is the default equality. Callers returning newly allocated arrays
or objects must pass an appropriate shallow or domain-specific comparator.

## Scope

### In scope

- selector-aware `useSyncExternalStore` integration;
- shared implementation for plugin and game selectors;
- selector and equality function identity changes;
- server snapshot behavior;
- focused high-churn call-site review;
- render-count tests.

### Out of scope

- interaction lookup indexes;
- store normalization;
- automatic deep equality;
- broad component memoization.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-012-selective-plugin-state
```

Commit:

```text
Make plugin state selectors selective
```

## Implementation Steps

### 1. Extract a generic selector adapter

Create an internal hook based on the repository's existing
`useGameSelector` behavior:

```ts
function useRuntimeSnapshotSelector<State, Selection>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => State,
  getServerSnapshot: () => State,
  selector: (state: State) => Selection,
  equalityFn: (left: Selection, right: Selection) => boolean,
): Selection {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equalityFn);
  const cacheRef = useRef<
    { snapshot: State; selection: Selection } | undefined
  >();

  selectorRef.current = selector;
  equalityRef.current = equalityFn;

  const getSelection = useCallback(() => {
    const snapshot = getSnapshot();
    const next = selectorRef.current(snapshot);
    const cached = cacheRef.current;

    if (cached !== undefined && equalityRef.current(cached.selection, next)) {
      cacheRef.current = { snapshot, selection: cached.selection };
      return cached.selection;
    }

    cacheRef.current = { snapshot, selection: next };
    return next;
  }, [getSnapshot]);

  return useSyncExternalStore(subscribe, getSelection, () => {
    return selectorRef.current(getServerSnapshot());
  });
}
```

The final implementation must also handle selector/equality identity changes
without returning a stale selection. Reuse the proven cache invalidation logic
from `useGameSelector` rather than adopting this sketch verbatim.

### 2. Keep store callbacks stable

The provider should expose stable:

- `subscribe`;
- `getSnapshot`;
- `getServerSnapshot`.

Avoid creating wrapper functions on each render:

```ts
const storeApi = useMemo(
  () => ({
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
    getServerSnapshot: store.getInitialSnapshot,
  }),
  [store],
);
```

If the store methods rely on `this`, bind them once.

### 3. Update `usePluginState`

Expose an optional equality function:

```ts
export function usePluginState<Selection>(
  selector: (state: PluginStateSnapshot) => Selection,
  equalityFn: (left: Selection, right: Selection) => boolean = Object.is,
): Selection {
  const store = usePluginStateStore();
  return useRuntimeSnapshotSelector(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
    selector,
    equalityFn,
  );
}
```

This is backward compatible for primitive, stable-object, and identity-based
selectors.

### 4. Make `useGameSelector` delegate

Replace its local cache implementation with the generic adapter. Preserve its
public signature and default equality behavior.

Add shared tests at the generic hook level and smaller integration tests for
both public hooks.

### 5. Review high-churn selectors

Search for selectors that allocate on every call:

```ts
usePluginState((state) => state.notifications.filter(isUnread));
usePluginState((state) => ({ phase: state.gameplay.phase }));
```

For proven high-frequency call sites, either:

- select a stable source and derive with `useMemo`; or
- pass an existing shallow/domain equality function.

Example:

```ts
const unread = usePluginState(selectUnreadNotificationIds, shallowEqualArray);
```

Do not add deep equality as a default. Do not mechanically rewrite every
selector without render evidence.

### 6. Preserve error semantics

Selectors should continue to throw through React when they fail. Equality
functions must not swallow errors. A failed selector evaluation must not
overwrite the last valid cache entry.

## Test Plan

Build render-count tests:

```tsx
let renders = 0;

function SelectedPlayer() {
  const playerId = usePluginState((state) => state.session.playerId);
  renders += 1;
  return <span>{playerId}</span>;
}
```

Assert:

- initial render occurs once;
- 100 unrelated snapshot updates with the same selected value cause no
  additional render;
- one selected value change causes exactly one additional render;
- an object selector rerenders under `Object.is`;
- the same object selector does not rerender with a shallow equality function;
- changing the selector function applies the new selection immediately;
- changing the equality function does not retain an invalid cache;
- server render uses `getServerSnapshot`;
- plugin and game selector hooks share the same behavior;
- selector errors surface without corrupting the next valid render.

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- plugin-state
pnpm --filter @dreamboard-games/sdk test -- game-selector
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk lint
pnpm check
```

## Done Criteria

- Unrelated plugin snapshots do not rerender primitive selections.
- `usePluginState` accepts an equality function with `Object.is` default.
- `usePluginState` and `useGameSelector` use one internal adapter.
- Selector/equality identity changes and server snapshots are tested.
- Only measured high-churn allocation selectors receive custom equality.

## STOP Conditions

- Stop if the existing `useGameSelector` cache has known correctness defects.
  Fix and test those before generalizing it.
- Stop if store callbacks are not stable or return mutable snapshots. Correct
  the external-store contract before relying on selector caching.
- Stop if a selector requires deep equality for correctness. Return a stable
  canonical value or define a domain-specific comparator instead.

## Maintenance

All external runtime stores use the shared selector adapter. New selector APIs
state their default equality behavior in documentation.
