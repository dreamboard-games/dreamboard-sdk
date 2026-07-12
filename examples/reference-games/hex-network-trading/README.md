# Stormtrail

Stormtrail is the canonical reference for a shared hex map, vertex and edge
targets, connected construction, resource production, forced multi-player
resolution, and bilateral trade.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The reducer,
UI, and scenarios implement that brief directly; excluded legacy mechanics and
serialized base states are not gameplay authority.

## What To Learn Here

- Place Camps on vertices and connected Trails on edges.
- Change the available action set after a normal roll or a seven.
- Block the active player while required discards or a trade response remain.
- Revalidate inventories when a target accepts a bilateral offer.
- Play from normal setup through a visible network-building victory.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/setup-camp.ts`
- `app/phases/roll.ts`
- `app/phases/discard-barrier.ts`
- `app/phases/main.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios/discard-barrier.scenario.ts`

## Verification

```sh
pnpm verify
```
