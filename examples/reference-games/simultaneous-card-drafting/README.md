# Simultaneous Card Drafting

## What This Teaches

Draft Feast is an original card drafting reference game for simultaneous
private selection. Players choose from private hands, reveal together, pass
the remaining cards, and score set-collection categories across rounds.

## When To Copy This Pattern

Copy this pattern for games where every player makes a private choice before a
shared reveal, where hands or hidden options rotate between seats, and where
round scoring is easiest to keep in pure helpers outside phase assembly.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/drafting.ts`
- `app/rules/scoring.ts`
- `ui/App.tsx`
- `test/scenarios/draft-one-pick.scenario.ts`
- `test/ui-scenarios/lock-choice.mobile.scenario.ts`

## Rules Summary

Each round deals a private hand to every player. On each draft turn, every
player submits one card, choices reveal together, selected cards move to each
player's played area, and the remaining hands pass left. Rounds score nigiri,
wasabi, tempura, sashimi, dumplings, maki majorities, and end-game pudding.

## Authoring Model

The root workspace owns the manifest, reducer, UI, and scenarios. The manifest
defines the sushi card set and player zones, while reducer phases own setup,
draft submission, round scoring, and terminal game-over state.

## Reducer Flow

The reducer starts in `setup`, deals seeded hands, and enters `drafting`.
`submit` records each player's private pick; once every player has submitted,
the phase reveals choices, passes hands, and either continues drafting or
transitions to `scoreRound`. After three rounds, pudding scoring produces the
terminal `gameOver` outcome.

## UI Flow

`ui/App.tsx` renders the runtime root and phase switch. `ui/components/`
renders the private hand, current played cards, score summary, and submit
controls. `ui/interaction-routes.tsx` maps reducer interactions to submit
routes for Workbench and browser replay.

## Scenario Coverage

Behavior scenarios cover initial four-player and five-player deals plus a
complete one-pick simultaneous draft turn. The mobile UI scenario binds the
draft pick behavior to the real reducer and root UI entrypoint.

## Workbench Proof

The mobile lock-choice scenario targets the same `submit` interaction exposed
by the reducer and the same `ui/index.tsx` entrypoint declared in
`reference-game.json`. Its evidence path names only root teaching workspace
files, not the deleted fixture sidecar.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm test:ui
pnpm verify
```
