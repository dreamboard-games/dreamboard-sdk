# Phase 05 Remaining Adapted Game Conformance Receipt

Recorded: 2026-07-13 (Australia/Sydney).

Status: Hearts, Sketchbook, and Mosaic Workshop rule conformance and focused
source proof are complete. Final `0.4.0-alpha.9` package evidence, all-nine
packed/public CLI perspectives, coordinated Workbench visual gates, docs, and
normalized replay digests remain pending.

## Exact source identity

| Boundary                                         | Commit                                     |
| ------------------------------------------------ | ------------------------------------------ |
| Three game implementations and acceptance ledger | `c53f81342c85bf7662014fd6c96dcfb745206852` |
| Public replay/source/workspace compilers         | `c4505c1df653c1b0297c29a79a5f4c72b1047dc9` |
| On-demand Workbench and source-size audit        | `829ce49302ea530ee49fc3bf18c5ccbd3a6497fe` |
| JSON inspect/explore CLI (`dreamboard`)          | `898cb2dc100e59e37b3886e486da522efd40cf11` |

The internal compatibility gate passed against the intermediate archive
`dreamboard-games-sdk-0.4.0-alpha.8.tgz`, SHA-256
`1e18fe648fad0f3d8aad880b82eba97df9812eb632ab77a79f756d6e2352674d`.
The final `0.4.0-alpha.9` tarball path, SHA-256, npm integrity, public package
lookup, and nine isolated-game repins are pending.

## Rule-acceptance ledgers

All approved bullets are mapped in
[`phase-05-rule-conformance-ledger.md`](./phase-05-rule-conformance-ledger.md).
The three sections point directly to scenario or permitted pure-test paths and
their exact assertions; no game-authored conformance metadata was added.

## Complete-game replay inventory

| Replay                     | Setup             |            Commands | Terminal result                                           | Current stable digest evidence                                                                         | Normalized replay digest             |
| -------------------------- | ----------------- | ------------------: | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Hearts canonical           | 4 players, seed 1 |                  56 | 13 tricks; ordinary points 15/6/3/2; sole winner player 4 | byte-stable focused rerun                                                                              | pending final frozen-candidate rerun |
| Sketchbook canonical       | 2 players, seed 1 | 362 across 47 turns | `SIMULTANEOUS_SUPPLY_END`; score 42-20                    | terminal checkpoint `sha256:26699c451ebd232020d725859822d72b15bb616019f60fff53073d9dbfc1d464`          | pending final frozen-candidate rerun |
| Mosaic Workshop unique win | 2 players, seed 1 |                  16 | four seasons; `FOUR_SEASONS_COMPLETE`; score 20-0         | terminal `when:8` checkpoint `sha256:66ecfdff26e20227567092082705c219b2aa444f759e979ea174b26c5f69485f` | pending final frozen-candidate rerun |
| Mosaic Workshop draw       | 2 players, seed 1 |                   8 | four all-pass seasons; 0-0 shared rank-1 draw             | entropy-free focused rerun                                                                             | pending final frozen-candidate rerun |

Mosaic's stable seed is part of the common scenario contract; its game consumes
no entropy.

## Privacy and dependent-domain evidence

Hearts focused inspection proves that each player sees only their own
13-card hand and never another hand or a sealed pass selection. Spectator
projections expose only public counts, trick history, and the current trick.
The `playCard` domain enforces two-of-clubs opening, follow suit, first-trick
penalty restrictions, and the hearts-broken lead rule from the authoritative
hand and trick state.

Sketchbook focused inspection proves that opponents and spectators cannot see
hand identities or deck order while public discard and in-play identities
remain visible. Pending Technique inputs are derived from the current card and
authoritative zones: Eraser exposes its legal optional subsets and Studio Visit
only the eligible current top supply cards.

Mosaic Workshop exploration derives complete atomic `placeWorker` commands
from the current worker, occupancy, action-space, exchange, item, and tableau
domains. Opening explore returns 46 commands; the developed checkpoint returns
88, including 24 craft commands representing eight legal item/cell pairs for
three workers. No authored required-action list is involved.

## Product checkpoint tuples

| Consumer label             | `{ scenarioPath, at }`                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Hearts dealt hand          | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`   |
| Hearts sealed pass         | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 2 } }`   |
| Hearts first trick         | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 8 } }`   |
| Hearts mid-hand            | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 32 } }`  |
| Hearts final outcome       | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 1 } }`    |
| Sketchbook opening hand    | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`   |
| Sketchbook first purchase  | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 5 } }`   |
| Sketchbook recycled card   | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 26 } }`  |
| Sketchbook Technique chain | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 62 } }`  |
| Sketchbook depleted supply | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 361 } }` |
| Sketchbook terminal        | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 1 } }`    |
| Mosaic initial             | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`   |
| Mosaic first craft         | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 3 } }`   |
| Mosaic season transition   | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 4 } }`   |
| Mosaic developed tableau   | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 6 } }`    |
| Mosaic worker contention   | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 7 } }`    |
| Mosaic outcome             | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 8 } }`    |

## Tracked footprint at the game-conformance commit

Counts use Git blobs at `c53f813^` and `c53f813`, with logical LF-delimited
lines and all blob bytes.

| Game root                  | Before paths / lines / bytes | After paths / lines / bytes |
| -------------------------- | ---------------------------: | --------------------------: |
| `hearts`                   |        64 / 14,098 / 430,433 |       85 / 13,834 / 447,624 |
| `deck-building-market`     |      96 / 50,456 / 1,486,917 |     97 / 40,663 / 1,369,508 |
| `worker-placement-tableau` |     130 / 39,972 / 2,287,521 |     82 / 27,684 / 1,904,496 |

The remaining generated/base trees and obsolete Mosaic screenshots are not
runtime inputs; their coordinated physical deletion is Phase 07 work.

## Verification and deletion audit

| Gate                                                     | Result                                                                                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Hearts focused package                                   | passed: 26 behavior/domain/privacy tests plus two UI tests                                                                  |
| Sketchbook focused package                               | passed: manifest/app/UI/test typechecks, 22 behavior/domain/privacy tests, and three UI tests                               |
| Mosaic Workshop focused package                          | passed: manifest/app/UI/test typechecks, 16 behavior/unit tests, and eight UI tests                                         |
| Mosaic packed public CLI inspect/explore                 | passed against `@dreamboard-games/cli@0.1.30-alpha.43`; opening 46 candidates, occupied-site 44, developed 88, empty stderr |
| Internal exact all-nine packed SDK compatibility         | passed against the intermediate SDK archive                                                                                 |
| Workbench deterministic materialization                  | passed for 44 fixtures/scenarios; digest `sha256:98b359c21703fa10f6b8d364f131d3893cd5d01c45e88e21d9ed7999676c8f66`          |
| Final all-nine packed SDK/public CLI                     | pending final `0.4.0-alpha.9` publication                                                                                   |
| Remaining Workbench build, required UI, and visual gates | pending final rerun                                                                                                         |
| Documentation gates                                      | pending final rerun                                                                                                         |

The game-conformance commit removed Sketchbook's
`empty-masterpiece-regression` profile, Mosaic's test-only setup profiles, old
mechanics/scenarios, retired Playwright scenario authority, and all
`test:scenarios:generate` execution paths in these packages. Current authored
scenarios import no base or generated state and perform no patching or entropy
injection. `test/bases/**`, `test/generated/**`, and obsolete screenshot bytes
remain tracked only until Phase 07. No Phase 05 STOP condition has been
encountered.
