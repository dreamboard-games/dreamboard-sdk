# Phase 00: Authority, Baseline, And Conformance Ledger

Status: complete

## Objective

Freeze the decisions, repository baselines, consumer graph, rule-conformance
matrix, deletion order, and proof boundaries before changing runtime or game
source.

This phase is read-only except for plan receipts under:

```text
docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/
```

It must not repair a game, regenerate a workspace, delete an artifact, change a
lockfile, or reinterpret an approved rule.

## Entry Criteria

- All nine local `examples/reference-games/*/rule.md` briefs have been approved.
- The plan baseline commit and active branches in all three repositories are
  recorded.
- Existing worktree changes are identified and preserved; no whole-worktree
  cleanup or staging is implied.
- The implementation team accepts that old tests may be broken or vacuous and
  cannot serve as the correctness oracle.

## 00A. Record Exact Repository Baselines

Create `artifacts/baseline.md` with, for each repository:

- absolute path, remote, branch, HEAD, upstream, merge base, and status;
- relevant package versions and lockfile state;
- the exact commands used and their exit codes;
- whether results came from source, a packed package, local integration, CI, or
  a live environment; and
- unrelated dirty files that later phases must not stage or rewrite.

Start with:

```bash
git -C ../dreamboard-sdk status --short
git -C ../dreamboard-sdk branch --show-current
git -C ../dreamboard-sdk rev-parse HEAD
git -C ../dreamboard status --short
git -C ../dreamboard branch --show-current
git -C ../dreamboard rev-parse HEAD
git -C ../internal status --short
git -C ../internal branch --show-current
git -C ../internal rev-parse HEAD
```

Record the SDK planning baseline as
`05509e395bb5b6ec28cac4b7724a649ea9e56988`. The approved rule edits may be
uncommitted at planning time; the execution branch must record the commit that
eventually makes them authoritative.

## 00B. Measure Source And Derived Material

Create `artifacts/source-size-baseline.md`. Reproduce, do not merely copy, the
planning audit:

| Category                          |            Planning measurement |
| --------------------------------- | ------------------------------: |
| Nine game roots                   | 249,319 tracked lines / 8.57 MB |
| Authored source/docs/tests        |          36,378 lines / 1.19 MB |
| Workspace-generated files         |          92,907 lines / 2.62 MB |
| Test-generated states/projections |         103,911 lines / 3.12 MB |
| Nine lockfiles                    |           12,323 lines / 472 KB |
| Workbench reference fixtures      |           26,872 lines / 953 KB |
| Generated Workbench catalog       |                       597 lines |
| Obsolete Mosaic screenshots       |              11 files / 1.17 MB |

The receipt must list the command and tracked path classification for every
file. Classify generated workspace paths from the inventory in:

```text
packages/workspace-codegen/src/ownership.ts
```

Do not classify by filename guesses. Record the largest generated families:

- `*/test/generated/base-states.generated.ts`;
- `*/shared/manifest-static.json`;
- `*/shared/manifest-runtime.ts`;
- `*/test/generated/bases/**/*.projection.json`;
- `*/test/generated/base-state.json`; and
- `*/shared/generated/ui-contract.ts`.

Also record additions relative to the intended PR base. The planning audit
found that reference-game roots plus Workbench fixtures/catalog account for
272,051 of 421,482 additions and that deleting derived workspace, test, and
Workbench output would remove roughly 224,287 additions. Recompute these values
against the real merge base before using them in a PR description.

## 00C. Build The Authority And Consumer Ledger

Create `artifacts/consumer-ledger.md` with one row per producer/consumer seam:

| Producer                     | Artifact/contract                 | Consumers                              | Editable?       | Planned authority              |
| ---------------------------- | --------------------------------- | -------------------------------------- | --------------- | ------------------------------ |
| Local `rule.md`              | game obligations                  | implementation, scenarios, docs        | yes             | authoritative                  |
| Manifest/reducer/views/UI    | runnable game                     | test, dev, Workbench, internal compile | yes             | authoritative source           |
| Scenario TS                  | setup, legal commands, assertions | test, inspect, explore, dev, fixtures  | yes             | authoritative behavioral proof |
| Workspace codegen            | contract/runtime files            | game build and tooling                 | no              | transient derived output       |
| Scenario checkpoint compiler | replay/checkpoint DTO             | dev, Workbench, demo/perf              | no              | transient derived output       |
| Per-game lockfile            | resolved public dependencies      | SDK gates and internal admission       | yes, mechanical | provenance input               |
| Workbench compiler           | fixture bundle/catalog            | Workbench/CI                           | no              | local cache or CI artifact     |

Trace exact code paths, including at least:

```text
dreamboard-sdk/packages/sdk/src/testing/definitions.ts
dreamboard-sdk/packages/sdk/src/testing-runtime.ts
dreamboard-sdk/packages/sdk/src/testing/create-test-runtime.ts
dreamboard-sdk/packages/workspace-codegen/src/ownership.ts
dreamboard-sdk/scripts/reference-games/build-source-manifest.mjs
dreamboard-sdk/scripts/ui/check-reference-games.mjs
dreamboard-sdk/scripts/ui/verify-publishable-reference-games.mjs
dreamboard-sdk/scripts/ui-fixtures/compile-reference-fixtures.mjs
dreamboard-sdk/scripts/ui/open-ui-workbench.mjs
dreamboard/apps/dreamboard-cli/src/commands/test.ts
dreamboard/apps/dreamboard-cli/src/commands/dev.ts
dreamboard/apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.ts
dreamboard/apps/dreamboard-cli/src/machine-output.ts
internal/packages/demo-release-core/
internal/apps/web/
internal/tools/perf/
internal/tools/scenario-author/
```

For internal paths, record the actual files found rather than inventing missing
paths. At planning time internal admission requires each game's
`package.json`/`pnpm-lock.yaml` and resolves the exact public SDK package from
that lock. Runtime demo catalog truth comes from the active demo release, not
an SDK-side list or an editable `demo-gallery` copy.

## 00D. Freeze The Public Concepts

Create `artifacts/decision-receipt.md` containing these decisions verbatim in
meaning, with any implementation naming refinements called out:

1. One self-contained TypeScript scenario is the only persistent behavior-test
   and authoring artifact.
2. `setup`, `given`, `when`, and `then` replace base definitions and `from`.
3. `given` and `when` contain canonical serializable legal commands using
   seat-based actors, interaction IDs, and typed parameters.
4. No base inheritance, checked state snapshot, raw `patchState`, reusable
   arrange layer, or test-only setup profile remains.
5. `dreamboard test` is the single execution command. `test inspect` and
   `test explore` are read-only queries over the same replay runtime.
6. Test commands produce one stable semantic JSON envelope by default. There is
   no `--format human` or prose-parser contract.
7. Visible interactions may be unavailable. Executable actions are authorized
   descriptors whose complete dependent input domain has a budget-independent
   nonempty assignment; explore returns their accepted concrete commands.
8. There is no authored `requiredActions`, `playerTurn.decision`, or
   `blockedBy`.
9. `blockedBy` exists only in testing/introspection diagnostics and is derived
   where the scheduler proves a causal continuation dependency.
10. Inspect/explore require one player or spectator perspective and never
    aggregate private views or concrete commands.
11. The scenario matrix is mechanic-agnostic. Deterministic seed plus recorded
    entropy trace is the default; no dice-only override is added.
12. Every game has a complete normal-setup terminal scenario plus focused
    branch scenarios.
13. All nine per-game lockfiles remain; all generated workspace/test/Workbench
    output becomes transient.
14. Stable directory IDs, package names, reference IDs, and demo slugs remain;
    approved display names/themes change presentation only.
15. Public scenario tooling supersedes the overlapping private internal
    scenario-author workflow.
16. Phase 06 pretests the internal consumer, publishes the exact SDK, and
    mechanically repins all nine locks before internal admission activation; a
    staged-only version is insufficient.
17. No tracked derived path is deleted until Phase 07 proves internal compile
    against a real disposable deletion-candidate commit with canonical origin,
    then lands the identical SDK tree and repeats ordinary Git-archive
    admission from the integration commit.

Any proposal that changes one of these decisions is a design change, not an
implementation detail, and requires explicit review before Phase 01.

## 00E. Create The Rule-Conformance Ledger

Create `artifacts/rule-conformance-ledger.md`. It must cover every acceptance
bullet in each authoritative rule file without adding IDs or metadata to the
game source.

Use one row per acceptance bullet:

| Game       | Rule section   | Bullet ordinal and short description | Proof path           | Proof kind       | Current status         | Owning phase |
| ---------- | -------------- | ------------------------------------ | -------------------- | ---------------- | ---------------------- | -----------: |
| Stormtrail | Acceptance / 7 | roll-seven discard barrier           | `test/scenarios/...` | reducer scenario | absent/drifted/passing |           03 |

Rules for the ledger:

- identify a bullet by its section and ordinal in the frozen rule commit;
- link to a complete-game or focused scenario, or to a named pure unit test for
  a genuinely pure algorithm;
- link schema-invalid unknown-ID/malformed-wire obligations to one shared
  SDK/ingress conformance test rather than teaching scenario authors to cast
  around generated types;
- distinguish `absent`, `present-unverified`, `known-drift`, and
  `executed-passing`;
- do not mark a module passing because Node imported it successfully;
- do not weaken or delete a bullet because current code disagrees; and
- update the receipt when rule line movement changes ordinals.

The nine authority paths are:

```text
examples/reference-games/hearts/rule.md
examples/reference-games/simultaneous-card-drafting/rule.md
examples/reference-games/deck-building-market/rule.md
examples/reference-games/worker-placement-tableau/rule.md
examples/reference-games/hex-network-trading/rule.md
examples/reference-games/roll-and-write-scorecard/rule.md
examples/reference-games/multiplayer-ranking-and-ties/rule.md
examples/reference-games/solo-countdown-puzzle/rule.md
examples/reference-games/automa-river-rival/rule.md
```

## 00F. Characterize Current Behavior Without Blessing It

Create `artifacts/current-behavior-characterization.md`. Run current focused
commands and record what they actually execute. At minimum:

```bash
pnpm reference-games:check
pnpm reference-games:test:packed
pnpm reference-games:bundle
pnpm --filter @dreamboard-games/sdk test
node scripts/ui/generate-ui-agent-docs.mjs --check
```

For each per-game `test` script, prove whether scenario callbacks run by tracing
the harness or by a temporary controlled failing assertion. Do not commit the
probe. Record known current risks:

- several `tsx --test` scripts may only import exported scenario objects;
- four newer original games do not share the reducer-native scenario shape;
- generated docs mention `test generate`/`test run` although live CLI source
  has one `dreamboard test` command;
- `dreamboard dev --from-scenario` depends on generated base snapshots; and
- current source/profile names may encode rules that the approved rewrite
  deliberately excludes.

A green characterization command means only that its current behavior was
observed. The rule ledger decides whether that behavior is correct.

## 00G. Freeze The Deletion And Migration Order

Create `artifacts/deletion-ledger.md` with these states for every deletion:

```text
discovered -> replacement implemented -> clean-clone regenerated ->
all consumers migrated -> tracked-path guard green -> deleted
```

Required entries:

- SDK base contracts and runtime;
- all 12 authored base files and all generated base/projection output;
- test-only profiles such as Stormtrail `terminal-regression` and
  `charter-verification`, Sketchbook `empty-masterpiece-regression`, and Mosaic
  `test-fixed-spaces` / `test-end-game`, subject to exact source audit;
- the workspace-codegen ownership inventory under all nine `shared/` trees;
- checked Workbench reference fixtures and generated catalog;
- old Mosaic screenshots;
- stale test docs, templates, and generated agent reference; and
- overlapping internal private scenario-author commands/schema.

Every row names its replacement, owning phase, downstream consumers, clean-clone
proof, and final guard. Per-game lockfiles must appear in a separate retained
inventory, not in the deletion table.

## 00H. Freeze Game And Demo Identity

Create `artifacts/game-identity-and-demo-ledger.md` with, for all nine games:

- stable directory ID, package name, manifest/reference ID, demo slug, route,
  release object namespace, and any perf workload keys;
- approved display name and theme;
- `demoRelease` metadata, source path, thumbnail path, hero image path, and
  complete-game scenario;
- whether the active landing product currently selects it; and
- every hard-coded downstream identity use.

Do not rename persistent identities. In particular, Stormtrail retains the
`hex-network-trading` machine identity unless a separate explicit migration is
approved. Display/theme renaming flows through `displayName`, manifest game
name, `demoRelease.name`/copy, UI, and assets.

Record current media drift: games point hero URLs at
`/demos/<slug>/desktop.png`, while internal public files may not contain those
assets; release assembly recognizes an optional packaged `thumbnailPath`; and
landing cards may hard-code `/demos/<slug>/thumb.png` instead of consuming the
catalog's `thumbnailUrl`. Phase 07 owns the verified cutover.

## Proof Artifacts

Phase 00 produces:

```text
artifacts/baseline.md
artifacts/source-size-baseline.md
artifacts/consumer-ledger.md
artifacts/decision-receipt.md
artifacts/rule-conformance-ledger.md
artifacts/current-behavior-characterization.md
artifacts/deletion-ledger.md
artifacts/game-identity-and-demo-ledger.md
```

Receipts must be concise, reproducible, and use repo-relative links. They must
record command exit codes and distinguish local source proof from packed,
cross-repo, CI, staging, and production evidence.

## Exit Criteria

- Every approved rule acceptance bullet has an owning proof and phase.
- Every current base, snapshot, generated workspace file, Workbench fixture,
  screenshot, test-only profile, and private scenario-author surface is in the
  deletion ledger.
- Every downstream consumer is identified, including dev scenario
  materialization, source hashing, packed verification, demo admission,
  Workbench startup, landing media, and perf replay.
- All persistent game identities and approved display names are frozen.
- Baseline commands and source-size measurements are reproducible.
- The implementation team has accepted the public concepts and deletion order.

## STOP Conditions

Stop before Phase 01 if:

- any authoritative rule is still ambiguous about setup, terminal behavior, or
  a required complete-game arc;
- a current test is being treated as authority despite disagreement with a
  rule;
- a generated path has an unidentified consumer;
- internal admission provenance cannot be traced through each per-game lockfile;
- a stable game ID/slug rename is proposed without a separate migration;
- an acceptance bullet has no planned proof;
- a phase would delete state artifacts before `dev --from-scenario` and
  Workbench consumers have a replacement; or
- the public/private scenario-author overlap has no agreed single owner.
