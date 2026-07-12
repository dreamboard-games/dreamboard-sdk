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

## Verification

```sh
pnpm --dir examples/reference-games/deck-building-market verify
```
