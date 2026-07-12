# Cloudline Survey

Cloudline Survey is the canonical reference for a shared seeded dice result
resolved on ordinary per-player square boards in seat order.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Hard-coded
roll sequences are scenario entropy, not game rules. Existing reducers, tests,
fixtures, and screenshots must be audited against the brief.

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

## Verification

```sh
pnpm reference-games:test:packed --game roll-and-write-scorecard
pnpm ui:test --scenario roll-and-write-scorecard.mark-cell.mobile
```
