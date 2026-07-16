# Canonical examples

The nine reference games are complete multi-turn teaching examples and genuine
consumers of the packed public SDK.

## Authority

Each game-local `rule.md` defines its mechanics, theme, information boundaries,
complete game arc, and deliberate exclusions. Reducers, tests, and generated
fixtures prove that authored brief; they do not amend it.

Each `reference-game.json` uses schema V5. It records the workspace and
read-first paths, teaching purpose, mechanics, UI patterns, and substantive
rights metadata. The directory list is the game registry; there is no second
maintained inventory.

| Reference id                   | Display name     | Rules                                                                            |
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

## Choose an example

| Authoring question                                   | Start with                     | Main SDK concepts                                                | Focused proof                                 |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- | --------------------------------------------- |
| Trick-taking with hidden hands and follow-suit rules | `hearts`                       | player views, card zones, simultaneous passing, trick resolution | `pnpm reference hearts`                       |
| Simultaneous drafting                                | `simultaneous-card-drafting`   | locked choices, reveal transitions, hand passing, mobile hands   | `pnpm reference simultaneous-card-drafting`   |
| A deck-building market                               | `deck-building-market`         | market zones, seeded refill, purchases, repeated turns           | `pnpm reference deck-building-market`         |
| Worker placement and a tableau                       | `worker-placement-tableau`     | worker targets, costs, resources, confirmation                   | `pnpm reference worker-placement-tableau`     |
| A route or network game                              | `hex-network-trading`          | hex targets, routes, resource hands, trading                     | `pnpm reference hex-network-trading`          |
| A roll-and-write scorecard                           | `roll-and-write-scorecard`     | square topology, board collectors, mobile marking                | `pnpm reference roll-and-write-scorecard`     |
| Ranked multiplayer outcomes with ties                | `multiplayer-ranking-and-ties` | outcomes, standings, score breakdowns, tie-breaks                | `pnpm reference multiplayer-ranking-and-ties` |
| A solo countdown puzzle                              | `solo-countdown-puzzle`        | automatic phases, deterministic events, recent history           | `pnpm reference solo-countdown-puzzle`        |
| An automated rival                                   | `automa-river-rival`           | deterministic rival state, system actions, cooperative outcomes  | `pnpm reference automa-river-rival`           |

## Authoring loop

1. Read `rule.md`, then open the closest typed file under `test/scenarios/`.
2. Use `dreamboard test inspect <scenario> --perspective player:<seat> --at
<checkpoint>` to inspect one authored state.
3. Use `dreamboard test explore <scenario> --perspective player:<seat> --at
<checkpoint>` to enumerate replay-accepted transitions.
4. Copy the selected command into the typed scenario and keep privacy,
   rejection, uniqueness, and cross-checkpoint assertions in its tests.
5. Run `pnpm reference <game-id>`, then open an authored UI checkpoint with
   `pnpm ui workbench --scenario <id>` when visual iteration is useful.

Generated workspace contracts, projections, catalogs, and fixtures stay
ignored. Every game intentionally keeps its own `pnpm-lock.yaml`, and its SDK
dependency is one exact npm version.

## Suite proof

Run every game with:

```sh
pnpm reference
```

The command validates each V5 manifest and checked-in lockfile, packs the SDK
once, installs temporary copies against that tarball, materializes, typechecks,
and runs reducer and UI tests. `pnpm release:verify` applies the same all-game
proof to the exact release candidate.
