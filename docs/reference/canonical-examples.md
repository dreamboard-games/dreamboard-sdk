# Canonical Examples

The SDK reference suite is the starting point for coding agents implementing
designer briefs. Each example demonstrates the smallest public SDK shape for a
common game family and has a packed consumer proof path.

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
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
```

Phase 05 still requires the exact public SDK release, internal real-host proof,
public documentation, and agent-skill proof before whole-plan closeout.
