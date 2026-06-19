# Deck Building Market

## What This Teaches

- Modeling a personal deck, hand, discard pile, in-play area, and shared market
  as typed card zones.
- Splitting a deck-builder turn into action, buy, cleanup, reshuffle, and
  terminal scoring reducer branches.
- Binding hand and market card collectors to authored interaction routes.
- Keeping reducer scenarios as the source of behavior proof for generated UI
  projections.

## When To Copy This Pattern

Copy this example when your game has private player hands, a shared card
market, cards that move through personal decks, or turn modes where one action
changes which interactions are legal next.

## Files To Read First

- `README.md`
- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/player-turn/index.ts`
- `ui/App.tsx`
- `ui/interaction-routes.tsx`
- `test/scenarios/buy-flow.scenario.ts`

## Rules Summary

Sketchbook is a two-player deck-builder. Each player starts with Doodles and
Ideas, draws five cards, plays action cards, plays treasures for coins, buys
cards from the studio shelf, then cleans up and draws a new hand. The game ends
when the Masterpiece pile is empty or any three piles are empty. Highest VP wins
with turn count as the tie-breaker.

## Authoring Model

`manifest.ts` defines the shared Sketchbook card set, per-player deck zones,
private hands, public discard and in-play zones, and shared supply piles. The
generated manifest contract under `shared/` gives the reducer and UI typed card
ids, zone ids, player ids, and interaction contracts.

## Reducer Flow

`app/game.ts` assembles the reducer from the setup phase and player-turn phase.
Setup creates player decks and the shared market. The player-turn phase manages
action, buy, cleanup, card effects, draw and reshuffle rules, end-condition
checks, and the terminal game-over phase.

## UI Flow

`ui/App.tsx` mounts the SDK primitive runtime, player hand, supply market,
turn summary, and phase prompts. `ui/interaction-routes.tsx` maps reducer
interactions to typed hand and market collectors so card play, trash, gain, and
buy actions use the same authored surfaces as the Workbench fixture path.

## Scenario Coverage

Reducer scenarios cover setup, initial turns, playing treasures, unavailable
actions, buying cards, multi-card chains, card effects, cleanup reshuffle,
player-two turns, nonterminal VP states, browser-action readiness, browser-form
readiness, and terminal scoring.

## Workbench Proof

`test/ui-scenarios/buy-flow.desktop.scenario.ts` identifies the desktop market
buy flow and points at the canonical reducer scenario plus the authored manifest,
reducer, UI, and route files. The Workbench fixture compiler should consume the
root workspace entrypoints from `reference-game.json`.

## Verification

```sh
pnpm --dir examples/reference-games/deck-building-market verify
```
