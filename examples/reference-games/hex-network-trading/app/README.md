# Stormtrail reducer organization

The reducer follows the approved turn graph directly:

```text
setupCamp -> setupTrail -> roll
                         | non-7 -> main -> roll
                         | 7 -> discardBarrier? -> moveBandits -> main
main -> pendingTrade -> main
main -> gameOver (immediate fourth camp)
```

- `game-model.ts` binds the model once as `stormtrail = createGame({...})`.
  Every other module imports that value; `typeof stormtrail.types.State` is
  the game state and `typeof stormtrail.types.Queries` the query helper type.
- `game.ts` assembles the game with `stormtrail.assemble({...})` from the
  default exports of `phases/*.ts`.
- `model.ts` owns the fixed 7-hex, 24-intersection, 30-edge topology indexes.
- `reducer-support.ts` owns shared occupancy, connectivity, costs, privacy, and
  outcome helpers. Mutating helpers take the open transaction (`Tx`).
- `eligibility.ts` declares legal-target predicates typed against the game
  contract; each phase composes them with
  `inputs.board.<kind>({ boardId: "frontier", where: [...] })`.
- `phases/*.ts` each bind one phase (`const main = stormtrail.phase("main")`)
  and default-export `main.define({...})` with its interactions.
- `player-view.ts` (`stormtrail.views.shared / .player`) is the privacy
  boundary: public totals, owner-only inventory composition, private discard
  maps, and participant-only stolen type.

Discard obligations are captured once in discard-phase rule state. The engine
still derives active actors, pending actors, continuation waiters, and blockers;
the game does not author `decision`, `requiredActions`, or `blockedBy` metadata.

The UI route map in `ui/interaction-routes.tsx` must continue to satisfy the
generated `InteractionRoutes` type so reducer interaction changes fail UI
typecheck until they are intentionally bound.
