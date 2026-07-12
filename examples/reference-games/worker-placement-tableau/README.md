# Mosaic Workshop

Mosaic Workshop is the canonical reference for shared action-space blocking,
worker-dependent legality, resource costs, dependent craft inputs, and a
personal spatial tableau.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Existing
wake-up tracks, variable spaces, worker growth, orders, cards, reducers, tests,
and generated fixtures belong to the superseded larger game.

## What To Learn Here

- Derive available action spaces from occupancy and worker type.
- Resolve an ordinary worker and a master against different placement rules.
- Collect an item and destination cell as one dependent craft decision.
- Complete four seasons and score a spatial tableau.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/placement/worker-placement.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/placement-space-resolution-lumberyard.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/worker-placement-tableau verify
```
