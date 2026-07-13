# Phase 04 Outcome And Automa Pilots Receipt

Recorded: 2026-07-13 (Australia/Sydney).

Status: rule conformance and focused source proof are complete. Final
`0.4.0-alpha.9` publication, normalized replay digests, all-nine packed/public
CLI proof, and coordinated Workbench/docs gates remain pending.

## Exact source identity

| Boundary                                                          | Commit                                     |
| ----------------------------------------------------------------- | ------------------------------------------ |
| Harbor Fair and River Guild implementations and acceptance ledger | `c53f81342c85bf7662014fd6c96dcfb745206852` |
| Public replay/source/workspace compilers                          | `c4505c1df653c1b0297c29a79a5f4c72b1047dc9` |
| On-demand Workbench and source-size audit                         | `829ce49302ea530ee49fc3bf18c5ccbd3a6497fe` |
| JSON inspect/explore CLI (`dreamboard`)                           | `898cb2dc100e59e37b3886e486da522efd40cf11` |

The internal compatibility gate passed against the intermediate archive
`dreamboard-games-sdk-0.4.0-alpha.8.tgz`, SHA-256
`1e18fe648fad0f3d8aad880b82eba97df9812eb632ab77a79f756d6e2352674d`.
The final `0.4.0-alpha.9` tarball SHA-256, npm integrity, public availability,
and nine-game repin evidence are pending.

## Rule-acceptance ledgers

Every approved Harbor Fair and River Guild bullet is linked to executable
evidence in
[`phase-04-rule-conformance-ledger.md`](./phase-04-rule-conformance-ledger.md).
The ledger remains descriptive proof and does not define another gameplay
specification.

## Complete-game replay inventory

| Replay                      | Setup             |  Commands | Terminal result                                                              | Normalized replay digest             |
| --------------------------- | ----------------- | --------: | ---------------------------------------------------------------------------- | ------------------------------------ |
| Harbor Fair canonical       | 4 players, seed 2 | 24 drafts | `SIX_ROUNDS_COMPLETE`; six stalls each; winner score 22; ranks 1/2/3/4       | pending final frozen-candidate rerun |
| Harbor Fair supported count | 2 players, seed 2 | 12 drafts | six rounds and a two-standing normal outcome                                 | pending final frozen-candidate rerun |
| Harbor Fair supported count | 3 players, seed 2 | 18 drafts | six rounds and a three-standing normal outcome                               | pending final frozen-candidate rerun |
| River Guild canonical       | 2 humans, seed 1  | 12 claims | `SIX_RIVER_ROUNDS_COMPLETE`; team 24 versus rival 13; both humans rank 1/win | pending final frozen-candidate rerun |
| River Guild solo win        | 1 human, seed 1   |  6 claims | team 13 versus rival 12, win                                                 | pending final frozen-candidate rerun |
| River Guild solo draw       | 1 human, seed 1   |  6 claims | team 12 versus rival 12, draw                                                | pending final frozen-candidate rerun |
| River Guild solo loss       | 1 human, seed 1   |  6 claims | team 9 versus rival 15, loss                                                 | pending final frozen-candidate rerun |

Focused tests already rerun the canonical games from clean setup and compare
their authoritative results. The cross-repository normalized digest is left
pending until it is produced by the frozen release command.

## Outcome and procedure evidence

Harbor Fair executable paths prove:

- numeric winner ordering and exact score components;
- complete-guild-set, then coin, tie-break ordering;
- a true first-place tie and a lower-place tie with competition ranks
  `1,2,2,4`; and
- scoreless `FESTIVAL_CANCELLED` outcomes at initial and final-refill
  boundaries, with no score fields or later scoring event.

River Guild executable paths prove all six rival instructions: unique and
leftmost-tied `claimHighest`; all three `claimKind` kinds across highest, tie,
and absent-kind fallback; and `sweepLeft`. Each round orders public events as
instruction reveal, resolution, river refill, and round advance. The rival is
reducer-owned procedure state: it is absent from player order, actors,
player-targeted APIs, `blockedBy`, and standings. There is no claim ID or
processed-request deduplication model.

## Product checkpoint tuples

| Consumer label      | `{ scenarioPath, at }`                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Harbor opening      | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`                       |
| Harbor growing rows | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 12 } }`                      |
| Harbor terminal     | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 1 } }`                        |
| Harbor cancellation | `{ "test/scenarios/refill-and-cancellation-final-refill.scenario.ts", { "segment": "when", "completed": 1 } }` |
| River opening       | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`                       |
| River early         | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 1 } }`                       |
| River midgame       | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 6 } }`                       |
| River terminal      | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 2 } }`                        |

These labels are consumer-owned UI metadata over authored replay prefixes;
they do not introduce gameplay state.

## Tracked footprint at the game-conformance commit

Counts use Git blobs at `c53f813^` and `c53f813`, with logical LF-delimited
lines and all blob bytes.

| Game root                      | Before paths / lines / bytes | After paths / lines / bytes |
| ------------------------------ | ---------------------------: | --------------------------: |
| `multiplayer-ranking-and-ties` |         47 / 9,354 / 294,063 |        63 / 9,642 / 334,234 |
| `automa-river-rival`           |         38 / 3,050 / 106,493 |        72 / 5,362 / 178,089 |

Generated and base paths remain tracked only for Phase 07's coordinated
deletion.

## Verification and deletion audit

| Gate                                             | Result                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Harbor Fair focused package gate                 | passed; all acceptance rows are `executed-passing`                                                                                                                                                                                   |
| River Guild focused package gate                 | passed; all acceptance rows are `executed-passing`                                                                                                                                                                                   |
| Packed public CLI River inspect/explore          | passed against `@dreamboard-games/cli@0.1.30-alpha.43`: setup, seat handoff, post-rival, both players, and spectator emitted one JSON envelope with empty stderr; each eligible explore returned exactly four current cargo commands |
| Internal exact all-nine packed SDK compatibility | passed against the intermediate SDK archive                                                                                                                                                                                          |
| Workbench deterministic materialization          | passed for 44 fixtures/scenarios; digest `sha256:98b359c21703fa10f6b8d364f131d3893cd5d01c45e88e21d9ed7999676c8f66`                                                                                                                   |
| Final all-nine packed SDK/public CLI gate        | pending final `0.4.0-alpha.9` publication                                                                                                                                                                                            |
| Remaining Workbench build/browser and docs gates | pending final rerun                                                                                                                                                                                                                  |
| Normalized replay comparison                     | pending final frozen-candidate receipt                                                                                                                                                                                               |

Focused source and scenario imports contain no base-state authority, state
patch, injected deck/instruction order, legacy scenario adapter, or fake rival
player. Legacy generated/base bytes are unused and deletion-ready. No Phase 04
STOP condition has been encountered.
