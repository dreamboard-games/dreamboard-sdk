# Cloudline Survey

Cloudline Survey is the canonical reference for a shared seeded dice result
resolved on ordinary per-player square boards in seat order.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Scenarios
select ordinary deterministic seeds; they do not author roll tables or random
streams. Reducers, tests, local fixtures, and screenshots are evidence against
the brief, not authority.

## What To Learn Here

- Use `Board.SquareGrid` with `scope: "perPlayer"` for a scorecard.
- Derive legal player-space targets from one public roll.
- Distinguish a matching survey from the forced failed-mark fallback.
- Complete eight rounds and publish score components and tied outcomes.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/`

## Agent Authoring Workflow

Read `rule.md` and the closest typed file under `test/scenarios/`. Use
`dreamboard test inspect` to see the public roll, active surveyor, target domain,
and fallback obligation, then use `dreamboard test explore` to obtain concrete
replay-accepted marks as JSON. Add a returned command to the typed scenario;
the deterministic seed drives every roll without a checked-in random stream or
scorecard state.

## Verification

```sh
pnpm verify
```
