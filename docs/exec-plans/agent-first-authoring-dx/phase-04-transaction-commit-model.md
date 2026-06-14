# Phase 4: Transaction Commit Model

Status: closed by whole-plan closeout on 2026-06-15. Benchmark receipt:
[`artifacts/phase-04-transaction-benchmark-20260613.md`](artifacts/phase-04-transaction-benchmark-20260613.md).

## Objective

Two sub-phases, strictly ordered:

- **4A** — build a characterization net over `reducer/bundle/trusted/*`
  (the authority hot path currently has almost no colocated tests) so the
  rewrite in 4B and the diagnostics work in phase 6 land against golden
  behavior.
- **4B** — change the reducer transaction from **deep-clone-per-op** to
  **clone-once-per-transaction with an in-place draft**, and replace the
  `Proxy`-based transaction object with a plain object. This is the plan's
  one intentional behavioral break and anchors the 0.4.0 train.

## Background

Current implementation (`packages/sdk/src/reducer/transaction.ts`,
`reducer/ops.ts`, `reducer/table/clone.ts`):

- Every `tx.spendResources(...)` / `tx.moveComponentToEdge(...)` call invokes
  an `Op<State>` that calls `cloneRuntimeTable(table)` — a full deep clone of
  zones, decks, hands, pieces, dice, boards (including every space/edge/vertex
  field record) — then `refresh()` rebuilds the entire query object
  (`createStateQueries`) eagerly.
- A 5-op reduce therefore performs 5 full table clones and 5 query rebuilds.
  `engine-instruction-resolver.ts` repeats the pattern per instruction
  (lines 68/116/182).
- The transaction object is a `Proxy` (`transaction.ts:96`): go-to-definition
  on `tx.spendResources` lands in the proxy handler, stack frames are
  anonymous, and the implementation needs `as unknown as` casts.
- Evidence that authors route around the cost: frontier-trails maintains its
  own `WeakMap`-keyed occupancy cache over `componentLocations`
  (`app/reducer-support.ts`) to avoid recomputation across cloned states.

Semantics that must be preserved vs. changed:

| Guarantee                                                            | Today                                | After 4B                                                                   |
| -------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| The state passed to `edit(state)` is never mutated                   | yes                                  | **yes** (unchanged — this is the safety property reducers rely on)         |
| `tx.state` after N ops reflects all N ops                            | yes                                  | yes                                                                        |
| Two reads of `tx.state` at different times are independent snapshots | yes (each op produced a fresh clone) | **no — they alias the same draft** (the break)                             |
| `accept(tx.state)` returns a state safe to retain                    | yes                                  | yes (the draft is owned by the transaction; the transaction is single-use) |

A repo-wide audit of all examples and SDK-internal call sites found the usage
pattern is uniformly "apply ops, then `accept(tx.state)`"; no call site
retains an intermediate `tx.state` snapshot. The break is real but the blast
radius is theoretical — which is exactly why 4A must exist before 4B.

## Proposed Fix

### 4A. Characterization Net For `bundle/trusted/*`

New golden coverage colocated under
`packages/sdk/src/reducer/bundle/trusted/`, driven by a small fixture game
(do **not** import example workspaces). The current implementation uses one
consolidated characterization file instead of one file per runner:

```text
phase-04-characterization.golden.test.ts
  dispatch accept/reject golden traces
  lifecycle transition and phase reset
  per-seat projection digest
  deterministic rng/effect traces
```

Each golden test snapshots, for a scripted input sequence:

```ts
const result = bundle.dispatch(session, input);
expect({
  type: result.type,
  errorCode: result.type === "reject" ? result.errorCode : undefined,
  trace: result.type === "accept" ? summarizeTrace(result.trace) : undefined,
  stateDigest: result.type === "accept" ? digest(result.state) : undefined,
}).toMatchSnapshot();
```

`digest` is a stable structural hash (sorted-key JSON → sha256) so snapshots
catch any state divergence without storing full states. `summarizeTrace`
keeps instruction names + rng trace entries (the existing
`DispatchTraceEntry` shape in `reducer/core/types.ts`).

Exit gate for 4A: the suite is green on the **unmodified** implementation and
runs in `pnpm test` (bun).

### 4B. Single-Clone Draft Transaction

#### Ops layer: in-place core + pure wrapper

Each table mutation in `reducer/table/*` splits into an in-place core and the
existing pure form, single-sourced:

```ts
// reducer/table/card-mutations.ts (pattern for every mutation)
/** @internal Mutates `table` directly. Callers own the clone discipline. */
export function moveCardToHandInPlace<Table extends RuntimeTableRecord>(
  table: Table,
  args: MoveCardToHandArgs<Table>,
): void {
  // current body, minus the leading cloneRuntimeTable, writing into `table`
}

export function moveCardToHand<Table extends RuntimeTableRecord>(
  table: Table,
  args: MoveCardToHandArgs<Table>,
): Table {
  const next = cloneRuntimeTable(table);
  moveCardToHandInPlace(next, args);
  return next;
}
```

`createReducerOps` keeps returning pure `Op<State>` factories (the public
`pipe`/`apply` composition contract is unchanged); it additionally exposes the
in-place cores to the transaction via an internal registry:

```ts
// reducer/ops.ts
export type ReducerOpsInternal<State> = {
  [K in keyof ReducerOps<State>]: (state: State, ...args: OpArgs<K>) => void;
};
```

#### Transaction: clone once, mutate draft, lazy queries

```ts
// reducer/transaction.ts (replacing the Proxy implementation)
export function createReducerTransaction<
  State extends { table: RuntimeTableRecord },
>(
  initialState: State,
  ops = createReducerOps<State>(),
): ReducerTransaction<State> {
  // The single clone. Non-table slices are shallow-copied; table is deep.
  let draft: State = {
    ...initialState,
    table: cloneRuntimeTable(initialState.table),
  };
  let queries: TableQueriesOfState<State> | null = null;

  const invalidate = () => {
    queries = null;
  };

  const base = {
    get state() {
      return draft;
    },
    get q() {
      return (queries ??= createStateQueries(draft));
    },
    apply(op: Op<State>): State {
      // Pure-op escape hatch keeps pipe() composability: the op returns a
      // fresh state; adopt it as the new draft.
      draft = op(draft);
      invalidate();
      return draft;
    },
  };

  const methods = Object.create(null) as Record<string, unknown>;
  for (const key of opKeys(ops)) {
    methods[key] = (...args: unknown[]) => {
      opsInternal(ops)[key](draft, ...args);
      invalidate();
      return draft;
    };
  }
  return Object.assign(methods, base) as ReducerTransaction<State>;
}
```

Notes:

- **Public types are unchanged** (`ReducerTransaction`, `ReducerEdit`,
  method signatures still return `State`). Only the aliasing behavior and the
  removal of the Proxy are observable.
- Non-table state slices (`public`, `phase`, `flow`, …) are shallow-copied at
  entry; ops that write them (e.g. `setActivePlayers`) already replace those
  objects wholesale — audit during implementation and copy-on-first-write any
  slice an in-place core mutates.
- `engine-instruction-resolver.ts` adopts the same discipline: one clone per
  drain, in-place cores per instruction.
- Deep-freeze guard in tests: the 4A fixtures wrap input sessions in
  `deepFreeze` in dev/test so any in-place core that touches the _input_
  state (instead of the draft) throws immediately.

#### Benchmark gate

New `packages/sdk/bench/transaction.bench.ts` (bun), sized like a Catan-class
game (19 spaces / 72 edges / 54 vertices / 4 players / ~120 components):

```ts
bench("5-op reduce (spend, 2x move, resource transfer, phase write)", () => {
  const tx = edit(baseState);
  tx.spendResources({ playerId, amounts: COST });
  tx.moveComponentToEdge({ componentId: trail, boardId, edgeId });
  tx.moveComponentToVertex({ componentId: camp, boardId, vertexId });
  tx.transferResources({ from: a, to: b, amounts: GIVE });
  tx.setActivePlayers([next]);
  return tx.state;
});
```

Acceptance: exactly one table clone per 5-op reduce, plus a same-machine A/B
benchmark receipt showing the measured wall-clock improvement. The original
`>= 4x` estimate was superseded on 2026-06-14 after the Phase 4 owner accepted
the recorded `1.68x` improvement: the baseline already avoided deep clones for
some resource operations, so the structural clone-count gate is the release
gate and the wall-clock result is supporting evidence. The private monorepo's
`pnpm perf run authority-hot-submit --target local-aws` lane is the
system-level confirmation after repin (cross-repo, informative not gating).

#### Release notes (0.4.0)

Document the one observable change with the only pattern it can affect:

```ts
// 0.3.x: s1 and s2 are independent snapshots
const tx = edit(state);
const s1 = tx.spendResources(/* ... */);
const s2 = tx.moveComponentToEdge(/* ... */);
// 0.4.0: s1 === s2 === tx.state (one draft). If you need an intermediate
// snapshot, capture it explicitly:
const s1 = structuredClone(tx.state);
```

## Files Touched

- `packages/sdk/src/reducer/transaction.ts` (rewrite, Proxy removed)
- `packages/sdk/src/reducer/ops.ts` (+ internal in-place registry)
- `packages/sdk/src/reducer/table/*.ts` (in-place cores; pure wrappers kept)
- `packages/sdk/src/reducer/bundle/trusted/engine-instruction-resolver.ts`
- `packages/sdk/src/reducer/table/clone.ts` (test-only clone-count
  instrumentation; fewer callers)
- 4A consolidated golden characterization test; `bench/transaction.bench.ts`
- Release notes for 0.4.0-alpha

## Verification

- 4A golden suite green before and after 4B (the entire point).
- Existing `table/*.test.ts` suites pass unchanged (they test the pure
  wrappers).
- Deep-freeze input-immutability tests.
- Benchmark receipt numbers recorded in
  `docs/exec-plans/agent-first-authoring-dx/artifacts/phase-04-transaction-benchmark-20260613.md`.
- Private monorepo after repin: `pnpm verify:dev`, `dreamboard test run` on
  frontier-trails (its scenarios replay full game sequences and double as
  end-to-end characterization), `verify:browser`.

## Acceptance Criteria

- Exactly one `cloneRuntimeTable` call per `edit()` transaction and per
  instruction drain (assert via a test-only clone counter).
- No `Proxy` in `reducer/transaction.ts`; stack traces through a failing op
  show named frames.
- Input-state immutability holds under deep-freeze.
- Same-machine benchmark receipt records the accepted revised evidence
  threshold (`1.68x` on the Phase 4 fixture as of 2026-06-14).

## Risks

- **Hidden intermediate-snapshot reliance** in closed-source consumers.
  Mitigation: 0.4.0 hard-cut release notes (precedent: 0.3.0), plus the
  golden suite and full example scenario replays.
- **In-place cores mutating shared sub-objects** that the single table clone
  did not copy deeply enough (e.g. nested `fields` records). The existing
  `cloneRuntimeTable` already deep-copies `fields`; the audit in 4B must
  verify every in-place core writes only through paths the clone copied.
  The deep-freeze tests make violations loud.
- Scope creep into query-layer caching (memoized `q` across ops). Out of
  scope: `q` is rebuilt lazily once per post-op read, which is already the
  dominant win; finer-grained invalidation is a follow-up with its own
  evidence.
