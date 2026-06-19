# Hex Network Trading

Frontier Trails is the canonical hex-network trading teaching workspace. It
keeps board topology, resource production, player trade, bank trade, charter
cards, and terminal renown in one root workspace.

## What This Teaches

- How to model a shared hex board with both vertex and edge targets.
- How to drive setup placement through a reducer-owned snake order.
- How to expose resource production, build actions, bank trades, port trades,
  and player trades as typed interactions.
- How to keep a real React UI wired to board, hand, and dialog surfaces.

## When To Copy This Pattern

Copy this workspace when a game needs route building on a shared hex map, typed
resource payments, and multiple action families in one player turn. Keep the
phase split: `setup` owns initial placement, `playerTurn` owns roll, build,
trade, charter, and end-turn actions, and terminal phases own outcome handling.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/setup.ts`
- `app/phases/player-turn/index.ts`
- `ui/App.tsx`
- `ui/interaction-routes.tsx`
- `test/scenarios/build-trail-ready.scenario.ts`

## Rules Summary

Frontier Trails supports three to four players on a 19-hex frontier board. Each
player places two camps and two trails during setup. On a turn, the active
player rolls two dice, resolves production or a storm, optionally builds trails,
camps, towns, charter cards, bank trades, port trades, or player trades, then
ends the turn.

Players earn renown from camps, towns, long trade networks, explorer guilds,
and landmark charter cards. The first player to reach 10 renown at the end of
their turn wins.

## Authoring Model

The root workspace is the editable source. `manifest.ts` defines the board,
zones, pieces, resources, dice, and setup profiles. `app/game.ts` wires the
authoring contract to phases, setup profiles, player views, and static board
data. Generated files under `test/generated/` are deterministic scenario
artifacts and should not be edited by hand.

## Reducer Flow

`app/phases/setup.ts` validates the setup camp and trail sequence and advances
players in snake order. `app/phases/player-turn/index.ts` assembles roll,
build, bank-trade, player-trade, charter-card, and end-turn interactions from
the focused files in `app/phases/player-turn/`. `checkGameEnd` evaluates renown
after each turn and transitions to `gameOver` when a winner exists.

## UI Flow

`ui/App.tsx` creates the surface hooks, renders the board and player panels, and
routes all interaction forms through `ui/interaction-routes.tsx`. The UI uses
`Board.HexGrid` for physical hex, vertex, and edge targets, a typed charter
hand surface, and dialog surfaces for trades and charter cards.

## Scenario Coverage

Behavior scenarios cover setup placement, initial turn smoke, dice rolls, storm
handling, build availability, bank and port trades, player trade lifecycles,
trade dialog validation, charter card readiness, action authorization, relay
rates, and terminal winner progression.

The UI scenario `hex-network-trading.build-trail.desktop` binds the desktop
Workbench surface to the `build-trail-ready` behavior scenario and the root UI
entrypoint.

## Workbench Proof

`reference-game.json` names the root behavior scenarios and UI scenario
directly. Fixture and Workbench generation must derive from those root
entrypoints, not from legacy sidecar authorities.

## Verification

Run from this directory:

```sh
pnpm typecheck
pnpm test
pnpm test:ui
pnpm verify
```
