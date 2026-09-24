# Headless SDK delivery

Status: full delivery authorized on 2026-09-24. Root orchestrates and reviews;
implementation and independent audits use GPT-6 Astra with Medium reasoning.
Track every original requirement in [the delivery checklist](delivery-checklist.md).

## Current baseline

- SDK: `891bad8` from `origin/main`.
- Internal: `a368191e4` from `origin/main`.
- Public tools/runtime: `d8e4785` from `origin/main`, checked out separately at
  `/Users/mac/code/worktrees/headless-cli-main` to preserve unrelated dirty work.
- SDK implementation: `/Users/mac/code/worktrees/headless-sdk`.
- Open SDK PR #25 owns manifest inference fixes. Avoid duplicating that work;
  synchronize with main before publishing subsequent layers.

The earlier `docs/headless-refactor-design.md` is background, not the current
implementation authority. Its repository facts and delivery ordering have
drifted. In-memory manifests and removal of authoring code generation have
already landed. The public tools repository now owns an offline development
host and browser runtime rather than the former CLI.

## Agreed design

- Hard cut: one supported authoring and UI path, no compatibility aliases.
- One package with four purposeful subpaths: root for headless APIs and shared
  models, `/react`, `/reducer`, and `/testing`.
- Hosted UI imports game types; executable reducers belong to the server and
  local test/development source. Preserve existing sandbox/privacy boundaries.
- The headless instance owns local drafts and active interaction. Sources own
  connection/request lifecycle. Server projections own gameplay eligibility.
- Retain stale-action basis and idempotent retry guarantees inside transport;
  authors do not manage them. Never silently retry with a newer basis.
- Sequential inputs commit per-seat selections. Revalidate in order, retain
  the valid prefix, and discard choices from the first invalid step onward.
  Avoid a dependency graph or incremental invalidation framework.
- Pending selections are private. Clear them on a phase transition or loss of
  interaction eligibility. Reconnect reloads persisted selections. Restore uses
  the selections in the restored checkpoint. Explicit cancel clears them.
- Clear at each actual phase-entry boundary, including same-name transitions
  and leaving/returning to a phase within one dispatch. Reconcile on accepted
  authoritative state before persistence/projection; projection stays pure.
- Revalidate all accumulated inputs before final reduction. A rejected final
  step preserves the previously committed prefix and discards the attempted
  transaction, RNG changes and events. Aggregate rule rejection does not guess
  which earlier choice caused it; cancel remains the restart path.
- Completed multi-value inputs are atomic steps. If a three-card selection
  becomes invalid, drop that step rather than invent partial saved drafts.
  Optional completed steps use a JSON-safe explicit null, with nullable types.
- Pending choices and RNG are serialized engine-owned state, never module
  closure state: the offline host may create a fresh worker for each operation.
- Every submitted intermediate step is a durable commit. Internal automatic
  progression remains part of that transaction. Restore gets fresh transport
  revision identity so old packets cannot target restored pending selections.
- React subscribes to a framework-free instance. Registry source components
  own markup, accessibility, styles, and optional animation. No promise that
  external-store mutations become transitions through `startTransition`.
- Feature registration must expose APIs only on instances enabling the feature.
  Keep extension machinery proportional to actual built-in requirements.
- Host-facing bundle assertions, wire schemas and canonical seat-frame
  materialization remain available from the four subpaths. Package consolidation
  must not remove validation at worker/transport trust boundaries.

## Execution order

| Layer                               | Scope                                                                          | Status                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| [001](001-transaction-mutations.md) | One transaction mutation path; remove immutable ops and twins                  | PR #26; local and hosted gates passed                   |
| [002](002-reducer-lifecycle.md)     | Reducer execution, setup/actors, views/cache (three sublayers)                 | PRs #27, #29 and #30; local/hosted gates passed         |
| [003c](003c-board-geometry.md)      | Honeycomb board shapes, identities, queries and layouts                        | PR #31; local/hosted gates passed                       |
| [003](003-committed-steps.md)       | Committed steps, private projection and command contracts                      | PR #33; local/hosted gates passed                        |
| 003b                                | Canonical shared models, plain player records, bundle and schema consolidation | Records PR #34; canonical models integrated; bundle next |
| [004](004-headless-instance.md)     | Headless instance, feature typing and sources                                  | Sources and public event projection executing                  |
| 005                                 | React adapter, both reference UIs, removal of old public runtime               | Pending instance                                        |
| 006                                 | Registry, scenario development UI, browser helpers and workbench removal       | Pure foundation PR #32 green; bound cutover after React |
| 007                                 | Final packaging, documentation and public release proof                        | Pending complete SDK stack                              |
| Downstream                          | Public runtime/offline host and internal consumer adoption                     | Published SDK required                                  |

The original six-layer sketch is split at the reducer foundation so the
transaction rewrite can be reviewed and verified on its own. Future layers get
self-contained implementation plans after their prerequisites are reviewed.

Layer 002 should replace instruction-driven execution with direct transaction
outcomes and an explicit phase-entry loop, retaining simultaneous resolution
and deterministic RNG. Preserve actual phase-entry boundaries, including
same-name transitions. Migrate setup and actor-targeted trade interactions in
both reference games with the lifecycle change. Keep dependent input resolution
until layer 003 replaces it. Move the pervasive `PerPlayer` representation cut
with the shared-model work rather than expanding the transaction PR.

## Review and landing

Each branch passes `pnpm check`. Preserve behavioral tests when implementations
are replaced. Public type changes include compile-only positive and negative
proofs. Run relevant browser tests for UI changes and packed artifact checks
before release. Do not delete existing verification tooling before its callers
and replacement gates migrate.

Root reads every implementation diff and reruns the relevant gates. Resolve
valid review feedback in its owning layer and rebase upward. Use `gh stack`
non-interactively: named branches, `submit --auto`, and `view --json`.

SDK publication and downstream adoption are distinct milestones. All consumers
use exact published versions. The current publication order is SDK, browser
gameplay runtime, then dev-host; dev-host pins the matching runtime. Public
package proof uses `pnpm check` and `pnpm verify:package`. Internal adoption uses
the current `authoring:cohort:check`, `verify:offline`, and owned stack/browser/
integration lanes as appropriate. Do not reuse the retired CLI release-set flow.
No staging/production operations are part of this implementation. Merging and
publication are not implied by starting development.

## Latest receipt

Transactions, lifecycle, initialization/actors, seat views and board geometry are
implemented and independently reviewed in SDK PRs #26, #27, #29, #30 and #31.
The source registry is PR #32. These layers and committed steps (PR #33) passed
both local and hosted gates; exact-head review threads were empty.

Committed steps integrated at `1542dd0`; the combined gate passed with both packed
reference games, plus 54 independent reducer/codec tests and 14 export tests.
Two real Hex browser workflows prove physical target selection, separate victim
or null intent, cancellation and exact commands. Plain player records are PR #34
at `46bbc2d`, with their combined repository and packed-game gate passed.

Canonical package/model consolidation integrates ownership, board-template removal
and strict SDK-local Zod schemas at `3b6d90e`. Its source matches reviewed preparation
`717213d`; the complete gate passed 710 SDK tests and both packed reference games.
All three private type/contract packages and their handwritten emitter are gone.
One production bundle/testing ownership is the next bounded cleanup. The source
agent is implementing the reviewed snapshot and ACK/frame lifecycle; another agent
is adding the latest public event batch to serialized state and seat projection.

Preparatory internal cleanup uses fresh `origin/main` at `bcf3375ed` in
`/Users/mac/code/worktrees/headless-internal-kotlin-cleanup`. The old Kotlin
reducer DTO file, its sole legacy test and its otherwise unused JSON codec have
no production consumers. Their deletion passed all five gameplay-control client
tests, compilation, ktlint and the full ten-stage repository gate. The change is
committed as `5e9234d38` in draft
[internal PR #531](https://github.com/dreamboard-games/dreamboard-internal/pull/531).
No hosted checks were reported at submission. Production TypeScript worker
admission and generated gameplay control DTOs remain intact.

See each layer receipt and the delivery checklist for the remaining work. The
final tooling layer must pin pnpm in isolated packed-game copies; current checks
use repository pnpm 10.4.1 while copied package verification resolves pnpm 12.5.1.
