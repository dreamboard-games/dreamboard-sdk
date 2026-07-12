# Phase 01 Closeout: Base-Free Scenario Runtime Hard Cut

Date: 2026-07-13

Status: complete

## Exact implementation commits

| Repository       | Commit                                     | Scope                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dreamboard-sdk` | `ef7f2dec4b6ec642331d87127d3793f5e92a841f` | Normal-setup manifest capability, semantic player-ID schemas, self-contained scenario contract, canonical replay/checkpoints, clone-only probes, candidate verification, and Phase 00/01 authority artifacts. |
| `dreamboard`     | `b5a560107bc5c301ce1177203a88ae1d9edd326e` | Source-closure scenario loader, canonical CLI runner, scenario-only scaffold, exact-commit/agent verifier cutover, and temporary Phase 02 `dev --from-scenario` hard failure.                                 |

These are implementation commits. This receipt is intentionally a later
documentation commit so it can record their immutable identities.

## Exact packed SDK candidate

- Filename: `dreamboard-games-sdk-0.4.0-alpha.8.tgz`
- Proof path: `/tmp/dreamboard-sdk-phase01-final.QQEeAG/dreamboard-games-sdk-0.4.0-alpha.8.tgz`
- SHA-256:
  `38cfc060dc7e1d794fd194318e86a66a7b031ecb1f8e20c574a420c59ae128a7`
- npm package integrity emitted by `npm pack`:
  `sha512-z8oNfiMtOBmjxjS9L/D19Z3QqDbxRKmZ71FFkjWO+FdZFQ2ZM9kLdzEH91AHJGpgtCzUMCNmz7LAfNbKzqByCQ==`

The CLI proof used the file-backed pnpm installation whose symlink resolved to
that tarball. Package/release-set pins, the lockfile, staged packages, and
temporary React type support used by the existing scaffold test were restored
after the proof. No file-candidate wiring remains in either source tree.

## Old-to-new public symbol and behavior ledger

| Removed authority                                              | Replacement authority                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `defineBase`, `BaseDefinition`, `BaseContext`                  | `createScenarioAuthoring(game)` and its bound `defineScenario`                                                            |
| `BaseStateArtifact`, generated base snapshots, `baseStates`    | normal setup plus `replayScenario({ game, scenario, at })`                                                                |
| `ScenarioDefinition.from` and base inheritance/`extends`       | scenario-owned `setup` and fully materialized `given` commands                                                            |
| imperative `when(ctx)` with a mutable submit API               | serializable typed `when` commands followed by read-only `then` assertions                                                |
| authored/runtime player IDs                                    | `ScenarioSeatRef` at actors and semantically marked player-valued parameter leaves                                        |
| `patchState`, snapshot hydration, main-runtime test submission | accepted `given`/`when` commands and isolated clone-only `probe(command)`                                                 |
| `createTestRuntime` and fingerprint trust options              | one SDK `ScenarioReplay` implementation and separate `assertScenario`                                                     |
| candidate-verification `bases` input                           | `{ reducer, scenarios, maxScenarios?, maxStepsPerScenario? }`                                                             |
| CLI `generateReducerNativeArtifacts` prerequisite              | recursive scenario loading and direct canonical replay/assertion                                                          |
| scaffolded `test/bases` and `test/generated`                   | `test/testing-types.ts` plus one normal-setup scenario                                                                    |
| base counts in exact/agent verification                        | structured scenario paths, source digests, SDK version, and replay results                                                |
| checkout-path-dependent proof identity                         | path-independent SHA-256 over the evaluated local TypeScript module closure; external SDK identity is recorded separately |

The CLI evaluates the game, scenario, assertion helpers, and SDK testing
runtime in one synthetic bundle. This is required because semantic schema
families use runtime identity and must not be split across duplicate SDK
instances.

## Verification evidence

### `dreamboard-sdk`

| Command                                                                                         | Result                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm --filter @dreamboard-games/sdk typecheck`                                                 | passed, including the negative/positive testing contract type project        |
| `pnpm --filter @dreamboard-games/sdk test`                                                      | 591 passed, 0 failed, 20 snapshots                                           |
| `pnpm --filter @dreamboard-games/workspace-codegen exec bun test src/manifest-contract.test.ts` | 23 passed, 0 failed, 233 assertions                                          |
| `pnpm --filter @dreamboard-games/sdk build`                                                     | passed; existing DTS circular-reexport warnings remained non-fatal           |
| `pnpm pack:consumer-check`                                                                      | passed; 20 JavaScript subpaths and one CSS export imported from a packed SDK |
| `git diff --check`                                                                              | passed                                                                       |

Focused replay proof includes setup/given/when command-count checkpoints,
semantic player-leaf resolution, deterministic RNG consumption, precise
wrong-actor and later-phase rejection locations, accepted/rejected probe
isolation, and full-replay-only assertions.

### `dreamboard` against the exact tarball

| Command or proof                           | Result                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --dir apps/dreamboard-cli typecheck` | passed while the installed SDK resolved to the file candidate                                                                                           |
| `pnpm --dir apps/dreamboard-cli test`      | passed in the temporarily aligned alpha.8 release set, including staged published-package smoke                                                         |
| `pnpm --dir apps/dreamboard-cli run build` | passed while the installed SDK resolved to the file candidate                                                                                           |
| six focused CLI suites                     | 35 passed, 0 failed, 80 assertions after restoring the alpha.7 source pin                                                                               |
| real scenario service proof                | `candidate.increment`: 1 passed, 0 failed; SDK `0.4.0-alpha.8`; source digest `sha256:5dbe31b05da80d933246526d3478e39bd0323a639092fddd6844bfaec566787f` |
| plain source CLI proof                     | `dreamboard test --scenario test/scenarios/increment.scenario.ts` printed one PASS and exited 0                                                         |
| `git diff --check`                         | passed                                                                                                                                                  |

The real proof used a normal two-player manifest, normal seeded setup, one
typed `increment` command, and a projected-view assertion. It did not use the
fixture SDK from the loader unit tests.

## Remaining reference-game migration inventory

Phase 01 deliberately did not translate old reference-game scenarios through a
compatibility adapter. The following complete test subtrees still require
game-by-game rule-authoritative migration in Phases 02 through 05, followed by
generated-output deletion in Phase 06:

| Game                         | Awaiting migration                                              | Current files |
| ---------------------------- | --------------------------------------------------------------- | ------------: |
| Automa River Rival           | `examples/reference-games/automa-river-rival/test/**`           |            13 |
| Gallery Engine               | `examples/reference-games/deck-building-market/test/**`         |            38 |
| Hearts                       | `examples/reference-games/hearts/test/**`                       |            20 |
| Stormtrail                   | `examples/reference-games/hex-network-trading/test/**`          |            63 |
| Multiplayer Ranking And Ties | `examples/reference-games/multiplayer-ranking-and-ties/test/**` |            10 |
| Cloudline Survey             | `examples/reference-games/roll-and-write-scorecard/test/**`     |            17 |
| Simultaneous Card Drafting   | `examples/reference-games/simultaneous-card-drafting/test/**`   |            26 |
| Solo Countdown Puzzle        | `examples/reference-games/solo-countdown-puzzle/test/**`        |            13 |
| Mosaic Guilds                | `examples/reference-games/worker-placement-tableau/test/**`     |            68 |

This inventory includes old bases, checked generated states/projections,
legacy scenario shapes, helper-only characterization files, UI-scenario
imports, and Mosaic screenshots. Files are removed only after their owning
consumer has moved. All nine isolated-consumer `pnpm-lock.yaml` files remain.

## Hard-cut confirmation

- No base compatibility adapter was added.
- No test state mutation, snapshot hydration, hidden runner, or test-only setup
  profile was added.
- Scenario commands contain data only; assertions remain executable source and
  are included in the source-closure digest.
- Candidate verification and the public CLI call the same SDK replay/assertion
  primitives.
- `probe` always dispatches on a fresh clone and cannot mutate the authoritative
  replay checkpoint or a sibling probe.
- `dev --from-scenario` fails immediately and actionably until Phase 02 replaces
  the old snapshot path with normal backend setup and accepted prefix replay.
- The integration branch remains non-publishable and non-mergeable until the
  nine games and later cross-repository consumers complete the hard cut.

No Phase 01 STOP condition was encountered.
