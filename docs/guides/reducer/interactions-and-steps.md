# Interactions and steps

```ts
import { model } from "./model";
const play = model.phase("play");
export const choose = play.interaction({
  inputs: {},
  reduce({ tx, state }) {
    tx.patchPublicState({ score: state.publicState.score + 1 });
  },
});
```

Keep independent `inputs: { ... }` submitted together. For dependent values use `phase.steps().input(key, collector).input(key, ({ selected }) => collector)` as the interaction’s `steps`. Earlier selected values are typed; duplicate keys and RNG collectors are excluded. Each completed step commits a private value. Reconciliation keeps a valid prefix and drops the first invalid step and its suffix. A many selection is one atomic server step. Final validation/reduction runs only at completion; rejection preserves the previous prefix and rolls back transaction/RNG changes. Supply Depot remains independent; Bandits is the real dependent example.
