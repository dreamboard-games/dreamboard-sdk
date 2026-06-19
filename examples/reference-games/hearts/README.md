# Hearts

## What This Teaches

Hearts is a four-player trick-taking reference game for private hands, sealed
simultaneous passing, follow-suit legality, and shared trick resolution.

## When To Copy This Pattern

Copy this pattern for card games where each player owns hidden hand state, a
table action waits for every player before resolving, and reducer validation
must drive both available UI targets and rejected illegal plays.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/phases/passing.ts`
- `app/phases/playing.ts`
- `ui/App.tsx`
- `ui/interaction-routes.tsx`
- `test/scenarios/smoke-initial-hand.scenario.ts`
- `test/ui-scenarios/pass-three.mobile.scenario.ts`

## Rules Summary

Each player receives a private hand. The hand starts in the passing phase:
every player chooses three cards, and the reducer reveals and redistributes the
passes only after all four submissions arrive. Play then proceeds as a
trick-taking game where the opening lead must be the two of clubs, players
follow suit when possible, and hearts plus the queen of spades are penalty
cards.

## Authoring Model

The root workspace owns the manifest, reducer, UI, generated manifest contract,
behavior scenarios, and UI scenario. `manifest.ts` defines the playing-card
topology, `app/game.ts` wires the reducer phases, and `shared/` contains the
generated contract types used by both reducer and UI code.

## Reducer Flow

The reducer initializes four hands, enters `passing`, collects one sealed
three-card pass per player, then transitions to `playing`. The playing phase
validates opening-lead, follow-suit, and penalty-card restrictions before
moving tricks through scoring and end-of-hand phases.

## UI Flow

`ui/App.tsx` renders the table, private hand, current trick, and phase-specific
actions. `ui/interaction-routes.tsx` maps the card hand surface to the passing
and play-card submissions so Workbench replay can use the same physical action
targets exposed to players.

## Scenario Coverage

Behavior scenarios assert the initial passing state, four-player seats, and
submit interactions. The reducer smoke test covers pass-left redistribution,
opening-lead eligibility, illegal lead rejection, first-trick penalty
restrictions, and follow-suit behavior.

## Workbench Proof

The mobile pass-three UI scenario points at the root reducer, root UI
entrypoint, and the `smoke-initial-hand` behavior scenario. It uses the
`passing.submit` route through the hand action slot so mobile replay exercises
the same selected-card action path as the authored UI.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm test:ui
pnpm verify
```
