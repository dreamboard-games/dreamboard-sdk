# One transaction mutation implementation

Status: implemented and reviewed; full repository gate passed on 2026-09-24.
Planned at SDK `891bad8`.
Branch: `codex/sdk-transactions`. Depends on: none.

## Purpose

The headless rewrite starts by making `tx` the sole mutation API. Currently
`transaction.ts` wraps an `ops.ts` surface that maintains both immutable and
in-place variants, backed by duplicate table wrappers. Remove the competing
mutation path while preserving game behavior and transaction isolation.

## Scope

- `packages/sdk/src/reducer/transaction.ts`, `ops.ts`, `compose.ts`, table
  mutation implementations and their direct production callers.
- Runtime scope/argument wiring that supplies the removed ops surface.
- Facades, export snapshots, compile-only type tests and behavioral tests that
  consume those APIs.
- Reference-game callers and documentation only where affected by this cut.

Do not change the manifest compiler or its type inference (SDK PR #25 owns
those fixes), package versions, external repositories, protocol basis,
authentication, source/React APIs, or unrelated tooling. Preserve effects and
phase lifecycle behavior for the following layer. Root owns the plan index.

## Steps

1. Inventory mutation callers and transaction isolation. Confirm whether
   immutable APIs remain necessary outside tests. Report a material dependency
   before widening scope.
2. Establish one transaction-owned mutation implementation. Clone the table once
   per transaction and use the canonical in-place operations. Delete immutable
   operations, their wrappers, `pipe`/`compose`, and `tx.apply` if it exists only
   to consume those operations. No hidden compatibility path or renamed duplicate.
3. Migrate all in-repository consumers. Keep existing effect/phase outcome
   semantics. Do not loosen domain typing or remove behavioral coverage to make
   the migration pass.
4. Update relevant API documentation and export snapshots deliberately. Add or
   adapt regression coverage for chained mutations, rejection isolation and
   independence of transactions created from the same state.
5. Run focused tests and typecheck, then the full clean-checkout gate. Audit the
   diff and commit only this layer. Root reviews before push/PR submission.

## Verification

Use Node 24 and pnpm 10.4.1 through `mise exec node@24 --`.

- `pnpm install --frozen-lockfile` in the isolated worktree.
- `pnpm --filter @dreamboard-games/sdk exec vitest run src/reducer`.
- `pnpm --filter @dreamboard-games/sdk typecheck` (build required workspace
  prerequisites first if fresh declarations are missing).
- `pnpm check`, including packed reference-game verification.
- Review removal of the old exports and every changed test assertion.
- `git diff --check` and a clean tracked worktree after the commit.

`pnpm check` must not modify tracked files. Preserve the configured gates;
report pre-existing failures and their evidence rather than weakening checks.

## Stop and report

- Deleting immutable ops requires redesigning effect or phase semantics rather
  than changing mutation wiring.
- The change needs a compatibility implementation or weaker public types.
- Required tests cannot be migrated without deleting behavioral guarantees.
- An unresolved failure repeats after a targeted repair.

Documented narrow adjustments may be reviewed on their merits. Never reproduce
secrets in reports. Report exact commands/results, commit SHA, changed scope,
and any incomplete verification; do not claim the whole SDK rewrite is complete.

## Implementation receipt

The canonical transaction mutation module replaces `ops.ts`, `compose.ts`,
immutable table wrappers and the flat phase-state helpers. The public facade
removes `createReducerOps`, `pipe`, and flat `setActivePlayers`; transactions
remove `apply`. Mutation callbacks no longer receive `ops`. Runtime effects and
phase semantics remain for layer 002.

Root and two independent reviewers inspected mutation semantics and coverage.
Review additions prove board/card identity constraints, successive spatial
queries, source/sibling transaction isolation, meaningful state-slice patches,
and rejected state/event/instruction/RNG rollback.

Executor verification: `mise exec node@24 -- pnpm check` passed, including 633
SDK tests across 87 files and both packed Hearts/Hex reference-game checks.
`git diff --check` passed. No package was published and no consumer was repinned.

Root independently reran transaction, runtime-effects, card/component mutation
and export-surface tests: 73 tests across five files passed. SDK typecheck and
the separate checked type-test project both passed against the frozen diff.
