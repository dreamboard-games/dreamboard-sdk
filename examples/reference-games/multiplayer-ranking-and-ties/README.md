# Harbor Fair

Harbor Fair is the canonical reference for reducer-owned standings, score
components, tie-break evidence, competition ranks, true ties, and scoreless
cancellation.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Current
reducers, tests, generated fixtures, and screenshots must conform to it and
cannot silently choose cancellation or ranking precedence.

## What To Learn Here

- Draft from a public market in seat order.
- Publish complete standings for two to four players.
- Distinguish score components from tie-break evidence.
- Represent exact ties, rank gaps, and a valid terminal outcome without scores.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game-contract.ts`
- `app/phases/draft-flow.ts`
- `test/scenarios/outcomes.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/multiplayer-ranking-and-ties verify
```
