# Harbor Fair

Harbor Fair is the canonical reference for reducer-owned standings, score
components, tie-break evidence, competition ranks, true ties, and scoreless
cancellation across a complete six-round public draft.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Current
reducers, tests, generated fixtures, and screenshots must conform to it and
cannot silently choose cancellation or ranking precedence.

## What To Learn Here

- Draft from a public market in seat order.
- Seed-shuffle the exact hidden 32-card festival deck during ordinary setup.
- Resolve storms and refill the vacated market position before progressing.
- Publish complete standings for two to four players.
- Distinguish score components from tie-break evidence.
- Represent exact ties, rank gaps, and a valid terminal outcome without scores.
- Author uncommon outcomes as legal command paths instead of state fixtures.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game-contract.ts`
- `app/phases/setup.ts`
- `app/phases/drafting.ts`
- `app/rules.ts`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios.test.ts`

The canonical demo uses four organizers, seed 2, and 24 accepted drafts. Its
reusable setup, early-refill, mid-game, and terminal checkpoints are all
prefixes of the same normal replay.

## Verification

```sh
pnpm --dir examples/reference-games/multiplayer-ranking-and-ties verify
```

The public CLI exposes the same replay as JSON for agent inspection:

```sh
"$DREAMBOARD_CLI_BIN" test inspect test/scenarios/complete-game.scenario.ts --perspective player:0
"$DREAMBOARD_CLI_BIN" test explore test/scenarios/complete-game.scenario.ts --perspective player:0
```
