# Sketchbook

Sketchbook is the canonical deck-building reference for private hands,
personal draw and discard piles, a finite shared supply, follow-up card
decisions, cleanup, and seeded reshuffling.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Existing
attack cards, penalty cards, tie-breaks, reducers, tests, and generated fixtures
may reflect the superseded larger game and do not amend the brief.

## What To Learn Here

- Move cards through deck, hand, in-play, discard, trash, and supply zones.
- Change available actions as action and buy resources change.
- Collect dependent trash and gain selections from a card effect.
- Complete repeated turns and derive a terminal result from finite supplies.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/player-turn/index.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/buy-flow.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/deck-building-market verify
```
