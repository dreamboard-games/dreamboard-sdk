# Phase 02 JSON Inspect/Explore And Cloudline Pilot Receipt

Recorded: 2026-07-13 (Australia/Sydney).

Status: implementation checkpoint complete; coordinated Workbench and live
backend closure remain open until the later cross-repository cutover described
below. This receipt does not represent staging or production proof.

## Exact Source And Package Identity

| Boundary | Identity |
| --- | --- |
| SDK implementation commit | `4850e06` (`feat: add agent-first scenario inspection`) |
| Public Dreamboard implementation commit | `898cb2d` (`feat(cli): add JSON scenario inspect and explore`) |
| Exact SDK candidate | `/private/tmp/dreamboard-sdk-phase02-final.ZzGw4k/dreamboard-games-sdk-0.4.0-alpha.8.tgz` |
| Candidate SHA-256 | `a23ddfc4e6d87ce0b9139e543c4e8f3a7f5f8e60bf8be638e67d6f249f5be5f7` |
| SDK package version | `0.4.0-alpha.8` |
| Reducer contract version | `0.4.0` |

The Cloudline and public CLI test installations resolved the isolated unpacked
candidate corresponding to that tarball. The packed-consumer gate separately
installed a fresh tarball and imported all 20 published JS subpaths plus the
CSS export.

## Frozen Agent Contract

There is one persistent executable format: a typed scenario file with normal
setup, `given`, `when`, and `then`. `inspect` observes a replay prefix and
`explore` enumerates accepted commands from that same prefix. Neither command
writes source or persistent state.

The test family emits one schema-version-2 `CommandResult` JSON object and one
trailing newline to stdout by default. Recognized success and failure leave
stderr empty. `--json` is a byte-identical redundant spelling;
`--json-events` is rejected because the family is not a stream. Help remains a
normal usage surface and no `--format` option exists.

The CLI now locates the nearest reducer-native package containing
`package.json` and `app/game.ts`, so agents can run the same commands directly
inside an isolated reference game without creating `.dreamboard/project.json`.
A configured Dreamboard project remains supported through the existing project
context path.

## Result Examples

Plain test result:

```json
{"schemaVersion":2,"ok":true,"command":"test","result":{"schemaVersion":1,"summary":{"total":1,"passed":1,"failed":0},"scenarios":[{"id":"cloudline.complete-game","path":"test/scenarios/complete-game.scenario.ts","status":"passed"}]},"nextActions":[]}
```

Cloudline setup inspection, reduced to the contract-bearing fields:

```json
{
  "schemaVersion": 2,
  "ok": true,
  "command": "test.inspect",
  "result": {
    "schemaVersion": 1,
    "scenario": {
      "id": "cloudline.complete-game",
      "path": "test/scenarios/complete-game.scenario.ts",
      "sourceDigest": "sha256:d2b10cc3122d83d64e750fefcccbb8e6253f8f7f47ae52cfabe7286d9cec25b3"
    },
    "node": {
      "checkpoint": { "segment": "setup", "completed": 0 },
      "checkpointDigest": "sha256:80d2a3378159d3e89483148c49bb7915a044c9880696aee5b252cb62b1388557",
      "flow": {
        "phase": "markSurvey",
        "step": null,
        "activeActors": [{ "seat": 0, "playerId": "player-1" }],
        "pendingActors": [],
        "continuationWaiters": [],
        "blockedBy": []
      },
      "actions": [
        {
          "actor": { "seat": 0, "playerId": "player-1" },
          "interactionId": "markCell",
          "inputs": [{ "key": "cell", "kind": "board-space", "eligibleCount": 2 }],
          "hasConcreteCommand": true
        }
      ],
      "entropy": {
        "seed": 3,
        "draws": [
          { "index": 0, "cursorBefore": 0, "cursorAfter": 1, "operation": { "kind": "integer", "parameters": { "minInclusive": 1, "maxInclusive": 6 } } },
          { "index": 1, "cursorBefore": 1, "cursorAfter": 2, "operation": { "kind": "integer", "parameters": { "minInclusive": 1, "maxInclusive": 6 } } }
        ]
      }
    },
    "seedSource": "scenario"
  },
  "nextActions": []
}
```

Transition exploration returned two canonical commands. Each was dispatched on
a fresh clone and then replayed unchanged as an authored command:

```json
{
  "schemaVersion": 1,
  "mode": "transitions",
  "candidates": [
    {
      "ordinal": 0,
      "command": {
        "actor": { "seat": 0 },
        "interactionId": "markCell",
        "params": {
          "cell": {
            "boardId": "survey-grid",
            "playerId": { "seat": 0 },
            "spaceId": "cell-1-0"
          }
        }
      },
      "after": {
        "checkpointDigest": "sha256:f7fe2018681e62a3bdcf6bc385a0362dac0cdd613f75d444daeb665011263313"
      }
    },
    {
      "ordinal": 1,
      "command": {
        "actor": { "seat": 0 },
        "interactionId": "markCell",
        "params": {
          "cell": {
            "boardId": "survey-grid",
            "playerId": { "seat": 0 },
            "spaceId": "cell-2-3"
          }
        }
      },
      "after": {
        "checkpointDigest": "sha256:bfee96aee4d8714603134fd1be4eb7aef2826f0dcdad630c7225e1c024e22fbb"
      }
    }
  ],
  "omissions": [],
  "page": { "limit": 2, "evaluated": 4, "truncated": false, "nextCursor": null }
}
```

Seed exploration is generic rather than dice-specific. The same endpoint is
used for shuffled decks and any other reducer-owned entropy:

```json
{
  "schemaVersion": 1,
  "mode": "seeds",
  "checkpoint": { "segment": "setup", "completed": 0 },
  "variants": [
    { "seed": 1, "status": "replayed", "signature": { "phase": "markSurvey", "step": null, "actions": [{ "seat": 0, "interactionId": "markCell", "concreteOptionCount": 1 }] } },
    { "seed": 2, "status": "replayed", "signature": { "phase": "markSurvey", "step": null, "actions": [{ "seat": 0, "interactionId": "markCell", "concreteOptionCount": 2 }] } },
    { "seed": 3, "status": "replayed", "signature": { "phase": "markSurvey", "step": null, "actions": [{ "seat": 0, "interactionId": "markCell", "concreteOptionCount": 2 }] } }
  ]
}
```

## Stable Failure Examples

Every line below is the minimal stable portion of an independently asserted
process envelope. All include `schemaVersion: 2`, `ok: false`, empty
`nextActions`, exactly one stdout newline, and empty stderr. Validation exits
with 5, a stale cursor exits with 4, and an unexpected recognized-family error
exits with 1.

```jsonl
{"command":"test.inspect","problem":{"code":"TEST_SCENARIO_NOT_FOUND","context":{"requestedPath":"test/scenarios/missing.scenario.ts"}},"exitCode":5}
{"command":"test","problem":{"code":"TEST_SCENARIO_DUPLICATE_ID","context":{"scenarioId":"fixture.increment","firstPath":"test/scenarios/duplicate.scenario.ts","secondPath":"test/scenarios/increment.scenario.ts"},"data":{"scenarioId":"fixture.increment","paths":["test/scenarios/duplicate.scenario.ts","test/scenarios/increment.scenario.ts"]}},"exitCode":5}
{"command":"test","problem":{"code":"TEST_SCENARIO_INVALID","context":{"path":"test/scenarios/increment.scenario.ts","fieldPath":"setup.players"}},"exitCode":5}
{"command":"test.inspect","problem":{"code":"TEST_CHECKPOINT_INVALID","context":{"requestedNode":"given:1","givenMaximum":0,"whenMaximum":0}},"exitCode":5}
{"command":"test.inspect","problem":{"code":"TEST_SCENARIO_REPLAY_REJECTED","context":{"segment":"given","sourceIndex":0,"interactionId":"increment","errorCode":"COUNT_TOO_LARGE"}},"exitCode":5}
{"command":"test","problem":{"code":"TEST_SCENARIOS_FAILED","context":{"total":1,"failed":1},"data":{"schemaVersion":1,"summary":{"total":1,"passed":0,"failed":1},"scenarios":[{"id":"fixture.rejected","path":"test/scenarios/increment.scenario.ts","status":"failed","failure":{"code":"TEST_SCENARIO_REPLAY_REJECTED","context":{"segment":"given","sourceIndex":0,"interactionId":"increment","errorCode":"COUNT_TOO_LARGE"}}}]}},"exitCode":5}
{"command":"test.inspect","problem":{"code":"TEST_PERSPECTIVE_INVALID","context":{"requestedPerspective":"player:1","maximumPlayerSeat":0}},"exitCode":5}
{"command":"test.explore","problem":{"code":"TEST_SEED_RANGE_INVALID","context":{"requestedRange":"1:65","maximumWidth":64}},"exitCode":5}
{"command":"test.explore","problem":{"code":"TEST_EXPLORE_CURSOR_STALE","context":{"authority":"sourceDigest"}},"exitCode":4}
{"command":"test.explore","problem":{"code":"TEST_EXPLORE_LIMIT_INVALID","context":{"option":"limit","requested":201,"maximum":200}},"exitCode":5}
{"command":"test.explore","problem":{"code":"TEST_JSON_EVENTS_UNSUPPORTED","context":{"requestedMode":"json-events"}},"exitCode":5}
{"command":"test","problem":{"code":"TEST_UNEXPECTED","context":{"category":"scenario-loading"}},"exitCode":1}
```

Messages remain intentionally non-authoritative. Agents branch on code and
typed context/data. Loader, assertion, and replay exceptions were each proven
to redact stack traces and private exception text behind `TEST_UNEXPECTED`.

## Cloudline Rule Proof

| Approved obligation | Executable proof | Result |
| --- | --- | --- |
| Normal setup uses real seeded 2d6 | `app/phases/roll.ts`; structured-entropy test | two `random.integer(1..6)` draws per round |
| Same seed and path reproduce | two independent replays plus two-process receipt digest | identical state, views, events and normalized digest |
| One through four players and strict seat order | four `seat-order-*.scenario.ts` files | pass |
| Every board is public | all three player inspections at live `given:3` | identical public state and `marksByPlayer` |
| Multiple, one and no match branches | three focused scenarios | pass |
| Reducer chooses surveyed/failed | match and fallback scenario assertions | pass |
| Wrong actor, board and cell rejection | `legality-probes.scenario.ts` clone probes | `NOT_YOUR_TURN`, `PLAYER_NOT_ACTIVE`, `CELL_DOES_NOT_MATCH_ROLL`, `CELL_ALREADY_MARKED` |
| Scoring | `test/unit/scoring.test.ts` | rows, columns, orthogonal region, diagonal exclusion and failure penalty pass |
| Unique/tied/lower/solo outcomes | complete, tied and solo scenarios plus pure ranking edges | pass |
| Complete eight-round normal game | three-player and solo complete-game scenarios | pass |
| Desktop/mobile source checkpoints | four UI scenarios | module/type proof passes; shared browser gate remains deferred below |

The package gate ran 19 behavior/unit tests and four UI scenario modules. Pure
score/connectivity tests construct typed algorithm inputs only; they do not
hydrate reducer state or substitute for the complete reducer replay.

## Complete-Game Trace

`cloudline.complete-game` uses three players, seed 3, 21 `given` commands and
three `when` commands.

| Round | Dice | Total | Cumulative structured draws |
| ---: | --- | ---: | ---: |
| 1 | 5, 1 | 6 | 2 |
| 2 | 3, 6 | 9 | 4 |
| 3 | 1, 4 | 5 | 6 |
| 4 | 6, 4 | 10 | 8 |
| 5 | 2, 1 | 3 | 10 |
| 6 | 4, 2 | 6 | 12 |
| 7 | 4, 3 | 7 | 14 |
| 8 | 1, 3 | 4 | 16 |

The game ends in `gameOver` with exactly eight marks per player, scores
`14 / 4 / 4`, and standings `rank 1 win / rank 2 loss / rank 2 loss`. The solo
complete game also consumes 16 draws and ends with score 14 and rank-1 win. A
separate legal two-player replay proves a rank-1 draw.

Two fresh process transcripts over the complete path produced normalized
SHA-256
`1e86ceb0415b81bdd6e51c8e103c53717e7b0c837dfe945c00b9843a112edebd`.

## Seed Discovery

The branch-discovery command was:

```bash
dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup --seed-range 1:64
```

- Seed 1 produces `[4, 4] = 8` and one matching target.
- Seed 3 produces `[5, 1] = 6` and two matching targets.

Fallback discovery used the no-match scenario at `given:3`. Seed 1 produces
`[2, 6] = 8` after the only 8-cell was already marked, so exploration returns
all 13 remaining cells as structured, replay-accepted board commands.

No roll matrix, fixed result table, injected random stream, state patch, or
test-only branch profile was added.

## Scheduler And Privacy Proof

The production seat projection carries a versioned `schedulerFlow` containing
only active IDs, pending IDs and causal continuation dependencies. Inspect
orders identities by seat, filters unknown identities, rejects self-edges, and
omits uncertain dependencies.

Cloudline's ordinary turn therefore reports one active actor and empty pending,
waiter and blocker arrays. SDK integration fixtures additionally prove a
targeted response and a simultaneous sealed barrier. Later games consume those
same generic shapes; games do not author `blockedBy`.

Player and spectator inspection is perspective-scoped. The CLI never combines
views or serializes the private reducer snapshot. Structured entropy describes
draw indices and operation parameters but omits sampled values. Scheduler actor
identities and operation identities are universally public in schema version
1; any future secret-participation game requires a versioned redaction design
rather than overloading this schema.

## Dev Materialization

Focused public-CLI tests prove that `dreamboard dev --from-scenario`:

1. performs normal backend setup with scenario players, seed and setup profile;
2. replays only the selected accepted prefix through normal dispatch;
3. resolves seat and nested player references to runtime IDs;
4. compares every player projection at setup and after every command; and
5. reports the exact source command and both digests on first divergence.

The current backend response does not yet expose the new generic
`schedulerFlow`; ordinary-turn Cloudline parity is lossless through its legacy
active-player fields, while targeted/simultaneous backend flow parity is part
of the Phase 07 internal contract cutover. A live local backend session was not
started for this checkpoint because the coordinated local-stack release is a
required later phase gate. This receipt therefore does **not** claim the final
local-versus-backend browser digest proof.

## Source Size At This Checkpoint

Phase 02 intentionally retained workspace-generated and old generated fixture
paths until downstream consumers are cut over. Consequently the tracked game
root grew while the authored complete-game proof was added:

| Commit | Paths | Logical lines | Blob bytes |
| --- | ---: | ---: | ---: |
| Phase 01 `1c59f02` | 49 | 20,242 | 608,530 |
| Phase 02 `4850e06` | 52 | 23,786 | 678,368 |

This is not the final size result. Phase 06 makes generation on-demand and
Phase 07 deletes tracked workspace/test output under the strict 75,000-line
nine-game budget while retaining all nine lockfiles.

## Verification

| Gate | Result |
| --- | --- |
| reducer-contract generate check, typecheck, 90 tests | pass |
| SDK typecheck, 630 tests, 20 snapshots, build | pass |
| SDK pack consumer (20 JS exports + CSS) | pass |
| Cloudline typecheck, 19 tests, four UI modules | pass |
| Cloudline inspect, transition explore and seed explore from package root | pass |
| Public CLI typecheck, full focused suites and build | pass |
| Public CLI seven process-boundary families / 186 assertions | pass |
| Published CLI package test/inspect/explore smoke | pass |
| Skill-source synchronization | pass and idempotent (`4d80503a...`) |
| Reference-game metadata check | passed before the coordinated Phase 03 edits; rerun at repository closeout |
| Shared Workbench fixtures/browser | deferred: legacy games still import the retired base runtime; Phase 07 regenerates all nine together |
| Live backend/browser digest | deferred to required Phase 07 local-stack publication gate |

No dice-specific framework branch, authored decision field, authored
`requiredActions`, authored `blockedBy`, base state, snapshot hydration, state
patch, or second scenario format was introduced.
