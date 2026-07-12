# Stormtrail

Stormtrail is the canonical reference for a shared hex map, vertex and edge
targets, connected construction, resource production, forced multi-player
resolution, and bilateral trade.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The current
19-hex implementation, five-resource economy, towns, ports, charters, awards,
reducers, tests, and fixtures are superseded candidates, not rule sources.

## What To Learn Here

- Place Camps on vertices and connected Trails on edges.
- Change the available action set after a normal roll or a seven.
- Block the active player while required discards or a trade response remain.
- Revalidate inventories when a target accepts a bilateral offer.
- Play from normal setup through a visible network-building victory.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/setup.ts`
- `app/phases/player-turn/index.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/build-trail-ready.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/hex-network-trading verify
```
