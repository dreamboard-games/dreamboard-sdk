# Canonical Examples

The SDK reference suite is the starting point for coding agents implementing
designer briefs. Each example demonstrates the smallest public SDK shape for a
common game family and has a packed consumer proof path.

## Rules Authority

Each game-local `rule.md` is the sole authority for that game's mechanics,
theme, information boundaries, complete game arc, and deliberate exclusions.
Reducer code, tests, generated fixtures, screenshots, and historical base
states cannot define or amend the rules implicitly.

Implementation and migration follow the
[Reference Game Rule Conformance And Agent Testing Hard Cut](../exec-plans/reference-game-rule-conformance-hard-cut/README.md).
The nine current reducers and complete-game scenarios implement the approved
briefs. Generated projections and Workbench fixtures remain disposable evidence
derived from that authored source, never a second authority.

Read every brief in the same order: teaching scope, theme, players and
objective, information visibility, components and setup, complete game arc,
canonical interactions, automatic procedures, scoring and outcome, deliberate
exclusions, then acceptance obligations. Game-specific rule sections may
appear between those common boundaries; they do not create new SDK concepts.

| Reference id                   | Display name     | Rules and theme brief                                                            |
| ------------------------------ | ---------------- | -------------------------------------------------------------------------------- |
| `hearts`                       | Hearts           | [`rule.md`](../../examples/reference-games/hearts/rule.md)                       |
| `simultaneous-card-drafting`   | Lantern Market   | [`rule.md`](../../examples/reference-games/simultaneous-card-drafting/rule.md)   |
| `deck-building-market`         | Sketchbook       | [`rule.md`](../../examples/reference-games/deck-building-market/rule.md)         |
| `worker-placement-tableau`     | Mosaic Workshop  | [`rule.md`](../../examples/reference-games/worker-placement-tableau/rule.md)     |
| `hex-network-trading`          | Stormtrail       | [`rule.md`](../../examples/reference-games/hex-network-trading/rule.md)          |
| `roll-and-write-scorecard`     | Cloudline Survey | [`rule.md`](../../examples/reference-games/roll-and-write-scorecard/rule.md)     |
| `multiplayer-ranking-and-ties` | Harbor Fair      | [`rule.md`](../../examples/reference-games/multiplayer-ranking-and-ties/rule.md) |
| `solo-countdown-puzzle`        | Last Light       | [`rule.md`](../../examples/reference-games/solo-countdown-puzzle/rule.md)        |
| `automa-river-rival`           | River Guild      | [`rule.md`](../../examples/reference-games/automa-river-rival/rule.md)           |

| Author question                                                     | Start here                     | Canonical SDK concepts                                                                             | Smallest proof                                                         |
| ------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Build a trick-taking game with private hands and follow-suit rules. | `hearts`                       | private player views, card zones, simultaneous passing, trick resolution                           | `pnpm reference-games:test:packed --game hearts`                       |
| Build a simultaneous drafting game.                                 | `simultaneous-card-drafting`   | locked choices, reveal transitions, hand passing, mobile card hands                                | `pnpm reference-games:test:packed --game simultaneous-card-drafting`   |
| Build a deck-building market.                                       | `deck-building-market`         | market zones, seeded deck refill, purchase actions, repeated turn state                            | `pnpm reference-games:test:packed --game deck-building-market`         |
| Build a worker-placement game.                                      | `worker-placement-tableau`     | worker targets, resource costs, tableau state, confirmation flow                                   | `pnpm reference-games:test:packed --game worker-placement-tableau`     |
| Build a route or network game.                                      | `hex-network-trading`          | hex board targets, route state, resource hands, trade controls                                     | `pnpm reference-games:test:packed --game hex-network-trading`          |
| Build a roll-and-write scorecard.                                   | `roll-and-write-scorecard`     | square board topology, `Board.SquareGrid`, player-space collectors, mobile marking                 | `pnpm reference-games:test:packed --game roll-and-write-scorecard`     |
| Build ranked multiplayer outcomes with ties.                        | `multiplayer-ranking-and-ties` | `GameOutcome`, standings, score breakdowns, tie-break evidence, guidance                           | `pnpm reference-games:test:packed --game multiplayer-ranking-and-ties` |
| Build a solo countdown puzzle.                                      | `solo-countdown-puzzle`        | auto phases, deterministic `GameEvent` output, scoreless outcomes, recent event history            | `pnpm reference-games:test:packed --game solo-countdown-puzzle`        |
| Build an automa rival.                                              | `automa-river-rival`           | deterministic rival state, system-action events, no fake player seat, cooperative outcome evidence | `pnpm reference-games:test:packed --game automa-river-rival`           |

## One Agent Authoring Path

Every game uses the same loop:

1. Read `rule.md`, then open the closest typed source under `test/scenarios/`.
2. Run `dreamboard test inspect <scenario> --perspective player:<seat>` to read
   the selected checkpoint, actor views, blockers, and action inputs as JSON.
3. Run `dreamboard test explore <scenario> --perspective player:<seat>` to
   obtain concrete replay-accepted commands for that perspective.
4. Copy one returned `candidate.command` into the typed scenario and keep
   cross-checkpoint, rejection, privacy, or uniqueness assertions in the
   package's scenario test.
5. Run `pnpm verify` in the game package, then use the authored UI checkpoint
   with `pnpm ui:workbench --scenario <id>` or launch the same source with
   `dreamboard dev`.

There is no checked-in base-state mode and no second inspect-only authoring
mode. Inspection and exploration discover what can be replayed; the typed
scenario remains the single authored test and demo path. Generated workspace
contracts, projections, catalogs, fixtures, and checkpoints stay local and
untracked.

All nine examples are complete multi-turn games. Stable technical IDs and
release slugs remain the table values above even when their public display name
and theme differ. Each isolated game intentionally retains its own
`pnpm-lock.yaml`; product code, not this catalog, selects the landing-page
subset.

## Agent Selection Rules

- Use board topology and board collectors for compact grids, tracks, maps, and
  scorecards. Do not create a sheet runtime or a second target protocol.
- Use `GameOutcome` for terminal results, including ties, draws, cancellation,
  score breakdowns, and tie-break evidence. Do not infer winners from UI rows.
- Use authored setup, phase, and interaction guidance for player-facing copy.
  Disabled action copy comes from descriptor availability reasons.
- Use auto phases and `gameEvent.systemAction` for deterministic solo or
  automa procedures. Do not model an automa as a `PlayerId`, session actor, or
  authenticated participant.
- Keep physical component inventory as documentation or lint input. It must not
  shape gameplay state, board topology, generated contracts, or host transport.

## Release Proof

All nine canonical games are release-required. The foundation Workbench suite is
selected from `scripts/ui/required-ui-scenarios.mjs`, and the same list drives
`pnpm reference-games:test:packed --required`.

Run these before claiming SDK-side reference-suite readiness:

```sh
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
```

Whole-plan closeout additionally requires the exact public SDK release, public
CLI/dev documentation, internal real-host proof, and cross-repository
mergeability described by Phase 08.
