# Phase 00: Representative Briefs And Characterization Baseline

Status: source baseline implemented on 2026-06-18.

## Objective

Replace keyword-led capability selection with a public-safe corpus of concrete
designer jobs, and measure how the current SDK handles them before adding API.

No framework behavior changes in this phase.

## User Outcome

An implementation team can point to a representative rules brief and answer:

- which existing SDK concepts implement it;
- where game-local glue is required;
- where the framework genuinely blocks implementation;
- which later phase owns the missing capability; and
- what executable proof will show the gap is closed.

## Deliverables

Create:

```text
docs/capability-research/competition-game-authoring/
  README.md
  brief.schema.json
  capability-matrix.yaml
  briefs/
    roll-and-write-scorecard-01.yaml
    multiplayer-ranking-and-ties-01.yaml
    solo-countdown-puzzle-01.yaml
    automa-river-rival-01.yaml
    ...at least eight additional briefs
scripts/capability/check-competition-game-briefs.mjs
```

The corpus is an implementation input, not product telemetry. It must contain
mechanic summaries written for this repository, not copied rules text.

## Brief Contract

Use a small machine-readable schema so capability decisions can be checked for
completeness and drift.

```yaml
id: roll-and-write-scorecard-01
title: Dice-driven roll-and-write scorecard
source:
  kind: original
  rights: public-safe-original
players:
  min: 1
  max: 4
authorJobs:
  - roll seeded dice
  - select one legal square
  - show why other squares are blocked
  - total marked regions at game end
uiJobs:
  - render at 390px width without horizontal scrolling
  - support pointer and keyboard activation
authorityJobs:
  - reject marks outside the rolled value
  - reproduce the same roll and result from the same seed
acceptance:
  - no custom target protocol
  - final result contains every player
formatNotes:
  compactMobile: true
  optionalPhysicalNotes:
    - two dice
    - player-supplied writing marker
```

Required schema fields:

- stable `id`;
- original/anonymized source classification and rights declaration;
- player count;
- author jobs;
- UI jobs;
- authority jobs;
- executable acceptance statements; and
- optional notes describing intentional exclusions.

`formatNotes` is optional research metadata. Validators and capability decisions
must not require component counts, print dimensions, or carrier relationships.

Reject entries that name a commercial game, copy rulebook prose, depend on
third-party art, or omit rights classification.

## Representative Mix

The first corpus must cover at least:

- roll-and-write marking;
- solo puzzles without an opponent identity;
- deterministic automa rivals;
- multiplayer ranking and ties;
- shared and per-player markable surfaces;
- card selection, board-space selection, dice, tracks, and resource costs;
- simultaneous and sequential play;
- score and non-score victory conditions;
- tied winners and deterministic tie-breaks;
- setup variants;
- hidden information;
- mobile-width presentation; and
- at least two briefs that should need no new framework capability.

The four anchor briefs are mandatory:

| Brief                             | Purpose                                                                                        | Later owner  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------ |
| `roll-and-write-scorecard-01`     | Prove existing square topology plus a generated runtime adapter can express per-player marking | Phase 01     |
| `multiplayer-ranking-and-ties-01` | Force ties, ranking, breakdown, persistence, and end UI                                        | Phases 02-03 |
| `solo-countdown-puzzle-01`        | Prove deterministic environment procedures for one human player                                | Phase 04     |
| `automa-river-rival-01`           | Prove a deterministic rival without a fake participant                                         | Phase 04     |

The anchor briefs must encode the approved rules linked from the
[canonical rule brief index](canonical-game-briefs.md). They may decompose
those rules into machine-readable jobs, but they may not substitute different
games or infer rules from the current implementation.

## Capability Matrix

For every `authorJob`, record one classification:

```yaml
briefId: roll-and-write-scorecard-01
job: select one legal square
classification: ergonomic-gap
canonicalConcepts:
  - square board
  - boardInput.playerSpace
  - Board.surface
  - Board.SquareGrid
evidence:
  - packages/sdk/src/reducer/inputs/boardInput.ts
  - packages/sdk/src/runtime/workspace-contract/board.ts
newCapability: generated runtime-aware square-grid adapter
```

Allowed classifications:

- `native`: current canonical API is sufficient;
- `composition`: current APIs work, but a reusable controlled presentation
  component is justified;
- `ergonomic-gap`: behavior exists but coding-agent diagnostics or generated
  types are inadequate;
- `contract-gap`: a value must cross an existing wire boundary and currently
  cannot;
- `blocked`: no canonical implementation exists.

Every non-`native` entry must identify:

- the exact source boundary;
- the game-local workaround required today;
- why documentation alone is insufficient;
- the proposed owning phase; and
- a falsifiable acceptance test.

## Characterization Baseline

Implement no new framework API. Instead, create focused characterization
spikes under:

```text
packages/sdk/src/testing/competition-characterization/
```

The spikes may use current public APIs and should answer:

1. Can a per-player square board space drive a drafted mark interaction?
2. Can `Board.surface()` bind that target through a generated UI contract?
3. Which terminal result shapes cannot represent ties or breakdowns?
4. Which phase and interaction labels are currently humanized rather than
   authored?
5. Where do outcome and runtime projection fields get stripped in the internal
   host?
6. Can an auto phase reproduce an automated procedure from the same seed?

Delete any spike that becomes redundant when its owning phase lands. Retain
only tests that protect a discovered invariant.

## Metrics

For each anchor brief, record:

- number of new public framework concepts required;
- number of game-local runtime adapters;
- number of game-local visual wrappers;
- number of untyped string identifiers at authored call sites;
- whether a failed action identifies the governing rule;
- whether all behavior replays from a fixed seed;
- whether the UI works at 390x844;
- whether a packed consumer can compile it; and
- whether real-host transport preserves every required field.

The target is not zero lines of game code. The target is zero duplicated
framework concepts and zero silent contract loss.

## Implementation Sequence

1. Add the schema and validator script.
2. Write the four anchor briefs.
3. Add at least eight more briefs to balance the corpus.
4. Build the capability matrix from live source evidence.
5. Add focused current-SDK characterization tests.
6. Record baseline metrics in the research README.
7. Review every proposed later-phase API against at least three briefs.

Do not design Phase 01 APIs until the four anchor briefs and their matrix rows
are reviewed.

## Verification

```bash
mise exec node@24 -- node scripts/capability/check-competition-game-briefs.mjs
mise exec node@24 -- pnpm test
mise exec node@24 -- pnpm check
```

Current source receipt:

- `mise exec node@24 -- node scripts/capability/check-competition-game-briefs.mjs`
  passes with 24 briefs and 83 matrix rows; receipt written to
  `artifacts/capability/competition-game-authoring/brief-check-receipt.json`.
- `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test src/testing/competition-characterization`
  passes; the package script runs the SDK suite and includes the Phase 00
  characterization tests.
- `mise exec node@24 -- pnpm docs:check`, `mise exec node@24 -- pnpm lint`,
  and `mise exec node@24 -- pnpm typecheck` pass.
- `mise exec node@24 -- pnpm test` passes after aligning
  `packages/ui-workbench/tests/driver/semantic-browser-driver.spec.ts` with the
  existing `ReplayStepExecutionError` failure envelope while preserving the
  underlying `SemanticResolutionError` as `cause`.
- `mise exec node@24 -- pnpm check` stops at `format:check` because 53 existing
  reference/generated files outside this phase are not formatted according to
  the current Prettier configuration.

The validator must fail on:

- duplicate IDs;
- missing rights metadata;
- unsupported classification values;
- matrix jobs absent from the referenced brief;
- non-native rows without an owning phase or acceptance test; and
- briefs not referenced by the matrix.

## Exit Criteria

- At least twelve briefs pass schema validation.
- The four anchors have complete capability rows and baseline metrics.
- Every later phase cites the brief jobs that justify its API.
- At least two briefs are explicitly classified as requiring no new runtime
  capability.
- Keyword/topic counts remain background context only and are not used as an
  API acceptance gate.
- No product code or public API changed in this phase.

## Stop Conditions

Stop and revise this plan if:

- the anchor mark-grid brief cannot be expressed with current board targets
  even in a characterization spike;
- evidence shows that most target users directly write SDK code without a
  coding agent, changing the primary SDK persona;
- the corpus requires copyrighted rules or art to be useful; or
- more than one later phase proposes a different canonical concept for the same
  author job.
