# Stormtrail

Stormtrail is the canonical reference for a shared hex map, vertex and edge
targets, connected construction, resource production, forced multi-player
resolution, and bilateral trade.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The reducer,
UI, and scenarios implement that brief directly; excluded legacy mechanics and
serialized base states are not gameplay authority.

## What To Learn Here

- Place Camps on vertices and connected Trails on edges.
- Change the available action set after a normal roll or a seven.
- Block the active player while required discards or a trade response remain.
- Revalidate inventories when a target accepts a bilateral offer.
- Play from normal setup through a visible network-building victory.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/setup-camp.ts`
- `app/phases/roll.ts`
- `app/phases/discard-barrier.ts`
- `app/phases/main.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios/discard-barrier.scenario.ts`

## Agent Authoring Workflow

Read `rule.md` and the closest typed file under `test/scenarios/`. Use
`dreamboard test inspect` to see perspective-visible inventory, the current
actor or barrier, blockers, and progressive inputs. Use
`dreamboard test explore` to obtain concrete replay-accepted commands as JSON,
then add one command to the typed scenario. Normal rolls, sevens, discards,
Bandit movement, trades, and network growth all use this one path; scenarios do
not inject dice, resources, or mid-game state.

## Verification

```sh
pnpm check
pnpm test:browser
```

## Hosted and local UI

`ui/game.ts` binds the erased game type to the headless React instance, canonical
board geometry and pan/zoom. The hosted entry `ui/index.tsx` owns an iframe source;
it never imports executable reducer code. Registry source components are installed
under `ui/components/dreamboard`, using `@game` for the typed hook binding.

Run `pnpm dev` for local play. Only `ui/dev.tsx` imports the game and scenario
sources. Open, for example:

- `/?scenario=setup&at=opening&as=player-1`
- `/?scenario=bandits&at=ready-to-move&as=player-1`
- `/?scenario=depot&at=depot-ready&as=player-2`
- `/?scenario=discard&at=ready-to-discard&as=player-2`
- `/?scenario=trade&at=pending-trade&as=player-1`
- `/?scenario=complete&at=game-over&as=player-2`

Development controls switch the selected seat and save/restore JSON checkpoints.
The inspector displays the selected-seat frame; full reducer state stays in the
local source. Normal hosted gameplay has no checkpoint or seat-switch controls.

Board targets use native pointer and keyboard handlers. Single-target placements
commit when selected. Supply Depot give/receive choices share one unfinished draft
and submit together. Bandits commits the district first, then the eligible victim
or explicit no-victim choice; saved choices remain visible and can be cancelled.
