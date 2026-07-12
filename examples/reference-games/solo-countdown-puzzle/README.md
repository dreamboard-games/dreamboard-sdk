# Last Light

Last Light is the canonical reference for one human decision followed by
deterministic environment phases and public system events.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The current
repair-only reducer and fixed cyclic weather are known to be superseded; tests,
fixtures, reconnect behavior, and screenshots do not amend the brief.

## What To Learn Here

- Expose state-dependent charge, repair, and reinforce decisions.
- Run weather and countdown as automatic reducer procedures.
- Preserve strict terminal precedence across player and system steps.
- Emit public events without inventing an opponent or system player.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/player-turn.ts`
- `app/phases/resolve-weather.ts`
- `app/phases/advance-countdown.ts`
- `test/scenarios/repair-beacon.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/solo-countdown-puzzle verify
```
