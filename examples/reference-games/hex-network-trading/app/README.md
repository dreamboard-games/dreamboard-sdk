# Stormtrail reducer organization

The reducer follows the approved turn graph directly:

```text
setupCamp -> setupTrail -> roll
                         | non-7 -> main -> roll
                         | 7 -> discardBarrier? -> moveBandits -> main
main -> pendingTrade -> main
main -> gameOver (immediate fourth camp)
```

- `game-contract.ts` owns serializable state and phase schemas.
- `model.ts` owns the fixed 7-hex, 24-intersection, 30-edge topology indexes.
- `reducer-support.ts` owns shared occupancy, connectivity, costs, privacy, and
  outcome helpers.
- `eligibility.ts` declares legal board target domains.
- `phases/*.ts` each own one canonical phase and its interactions.
- `player-view.ts` is the privacy boundary: public totals, owner-only inventory
  composition, private discard maps, and participant-only stolen type.

Discard obligations are captured once in discard-phase rule state. The engine
still derives active actors, pending actors, continuation waiters, and blockers;
the game does not author `decision`, `requiredActions`, or `blockedBy` metadata.

The UI route map in `ui/interaction-routes.tsx` must continue to satisfy the
generated `InteractionRoutes` type so reducer interaction changes fail UI
typecheck until they are intentionally bound.
