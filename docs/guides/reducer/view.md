# Selected-seat view

```ts
import { model } from "./model";
export const view = model.view(({ state }) => ({
  score: state.publicState.score,
}));
```

Author one record-valued view for the selected seat. Private fields belong here only when allowed for that seat. Spectator custom view is empty; never choose a player as a fallback. The own key boards is reserved for manifest static geometry and collisions are rejected. Transport permits object/null, not primitive or array views. Ordinary memoize(fn) caches by object identity; it is not resolver injection. tx.emit is public display data only: the latest accepted operation’s batch is persisted, rejection preserves it, and step/cancel operations can replace it with an empty batch.
