# River Guild

River Guild is the canonical reference for a deterministic non-human rival
represented as ordinary game state, never as a player, seat, actor, or
authenticated participant.

[`rule.md`](rule.md) is the gameplay and theme authority. The stable package,
directory ID, manifest ID, and release slug remain `automa-river-rival`; the
public display name is River Guild.

## Complete game arc

One or two cooperating humans claim one of four public cargo cards in seat
order. Every claim awards its printed value and refills the same river
position. Once every human has acted, the reducer reveals and resolves exactly
one rival instruction, refills again, advances the round, and returns control
to a human. After six rival procedures, every human receives the same
authoritative cooperative result and team score with one contribution
component per seat.

The 24 cargo cards and six rival instructions are independently shuffled by
normal seeded setup. Unrevealed deck identities remain hidden; the river,
warehouses, rival history and progress, public procedure events, and outcome
are visible to every perspective.

## Files to read first

- `rule.md` — frozen rules and deliberate exclusions
- `manifest.ts` — cargo recipe, instruction recipe, and zones
- `app/game.ts` — ordinary setup and phase assembly
- `app/phases/human-turn.ts` — the sole human interaction
- `app/phases/rival-procedure.ts` — deterministic rival selection
- `app/phases/advance-river-round.ts` — six-round terminal boundary
- `app/player-view.ts` — public projection and hidden-deck counts
- `test/scenarios/complete-game.scenario.ts` — canonical two-human demo arc
- `test/scenarios/claim-actionability.scenario.ts` — exact available domain
- `test/scenarios/procedure-events.scenario.ts` — ordered system procedure
- `test/scenarios/no-fake-player.scenario.ts` — identity-boundary proof
- `ui/App.tsx` — responsive river, warehouse, event, and outcome UI

## Agent Authoring Workflow

From this package root, inspect the opening node, enumerate its concrete legal
claims, then copy a returned `candidate.command` into the scenario source:

```sh
dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup

dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup --limit 20

dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:1 --at given:1

dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:1 --at given:1 --limit 20
```

`inspect` explains the node, derived flow, and perspective-scoped actions.
`explore` returns only concrete replay-accepted commands for the selected
human. Automatic rival phases settle before either command returns; there is
no rival command to author.

## Verification

```sh
pnpm verify
```
