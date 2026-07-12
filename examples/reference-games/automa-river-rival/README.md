# River Guild

River Guild is the canonical reference for a deterministic rival held in
ordinary game state rather than represented as a fake player, seat, actor, or
authenticated participant.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The current
fixed-score claim, one-human restriction, game-authored claim ids, reducers,
tests, fixtures, and screenshots are superseded candidates.

## What To Learn Here

- Let one or two cooperating humans select public market cards in seat order.
- Resolve one deterministic rival instruction after all humans act.
- Emit ordered public procedure events without a rival `PlayerId`.
- Publish one cooperative outcome and contribution breakdown for every human.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/human-turn.ts`
- `app/phases/rival-procedure.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/claim-cargo.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/automa-river-rival verify
```
