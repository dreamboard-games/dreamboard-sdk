# Solo Countdown Puzzle

## What This Teaches

Last Light is an original solo reference game for deterministic environment
procedures. A human player repairs beacon spaces while reducer-owned weather
and countdown auto phases emit system action events.

## When To Copy This Pattern

Copy this pattern for one-player games where a human action is followed by
deterministic system resolution, public event history must survive reconnect,
and terminal outcomes can be reached by either player progress or a countdown.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/player-turn.ts`
- `app/phases/resolve-weather.ts`
- `app/phases/advance-countdown.ts`
- `ui/App.tsx`
- `test/scenarios/repair-beacon.scenario.ts`

## Rules Summary

Repair one of three beacons before the lighthouse fails. Each repair costs one
energy and raises the chosen beacon by one level. After a repair, weather
resolves and the countdown advances. Lighting every beacon twice wins
immediately. Storm six or an exhausted countdown loses.

## Authoring Model

The root workspace owns the manifest, reducer, UI, and scenarios. The square
board is authored in `manifest.ts`; game-specific counters live in public
state so reconnect can restore the current countdown, storm, beacons, and
system event history.

## Reducer Flow

The reducer starts in `playerTurn`. `repairBeacon` validates the single human
actor, spends energy, raises a beacon, and either ends with all beacons lit or
transitions through `resolveWeather` and `advanceCountdown`. Those auto phases
append deterministic `systemAction` events before returning to `playerTurn` or
ending the game.

## UI Flow

`ui/App.tsx` renders the player view, beacon grid, repair buttons, event log,
and terminal outcome. `ui/interaction-routes.tsx` keeps the submit route names
explicit for Workbench and browser-replay authors.

## Scenario Coverage

Behavior scenarios cover initial state, deterministic repair/weather/countdown,
reconnect event restoration, invalid repair validation, beacon win, storm loss,
and countdown loss. UI scenarios identify the repair and reconnect browser
states consumed by fixture generation.

## Workbench Proof

The mobile repair scenario targets the same `repairBeacon` interaction exposed
by the reducer and the same UI entrypoint declared in `reference-game.json`.
The reconnect scenario starts after committed system events so replay evidence
can prove public history is materialized rather than re-synthesized.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm test:ui
```
