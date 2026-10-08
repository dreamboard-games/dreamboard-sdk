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

Mutation callbacks change state and outcomes through `tx`. A bare return accepts
that transaction. `tx.transition`, `tx.endGame`, and `tx.reject` record the
outcome; `return tx.reject(...)` remains the early-exit form. Calling an outcome
method without returning it still records that outcome. Callbacks cannot return
handwritten acceptance, rejection, or replacement state objects.

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

### Positions in a zone

`phase.inputs.position({ zones: ["hand"] })` collects an insertion point,
`{ zoneId, hostId, index }`, in each host of those zones the player may reach:
their own, shared ones and public ones. `index` counts the zone as it is now,
so 0 is before its first component and the zone's size after its last. Its
descriptor domain is `zonePosition`, listing each reachable host with its size.
Pair it with a card input and move the card with `tx.moveComponentToPosition`,
which places a card moved within its own zone between the two neighbours the
point was between:

```ts
reorder: play.interaction({
  inputs: {
    cardId: play.inputs.card({ from: ["hand"] }),
    to: play.inputs.position({ zones: ["hand"] }),
  },
  reduce({ tx, input }) {
    tx.moveComponentToPosition({
      componentId: input.params.cardId,
      at: input.params.to,
    });
  },
}),
```

A dragged card offers a `position` drop target for each insertion point. A drop
there submits the card and the point together, whatever the commit mode. The
registry `Hand` takes such an interaction as `reorder`.
