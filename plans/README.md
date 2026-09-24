# Headless SDK delivery

Status: implementation delivered on 2026-09-24 (UTC). Root orchestrated and
reviewed; implementation and independent audits used GPT-6 Astra with Medium
reasoning.
Track every original requirement in [the delivery checklist](delivery-checklist.md).

## Implementation baselines

- SDK: `891bad8` from `origin/main`.
- Internal adoption: `bcf3375ed` from `origin/main`.
- Public tools/runtime: `d8e4785` from `origin/main`, checked out separately at
  `/Users/mac/code/worktrees/headless-cli-main` to preserve unrelated dirty work.
- SDK implementation: `/Users/mac/code/worktrees/headless-sdk`.

The complete SDK stack landed at `1d193929897aa0103c90313211b41a6b91579dd3`
and published `0.5.0-alpha.3` through the reviewed release workflow. The
four-facade API uses reducer ABI `0.6.0`.

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

| Layer                               | Scope                                                                          | Status                                          |
| ----------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| [001](001-transaction-mutations.md) | One transaction mutation path; remove immutable ops and twins                  | PR #26; local and hosted gates passed           |
| [002](002-reducer-lifecycle.md)     | Reducer execution, setup/actors, views/cache (three sublayers)                 | PRs #27, #29 and #30; local/hosted gates passed |
| [003c](003c-board-geometry.md)      | Honeycomb board shapes, identities, queries and layouts                        | PR #31; local/hosted gates passed               |
| [003](003-committed-steps.md)       | Committed steps, private projection and command contracts                      | PR #33; local/hosted gates passed               |
| 003b                                | Canonical shared models, plain player records, bundle and schema consolidation | PRs #34–36 and #39 landed                       |
| [004](004-headless-instance.md)     | Headless instance, feature typing and sources                                  | PRs #37–44 landed                               |
| 005                                 | React adapter, both reference UIs, removal of old public runtime               | PRs #45–46 landed                               |
| 006                                 | Registry, scenario development UI, browser helpers and workbench removal       | PRs #32 and #46 landed                          |
| 007                                 | Final packaging, documentation and public release proof                        | PR #47 landed; SDK alpha.3 published            |
| Downstream                          | Public runtime/offline host and internal consumer adoption                     | Landed and verified; see delivery receipt       |

The original six-layer sketch was split at the reducer foundation so the
transaction rewrite could be reviewed and verified on its own. The final SDK
stack contains 21 PRs; downstream adoption uses separate repository stacks.

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

## Delivery evidence

The [delivery receipt](delivery-receipt.md) records the final SDK release, public
runtime/dev-host cohort, consumer verification, and repository landing evidence.
Earlier per-layer receipts describe intermediate states; the delivery checklist
tracks completion of the accepted plan.
