# Sketchbook

Sketchbook is the canonical complete deck-building reference for private hands,
hidden draw decks, public discards, a finite shared supply, follow-up card
decisions, cleanup, seeded reshuffling, and supply-based outcomes.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Scenarios and
tests prove that contract; they do not redefine it.

## What To Learn Here

- Reserve, independently shuffle, and deal both ten-card starter decks.
- Move each physical card exactly once through deck, hand, in-play, discard,
  trash, and supply zones.
- Discover legal actions and dependent card domains as action, buy, and
  pending Technique state changes.
- Replay a growing-deck game through deterministic reshuffles and all legal
  supply-ending outcomes.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/player-turn/index.ts`
- `app/cards/eraser.ts`
- `app/cards/studio-visit.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios.test.ts`

The complete game is also the product-demo authority. UI checkpoints select
ordinary legal prefixes for the opening hand, first purchase, acquired-card
recycle, Technique chain, depleted supply, and final outcome.

## Agent Authoring Workflow

Read `rule.md` and `test/scenarios/complete-game.scenario.ts`. Use
`dreamboard test inspect` on a player perspective to understand the current
hand, supply, blockers, and dependent inputs, then use `dreamboard test explore`
to obtain concrete replay-accepted commands as JSON. Add a returned command to
the typed scenario and keep the UI checkpoints as ordinary prefixes of that
same replay; do not author a base state or generated projection.

## Verification

```sh
pnpm verify
```
