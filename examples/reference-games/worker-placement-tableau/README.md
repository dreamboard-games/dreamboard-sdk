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
- `app/phases/placement/index.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/action-spaces.scenario.ts`
- `test/scenarios/complete-game.scenario.ts`

## Agent authoring workflow

Start from the canonical normal-setup replay. Use `inspect` to understand the
actor, public workshop state, and progressive input descriptors; use `explore`
to copy one complete replay-accepted command into a scenario:

```sh
dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup

dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup --limit 100

dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:1 --at given:1

dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at when:5 --limit 100
```

The opening exploration contains ordinary placements, master placements,
legal one/two-resource exchanges, and pass. The developed `when:5` checkpoint
also exposes only affordable item/cell pairs, including the Joined Mosaic
neighbor restriction. Cleanup and scoring settle automatically, so agents do
not author system-player commands or state snapshots.

## Verification

```sh
pnpm --dir examples/reference-games/worker-placement-tableau verify
```
