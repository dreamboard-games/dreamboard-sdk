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

### Board and zone identities

Bound board inputs infer IDs from `boardId`: `phase.inputs.board.space({ boardId: "market" })`
accepts only that board's spaces, including generic boards. Edge, vertex, and tile inputs
require a tiled board. `playerSpace({ boardId: "mat" })` requires a per-player board base ID
and infers its space IDs and canonical runtime board ID type. There are no independent ID
type parameters to override that relationship.

Low-level collectors also preserve target kinds: an edge rule cannot be passed to a
space collector, and a player-space tuple rule must use `boardInput.playerSpace`.
Card input source zones must exist in the manifest. Attached-zone queries require
the host ID selected by the zone's declared attachment; a component of another
type or an absent host is rejected.
