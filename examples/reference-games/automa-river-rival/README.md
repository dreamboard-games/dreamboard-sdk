# Automa River Rival

## What This Teaches

Automa River Rival teaches a deterministic solo rival that is ordinary public
game state rather than a fake player, seat, actor, or session. One human claim
advances the team score, then the reducer reveals and resolves the rival
procedure, appends system events, refills the river, and advances the round.

## When To Copy This Pattern

Copy this pattern when a solo or cooperative game needs predictable opposition
without adding a synthetic player identity. Keep the rival procedure
deterministic, explain automatic work with system events, and record claim ids
so reconnect retries cannot apply the same human action twice.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/human-turn.ts`
- `app/phases/rival-procedure.ts`
- `ui/App.tsx`
- `test/scenarios/claim-cargo.scenario.ts`
- `test/scenarios/duplicate.scenario.ts`
- `test/scenarios/reconnect.scenario.ts`
- `test/scenarios/terminal.scenario.ts`
- `test/ui-scenarios/claim-cargo.mobile.scenario.ts`

## Rules Summary

River Guild is a one-player cooperative market race. The human team scores two
points when it claims cargo. After every human claim, the rival reveals the next
instruction from a fixed deck, resolves it against the public river, records
system-action events, refills the river from a deterministic supply, and starts
the next round. After six rounds, the team wins, draws, or loses by comparing
team score to rival progress.

## Authoring Model

The rival is modeled in `publicState`: the river, rival deck, rival progress,
processed claim ids, and event log are all visible state. There is no second
player id for the rival. Duplicate protection is part of the reducer contract:
the same claim id returns the already committed event slice without changing
state.

## Reducer Flow

`setup` is an automatic phase that enters `humanTurn`. `humanTurn.claimCargo`
validates the actor, records the human score, resolves the next rival
instruction, emits system events, and either returns to `humanTurn` or
transitions to `gameOver` with a cooperative outcome.

## UI Flow

The UI renders the public river, team and rival totals, cooperative status, and
the system event log. The single submit route sends `claimCargo` with the
stable `main-claim` id so the Workbench path can prove duplicate-safe replay.

## Scenario Coverage

Reducer scenarios cover the initial claim-highest branch, duplicate delivery,
deterministic repeat, unauthorized actor rejection, reconnect restoration,
claim-kind fallback, sweep-left, and all cooperative outcome classes.

## Workbench Proof

UI scenarios point at the root authored `ui/index.tsx`, root behavior scenario
files, and the reducer source files. They retain the legacy mobile coverage
intent while Phase 03 integration switches fixture discovery to
`reference-game.json.workspace.uiScenarios`.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm test:ui
pnpm verify
```
