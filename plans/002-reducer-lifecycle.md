# Direct reducer execution and phase lifecycle

Status: 002a, 002b and 002c implemented, reviewed and verified together.
Base: layer 001 (`de6be2c`).
First branch: `codex/sdk-reducer-lifecycle` (002a).

## Reviewable sublayers

Executor inventory established three independently green cuts. Implement 002a
first, then root reviews and creates separate dependent branches for 002b/002c.

- 002a execution/lifecycle: direct outcomes, phase-entry loop, seeded tx
  shuffle/roll/deal, removal of effects/continuations/instructions/stages and
  stage/card-action execution. Preserve existing setup and projection contracts
  until their sublayer; if setup bootstrap shares instruction primitives, keep
  its minimal initialization execution local to that owner, not a second generic
  interpreter or compatibility API. Preserve simultaneous resolution and RNG.
- 002b initialization and actors: JSON-safe initial options, setup/bootstrap
  deletion and Hearts setup migration; prompts become actor interactions and
  their eligibility/projection types migrate coherently. Remove costs, guidance
  and phase-zone metadata here because they are eligibility/projection concerns.
- 002c views and cache: one authored seat view and minimal memoize, including
  both games and the sole existing transport projection adapter.

The sections below define the combined outcome, not a request to mix the three
diffs into one branch. Only relevant tests/types/callers move in each sublayer.

## Outcome

Replace generic effect/instruction execution with direct transaction outcomes
and an explicit phase-entry loop. Keep player, automatic, and simultaneous
phases, seeded randomness, events, rejection isolation and deterministic games.
Both reference games migrate with the implementation.

The original attached headless design is background. `plans/README.md` owns
accepted corrections, including four subpaths, hidden transport basis, private
steps and actual phase-entry boundaries. Do not weaken host admission/privacy.

## Scope and decisions

- Remove public effects/continuations, `tx.effect`, `tx.schedule`, generic
  instruction queues, stage/step-phase helpers, phase `zones`, card actions,
  implicit costs and guidance. Move surviving simultaneous/ordinary reduction
  and RNG responsibilities into the direct executor before deleting old files.
- `tx.transition(name)` returns an accepted transaction outcome with one explicit
  transition target. The lifecycle loop consumes it and enters that phase even
  when its name is unchanged. Automatic enter callbacks can transition again in
  the same dispatch. Bound the direct loop to 1,000 phase entries per dispatch
  with a clear SDK error (the old runner had no finite bound).
  Calling a result builder without returning its result does not schedule work.
  Retain the used `endGame(outcome, { transition })` option: perform its final
  phase entry once before terminal projection and reject a returned further
  transition. Cover the ordering rather than silently discarding entry intent.
- Add direct seeded `tx.shuffle`/`tx.roll` and the minimal `tx.deal` operation
  required by the reference games, using canonical manifest IDs. Avoid generic
  target adapters or a replacement instruction language. Randomness belongs to
  the accepted transaction; rejection discards RNG, state and emitted events.
- Use reducer ABI 0.6.0 for this unreleased hard-cut cohort: accepted results no
  longer contain effects/continuations and dispatch traces describe phase entry.
  Exact-version admission must reject the published 0.5.0 ABI. Later unshipped
  layers can share this unreleased version; package publication uses a fresh
  exact public version and coordinated downstream adoption.
- Move Hearts setup shuffle into its setup phase before dealing. Remove authored
  setup profiles/bootstrap selection. Initial lobby values become JSON-safe
  `options` at initialize and initial callbacks. Update owned schemas/codegen
  inputs and in-repository callers as needed; do not leave an authored second
  setup path. Record the downstream contract change for adoption.
- Replace prompts with ordinary actor-targeted interactions. Hex may retain two
  explicit accept/reject actions. Project actionable domains only to the selected
  actor; put information for other seats in the authored seat view.
- Consolidate authored views into one seat `view`; derive board static values
  from manifest data. Preserve the existing transport shape temporarily if
  required by the current UI, with conversion at one owning adapter only.
- Replace authored `defineDerived`/resolver injection with a minimal WeakMap
  `memoize` helper and ordinary typed functions. Keep essential internal caches.
- Migrate tests for surviving behavior rather than deleting whole suites.
  Type-proof assertions belong in `packages/sdk/type-tests`, not Vitest files.

## Boundaries

Keep dependent inputs until layer 003 supplies committed steps. Keep PerPlayer
representation, manifest inference (open PR #25), package consolidation, source
and React APIs, wire basis, and external repo changes outside this layer.
Unbound test-only helper migration may happen only where required to remove
the execution machinery; the final hard cut must eventually delete that surface.

If the scope proves too coupled for one reviewable layer, report the concrete
dependency and propose independently green sublayers before widening it. Root
owns plan updates, branch navigation, pushes, PRs and aggregate gate scheduling.

## Verification and review

Read root/game AGENTS and game rule files. Use Node 24 and pnpm 10.4.1.
Run focused tests/typeproofs while iterating, then `pnpm check`, including both
packed games. Preserve deterministic initial dealing, simultaneous resolution,
same-name and multiple phase entries, rejection rollback, actor targeting and
private seat views. Update deliberate export snapshots. No gate weakening.

Freeze the diff for root and independent review. Fix valid findings, then commit
only this layer after the final gate; root submits the stack. Report exact
commands, remaining downstream contract obligations and deleted public names.

## 002c implementation receipt

Prepared commit `850e2d8061e128ced180053051b2535dee242277` was independently
reviewed, then integrated as `8679356` on reviewed 002b `c4b9f80` in
`codex/sdk-single-seat-view`.
It replaces split authored shared/player/static views with one contextual seat
view, derives static boards from the manifest, and removes injected derived
resolvers in favor of ordinary functions and the small WeakMap `memoize` helper.
Both games and the template are migrated. The temporary transport adapter leaves
sharedView empty; spectator custom views intentionally remain empty and must
never be populated by selecting a private seat.

Full `pnpm check` passed: SDK 87 files/629 tests, contract suites, checked types,
template and both packed games. Root independently reran 57 focused tests and
checked types; independent review found no actionable regressions in privacy,
collector argument migration or memoization. Logs: `/tmp/views-full-check.log`,
`/tmp/views-root-focused.log`, `/tmp/views-root-types.log`.
Combined-tip verification passed with `mise exec node@24 -- corepack
pnpm@10.4.1 check` (exit 0): SDK 86 files/624 tests, contract suites, checked
authoring types, template, and both packed reference games. Seven focused files
passed 95 tests; the memoization availability-rule integration fix then passed
all 29 runtime behavior tests. Production and checked-type compilation passed.
Logs: `/tmp/views-integration-fullcheck.log`,
`/tmp/views-integration-focused.log`, `/tmp/views-integration-focused-fix.log`,
`/tmp/views-integration-tsc.log`, `/tmp/views-integration-types.log`.

Conflict resolution preserves 002b options admission and restoration, actor
pending/continuation semantics, hidden-zone/card filtering, and scenario proofs.
The memoization descriptor test now uses an ordinary availability rule instead
of removed cost metadata. The existing two usePanZoom lint warnings and packed
runner pnpm issue remain recorded follow-ups. No browser proof or publication
is claimed by this browser-free gate.

## 002a implementation receipt

Completed on 2026-09-24. Direct transaction outcomes now drive a bounded phase-entry
loop. Every entry resets phase state and simultaneous seals, including same-name
entry, and initializers see destination flow metadata. Session initialization keeps
`lastTransition` null. Final terminal entry executes once and rejects a further
transition. Direct seeded `tx.roll`, `tx.shuffle`, and `tx.deal` preserve rollback,
query freshness, card metadata and one table clone per transaction.

Removed effects, continuations, instruction engines/queues, stage and step-phase
execution, and card-action authoring. Surviving tests use ordinary interactions,
explicit card inputs and rules. Hex rolls declared dice directly; Hearts uses the
renamed deal method. The wire ABI is 0.6.0 with completed reduction results and
`phaseEntered` traces. Setup, prompt/cost/guidance/phase-zone projection and split
views remain deliberately owned by 002b/002c.

Verification:

- `mise exec node@24 -- pnpm check`: passed, exit 0. SDK 87 files / 635 tests;
  reducer contract 2 files / 79 tests; repository scripts 32 tests; workspace
  Hearts 28 and Hex 33 tests; both packed reference games passed. Build, lint,
  authoring type proofs, generator parity and formatting checks passed.
- Generator tests: 5 passed, including strict unsupported-schema rejection and
  non-mutating artifact parity. `git diff --check` passed.
- Root frozen production review and independent 4 files / 48 tests plus checked
  type proofs passed. Only an empty type import was removed afterward; its
  formatting check and SDK typecheck passed.
- Focused regression coverage proves accepted mixed RNG sequencing through entry,
  rejected final simultaneous submission rollback while retaining earlier seals,
  same-name transitions, unreturned intents, terminal ordering, the 1,000-entry
  bound, shared shuffle played-by preservation and independent transactions.

Layer 007 tooling follow-up: the repository uses pinned pnpm 10.4.1, but isolated
packed-game copies lack `packageManager` and their install logs used global pnpm
12.5.1. Both verifications passed; pin the isolated runner coherently in the final
tooling layer rather than expanding this lifecycle change.
