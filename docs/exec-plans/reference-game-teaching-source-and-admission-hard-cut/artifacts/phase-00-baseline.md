# Phase 00 Baseline

Date: 2026-06-19

## Revisions

- SDK: `d9ecc33dd14d7415a2a160deef7139747d06c280`
- Internal: `5fc404a6e4de0df84051264e93b0f6866383ded5`

## Reference-Game Inventory

Current source authority is split between root metadata, `demo-workspace/`, and
fixture sidecars.

| Game                           | Root files | Fixture-sidecar files | Demo-workspace files |
| ------------------------------ | ---------: | --------------------: | -------------------: |
| `automa-river-rival`           |          5 |                    11 |                    2 |
| `deck-building-market`         |          4 |                     5 |                   92 |
| `hearts`                       |          4 |                     5 |                   60 |
| `hex-network-trading`          |          4 |                     5 |                  121 |
| `multiplayer-ranking-and-ties` |          5 |                    10 |                    2 |
| `roll-and-write-scorecard`     |          5 |                    12 |                    3 |
| `simultaneous-card-drafting`   |          4 |                     5 |                   66 |
| `solo-countdown-puzzle`        |          5 |                    10 |                    2 |
| `worker-placement-tableau`     |          4 |                     5 |                  125 |

Repository-wide reference-game file counts, excluding `node_modules`:

| Directory                      | Files |
| ------------------------------ | ----: |
| `automa-river-rival`           |    18 |
| `deck-building-market`         |   101 |
| `hearts`                       |    69 |
| `hex-network-trading`          |   130 |
| `multiplayer-ranking-and-ties` |    17 |
| `roll-and-write-scorecard`     |    20 |
| `shared`                       |     2 |
| `simultaneous-card-drafting`   |    75 |
| `solo-countdown-puzzle`        |    17 |
| `worker-placement-tableau`     |   134 |

## Current Check Output

`mise exec node@24 -- pnpm reference-games:check` exited 0.

The emitted receipt records `status: "passed"` and hashes `src/` plus
`scenarios/` for each game. That proves the legacy fixture package shape, not a
complete root teaching workspace.

## Required Workbench Fixtures

The current required fixture files exist and hash as follows:

| Scenario                                        | Fixture                                                                                  | SHA-256                                                            | Frames |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -----: |
| `hearts.pass-three.mobile`                      | `fixtures/ui/reference-games/hearts.pass-three.mobile.fixture.json`                      | `33de77d6abdacca586159463fbe71673dbb463e270e64029cccfba789a7edefa` |      2 |
| `hex-network-trading.place-route.desktop`       | `fixtures/ui/reference-games/hex-network-trading.place-route.desktop.fixture.json`       | `fb66b4e51094f14d51e7936684aa975b2e673c420ea33fb6633f243f131a8846` |      2 |
| `worker-placement-tableau.place-worker.desktop` | `fixtures/ui/reference-games/worker-placement-tableau.place-worker.desktop.fixture.json` | `65bafc87a195ffe48c58e30e5d5b7c0e333e6dd8a9fddc9ad917e1aa2e349f9f` |      2 |

`hearts.pass-three.mobile` records source files under
`examples/reference-games/hearts/scenarios/coverage.json`,
`examples/reference-games/hearts/src/reference-game.mjs`,
`examples/reference-games/shared/reference-reducer.mjs`,
`examples/reference-games/shared/reference-ui.mjs`, and
`examples/reference-games/hearts/src/scenarios/pass-three.scenario.mjs`.
Its generated render module imports
`examples/reference-games/hearts/src/ui.mjs`.

## Packed Consumer Receipt

Existing receipt path:

```text
build/reference-games/packed-consumer-receipt.json
```

The current receipt includes `hearts` with source SHA-256
`5a9e74ff5d63a1ebb65abfc74ac25886a0ae60e39cb22db1b145b1dba56d8c01`.
This receipt is legacy-sidecar proof and must be replaced by root workspace
verification during Phase 03.

## Demo-Release Source Assumptions

Internal `scripts/staging-demo-release.mjs` currently reads
`reference-game.json` files under `examples/reference-games` and resolves the
workspace root from `demoRelease.sourcePath`, falling back to
`<game-id>/demo-workspace`. The SDK validator also requires
`demoRelease.sourcePath` to equal `<game-id>/demo-workspace` for published
games.

## Agent-Runner Source Assumptions

Internal `apps/agent-runner/src/integrations/github-workspace.ts` currently
owns `VENDORED_EXAMPLE_SLUGS`:

```text
artisans-guild
hearts
sushi-go
frontier-trails
sketchbook
```

The fallback source path is `examples/published/<slug>`. The current unit test
asserts prepared workspaces contain:

```text
examples/hearts
examples/sushi-go
examples/frontier-trails
examples/sketchbook
examples/artisans-guild
```

These assertions characterize the pre-cutover runner behavior. Phase 06 must
replace them with manifest-driven SDK example IDs.
