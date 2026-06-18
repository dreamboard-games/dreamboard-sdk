# Competition Game Authoring Capability Research

Status: Phase 00 baseline for
`docs/exec-plans/competition-game-authoring-capability-hard-cut/`.

This corpus replaces keyword-led capability selection with concrete,
public-safe authoring jobs. It is an implementation input, not telemetry. Every
brief is original or anonymized, every capability row points at current source
evidence, and non-native rows identify the later phase that owns the gap.

## Files

- `brief.schema.json` defines the machine-readable brief contract.
- `briefs/*.yaml` contains the current JSON-compatible YAML brief corpus
  (at least twelve briefs).
- `capability-matrix.yaml` maps every `authorJobs` entry to current SDK
  evidence and a capability classification.
- `scripts/capability/check-competition-game-briefs.mjs` validates duplicate
  IDs, rights metadata, matrix coverage, non-native row evidence, and corpus
  coverage.

## Anchor Baseline Metrics

| Brief                             | New public framework concepts required | Game-local runtime adapters today | Game-local visual wrappers today | Untyped string identifiers at authored call sites | Failed action identifies governing rule | Fixed-seed replay | 390x844 UI target | Packed consumer compile | Real-host field preservation |
| --------------------------------- | -------------------------------------: | --------------------------------: | -------------------------------: | ------------------------------------------------: | --------------------------------------- | ----------------- | ----------------- | ----------------------- | ---------------------------- |
| `roll-and-write-scorecard-01`     |                                      1 |                                 1 |                                1 |                                                 2 | partial                                 | expected          | required          | Phase 01 proof          | not yet proved               |
| `multiplayer-ranking-and-ties-01` |                                      1 |                                 0 |                                1 |                                                 2 | partial                                 | expected          | required          | Phase 02 proof          | not yet proved               |
| `solo-countdown-puzzle-01`        |                                      1 |                                 0 |                                1 |                                                 2 | partial                                 | expected          | required          | Phase 04 proof          | not yet proved               |
| `automa-river-rival-01`           |                                      1 |                                 0 |                                1 |                                                 2 | partial                                 | expected          | required          | Phase 04 proof          | not yet proved               |

## Native-Capability Controls

The corpus includes briefs expected to require no new runtime capability:

- `shared-garden-track-01`
- `hidden-role-deduction-01`
- `tile-laying-network-01`
- `card-crafting-market-01`

These rows are intentionally useful controls. If a future phase proposes a new
concept that these briefs can already express with existing boards, cards,
forms, resources, private projection, or setup profiles, the proposal should be
rejected or narrowed.

## Later-Phase Evidence

| Phase    | Brief jobs used as evidence                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 01 | `roll-and-write-scorecard-01`: `select one legal square`                                                                                                              |
| Phase 02 | `multiplayer-ranking-and-ties-01`: ranking, ties, scoreless cancellation; `drafting-scoring-breakdown-01`: score categories; `cooperative-bag-puzzle-01`: team result |
| Phase 03 | `roll-and-write-scorecard-01`: blocked square explanations; `variable-setup-race-01`: current objective guidance                                                      |
| Phase 04 | `solo-countdown-puzzle-01`: deterministic environment events; `automa-river-rival-01`: rival events without fake seats; `dice-worker-scheduler-01`: cleanup events    |

Keyword counts remain background context only. API acceptance requires a brief
job, current-source evidence, and a falsifiable proof path.
