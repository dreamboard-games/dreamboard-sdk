# Last Light

Last Light is the canonical reference for one human decision followed by
actorless environment procedures, a seeded hidden weather deck, and public
ordered system events.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The current
reducer, generated artifacts, scenarios, and screenshots are implementations
of that contract; they do not amend it.

## What To Learn Here

- Expose state-dependent charge, repair, and reinforce decisions.
- Run weather and countdown as automatic reducer procedures.
- Seed-shuffle one exact eight-card hidden deck through ordinary setup.
- Preserve strict terminal precedence across player and system steps.
- Emit public events without inventing an opponent or system player.
- Author complete games as legal command paths instead of checked-in bases.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/setup.ts`
- `app/phases/player-turn.ts`
- `app/phases/resolve-weather.ts`
- `app/phases/advance-countdown.ts`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios.test.ts`

The canonical demo replay charges once, repairs all six beacon stages, and
wins on the seventh decision. The final repair ends immediately, so no seventh
weather card or countdown step is resolved.

## Verification

```sh
pnpm --dir examples/reference-games/solo-countdown-puzzle verify
```

From this game directory, the public CLI's JSON-only authoring workflow is:

```sh
"$DREAMBOARD_CLI_BIN" test inspect test/scenarios/complete-game.scenario.ts --perspective player:0
"$DREAMBOARD_CLI_BIN" test explore test/scenarios/complete-game.scenario.ts --perspective player:0
```
