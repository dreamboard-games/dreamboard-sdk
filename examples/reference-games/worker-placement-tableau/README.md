# Worker Placement Tableau

Artisans' Guild is a two-player worker-placement tableau game. Players choose
wake-up slots, place apprentices and masters onto shared action spaces, gather
resources, craft items into personal workshop mats, fulfill order cards, and
score after six seasons.

## What This Teaches

- Worker placement action-space blocking.
- Worker choice after target-first board selection.
- Dynamic wake-up turn order and bonuses.
- Tableau item placement with adjacency restrictions.
- Order fulfillment and end-game tie-break scoring.

## When To Copy This Pattern

Copy this workspace when a game needs shared action spaces that can be blocked,
worker types with different placement legality, a per-player spatial tableau,
or a turn structure where player order is chosen during a setup phase.

## Files To Read First

- `README.md`
- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/placement/worker-placement.ts`
- `ui/App.tsx`
- `test/scenarios/placement-space-resolution-lumberyard.scenario.ts`
- `test/ui-scenarios/place-worker.desktop.scenario.ts`

## Rules Summary

Each season starts with wake-up slot selection. Lower slots act earlier and
higher slots grant better bonuses. During placement, players alternate placing
workers onto action spaces. Apprentices can only use empty spaces, while each
master can override an occupied space. Spaces resolve immediately to grant
resources, draw cards, train workers, craft items, sell goods, or fulfill
workshop and order goals. After season six, items, fulfilled orders, adjacency,
and coin conversion determine the winner, with most items and then coin as
tie-breakers.

## Authoring Model

`manifest.ts` declares the shared action board, wake-up track, per-player
workshop mats, workers, cards, and resources. Runtime setup chooses the active
variable spaces and seeds the player hands, workers, decks, resources, and
turn-order state.

## Reducer Flow

`app/game.ts` assembles setup, wake-up, placement, cleanup, scoring, and
game-over phases. Placement is split under `app/phases/placement/`: target
selection, worker legality, market choices, crafting, order fulfillment, card
effects, reassign, pass handling, and turn advance each stay in focused files.

## UI Flow

`ui/App.tsx` mounts the generated UI contract and routes reducer interactions
through `ui/interaction-routes.tsx`. The place-worker route is target-first:
the player chooses an action space on the board, then resolves the dependent
worker choice in a dialog. Pending choices expose cancel chrome through the
game UI frame.

## Scenario Coverage

Behavior scenarios under `test/scenarios/` cover setup, wake-up slots, variable
spaces, ordinary and master placement, market choices, workshop crafting,
one-shot and persistent apprentice cards, order fulfillment, player views,
scoring, tie-breakers, and a full six-season flow.

## Workbench Proof

`test/ui-scenarios/place-worker.desktop.scenario.ts` binds the required desktop
Workbench proof to the real lumberyard placement behavior scenario and points
at the root reducer and UI sources.

## Verification

Run the game-local gate from this directory or the repository root:

```sh
pnpm verify
pnpm --dir examples/reference-games/worker-placement-tableau verify
```
