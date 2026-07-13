# Last Light

Last Light is the canonical reference for one human decision followed by
actorless environment procedures, a seeded hidden weather deck, and public
ordered system events.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The current
reducer, local generated artifacts, scenarios, and screenshots are evidence for
that contract; they do not amend it.

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

## Agent Authoring Workflow

Read `rule.md` and `test/scenarios/complete-game.scenario.ts`. Use
`dreamboard test inspect` from `player:0` to see beacon state, public procedure
events, and available decisions, then use `dreamboard test explore` to obtain
concrete replay-accepted commands as JSON. Add a returned command to the typed
scenario. Weather and countdown procedures settle automatically; agents never
author a system player, deck order, or mid-game state.

## Verification

```sh
pnpm verify
```
