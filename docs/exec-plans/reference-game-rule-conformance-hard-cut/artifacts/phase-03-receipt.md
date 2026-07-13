# Phase 03 Scheduler-Shape Pilots Receipt

Recorded: 2026-07-13 (Australia/Sydney).

Status: rule conformance and focused source proof are complete. The final
`0.4.0-alpha.9` package, all-nine public-CLI perspective sweep, coordinated
Workbench gates, and documentation gates remain pending. This is therefore an
implementation receipt, not yet the Phase 03 merge-closeout receipt.

## Exact source identity

| Boundary                                   | Commit                                                    | Scope                                                                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference-game implementations and ledgers | `c53f81342c85bf7662014fd6c96dcfb745206852`                | Lantern Market, Last Light, and Stormtrail rule-authoritative implementations, legal-replay scenarios, UI checkpoints, and deletion-readiness changes, committed together with the other Phase 03-05 games. |
| Public authoring/compiler framework        | `c4505c1df653c1b0297c29a79a5f4c72b1047dc9`                | `CompiledScenarioReplay`, source manifest v3, workspace materializer, and the public compiler facades.                                                                                                      |
| On-demand Workbench                        | `829ce49302ea530ee49fc3bf18c5ccbd3a6497fe`                | Temporary-root fixture/catalog materialization and source-size audit tooling.                                                                                                                               |
| Public inspect/explore CLI                 | `898cb2dc100e59e37b3886e486da522efd40cf11` (`dreamboard`) | JSON-only `test inspect` and `test explore`.                                                                                                                                                                |

The combined pre-publication SDK archive used by the internal compatibility
test was
`/tmp/dreamboard-sdk-phase06-candidate-v2/dreamboard-games-sdk-0.4.0-alpha.8.tgz`
with SHA-256
`1e18fe648fad0f3d8aad880b82eba97df9812eb632ab77a79f756d6e2352674d`.
That archive proves the pre-publication adapter contract only. It is not the
final Phase 03 public candidate.

| Final release field       | Value                                        |
| ------------------------- | -------------------------------------------- |
| Public SDK version        | `0.4.0-alpha.9` planned; publication pending |
| Final tarball path        | pending                                      |
| Final tarball SHA-256     | pending                                      |
| npm integrity             | pending                                      |
| Nine isolated-game repins | pending                                      |

## Rule-acceptance ledgers

All approved bullets are mapped to executable evidence in
[`phase-03-rule-conformance-ledger.md`](./phase-03-rule-conformance-ledger.md).
The ledger has complete sections for Lantern Market, Last Light, and
Stormtrail; no rule IDs, `covers` metadata, or game-authored obligation fields
were introduced.

## Complete-game replay inventory

| Game and replay                            | Setup                    | Accepted commands | Terminal proof                                                                | Normalized replay digest             |
| ------------------------------------------ | ------------------------ | ----------------: | ----------------------------------------------------------------------------- | ------------------------------------ |
| Lantern Market `complete-game.scenario.ts` | 2 players, seed 7        |                24 | Two six-pick rounds, scores 21-18, `TWO_ROUNDS_COMPLETE`                      | pending final frozen-candidate rerun |
| Lantern Market supported-count family      | 2/3/4/5 players, seed 29 |       24/36/48/60 | Twelve picks per player and `gameOver` at every supported count               | pending final frozen-candidate rerun |
| Last Light win                             | 1 player, seed 3         |                 7 | All three beacons fully lit; `ALL_BEACONS_LIT` before later weather/countdown | pending final frozen-candidate rerun |
| Last Light storm loss                      | 1 player, seed 4         |                 8 | Squall effects settle before `STORM_REACHED_LIGHTHOUSE`                       | pending final frozen-candidate rerun |
| Last Light dawn loss                       | 1 player, seed 3         |                 8 | Weather settles before countdown reaches zero and `DAWN_ARRIVED`              | pending final frozen-candidate rerun |
| Stormtrail `complete-game.scenario.ts`     | 3 players, seed 1        |               111 | 32 turns; player 2's fourth camp immediately publishes `FOURTH_CAMP_BUILT`    | pending final frozen-candidate rerun |

Each focused determinism test reruns from normal setup and compares the
authoritative state, projections, events, or checkpoint identity required by
its rule bullet. The receipt leaves the cross-game normalized digest blank
until it is captured against the frozen public candidate.

## Scheduler and action-discovery proof

| Shape                       | Executed evidence                                                                                                                                                                     | Final JSON artifact digest     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Sealed simultaneous barrier | Lantern commitments expose actions only to uncommitted actors; committed actors become continuation waiters blocked by the remaining actors; the final commitment reveals atomically. | pending final public-CLI sweep |
| Automatic solo procedures   | Last Light exposes the sole player during `playerTurn`; weather/countdown settle with empty active, pending, waiter, and blocker arrays and no environment identity.                  | pending final public-CLI sweep |
| Ordinary turn               | Stormtrail setup, roll, and main checkpoints expose actions only to the current actor.                                                                                                | pending final public-CLI sweep |
| Multi-actor discard barrier | Stormtrail derives pending discard actors and the turn-owner waiter, excludes self-edges, and exposes each private discard only in its owner's perspective.                           | pending final public-CLI sweep |
| Targeted bilateral response | Stormtrail exposes only accept/reject to the target and derives the offeror-to-target blocker edge; the third player is absent.                                                       | pending final public-CLI sweep |

The focused scenario tests replay every explored command through the same SDK
runner. No `decision`, `requiredActions`, game-authored `blockedBy`, or other
obligation annotation exists in these games.

## Product checkpoint tuples

| Consumer label               | `{ scenarioPath, at }`                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lantern opening              | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`                                                                            |
| Lantern mid-round            | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 9 } }`                                                                            |
| Lantern round transition     | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 12 } }`                                                                           |
| Lantern terminal             | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 2 } }`                                                                             |
| Last Light initial           | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`                                                                            |
| Last Light developing puzzle | `{ "test/scenarios/complete-game-loss-storm.scenario.ts", { "segment": "given", "completed": 7 } }`                                                                 |
| Last Light reinforcement hit | `{ "test/scenarios/weather-procedure-north-squall-reinforced.scenario.ts", { "segment": "given", "completed": 1 } }`                                                |
| Last Light terminal          | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 6 } }`, followed by the consumer-owned `repairBeacon(beacon-south)` replay action |
| Stormtrail setup             | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "setup", "completed": 0 } }`                                                                            |
| Stormtrail production        | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 7 } }`                                                                            |
| Stormtrail growing network   | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "given", "completed": 85 } }`                                                                           |
| Stormtrail terminal          | `{ "test/scenarios/complete-game.scenario.ts", { "segment": "when", "completed": 1 } }`                                                                             |

Discard-barrier and pending-trade Workbench entries deliberately point to
their legal branch scenarios rather than synthesized state.

## Tracked footprint at the game-conformance commit

Counts are computed from Git blobs at `c53f813^` and `c53f813`. A logical line
is each LF-delimited line plus one non-empty final unterminated line; bytes
include binary objects. Phase 06's classified audit is the source-size
authority.

| Game root                    | Before paths / lines / bytes | After paths / lines / bytes |
| ---------------------------- | ---------------------------: | --------------------------: |
| `simultaneous-card-drafting` |        70 / 21,101 / 606,684 |       85 / 18,782 / 591,222 |
| `solo-countdown-puzzle`      |        45 / 10,115 / 319,228 |       63 / 11,146 / 363,737 |
| `hex-network-trading`        |     125 / 80,942 / 2,433,904 |    101 / 68,101 / 2,072,796 |

The large residual line counts are tracked generated/base output retained for
the coordinated Phase 07 deletion, not execution authority.

## Verification and deletion audit

| Gate                                                | Result                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Three focused package scenario matrices             | passed; evidence is recorded per bullet in the Phase 03 ledger                                                     |
| Internal exact all-nine packed SDK compatibility    | passed against the intermediate archive above; 19 Gradle tasks succeeded                                           |
| Workbench deterministic materialization             | passed for 44 fixtures/scenarios; digest `sha256:98b359c21703fa10f6b8d364f131d3893cd5d01c45e88e21d9ed7999676c8f66` |
| Final `reference-games:test:packed --required`      | pending final `0.4.0-alpha.9` archive                                                                              |
| Final inspect/explore perspective sweep             | pending final public CLI/SDK pair                                                                                  |
| Remaining Workbench build/required-UI/browser gates | pending final rerun                                                                                                |
| Documentation gates                                 | pending final rerun                                                                                                |

Focused source and scenario imports show no base, generated snapshot, state
patch, injected dice/deck/weather order, or test-only setup profile in the
execution path. Legacy `test/bases/**` and `test/generated/**` bytes remain
tracked but unused and deletion-ready for Phase 07. No Phase 03 STOP condition
has been encountered.
