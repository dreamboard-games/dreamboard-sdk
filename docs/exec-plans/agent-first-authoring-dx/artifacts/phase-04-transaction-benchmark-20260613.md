# Phase 4 Transaction Benchmark Receipt - 2026-06-13

Scope: `docs/exec-plans/agent-first-authoring-dx/phase-04-transaction-commit-model.md`

Command:

```sh
pnpm --dir packages/sdk exec bun ./bench/transaction.bench.ts
```

Baseline source:

- Detached worktree: `<temporary-baseline-worktree>`
- Ref: `HEAD` before the Phase 4 transaction patch (`84fa5d6`)
- Benchmark file copied from the Phase 4 patch so both runs used the same
  Catan-class fixture.

Results:

| Source                      | Iterations |         Elapsed ms |             Ops/sec |
| --------------------------- | ---------: | -----------------: | ------------------: |
| Baseline `84fa5d6`          |     50,000 | 2118.3442919999998 |  23,603.33973510667 |
| Phase 4 patch               |     50,000 | 1442.5922090000001 |  34,659.82949863553 |
| + method surface precompute |     50,000 |        1262.889208 | 39,591.754908717216 |

Observed improvement after the method-surface precompute: `1.68x`.

Interpretation:

- The implementation meets the structural clone-count gate for direct
  transaction methods: multi-op `tx.*` tests assert one `cloneRuntimeTable`
  call, and trusted dispatch asserts one clone for two engine instructions in
  the same drain.
- The wall-clock benchmark does **not** meet the original `>= 4x` estimate on
  this machine. That estimate is superseded as of 2026-06-14: the Phase 4
  owner accepted this revised evidence because the baseline already used
  shallow table/resource copies for some resource ops, so the measured workload
  removes fewer deep clones than the plan estimated.
- Precomputing the transaction method surface removes repeated wrapper
  construction per `edit()` call and improved the measured workload from
  `34,659.82949863553` ops/sec to `39,591.754908717216` ops/sec. This is a
  modest implementation-complexity tradeoff and still preserves destructured
  transaction-method calls via per-transaction lazy method caching.
- Phase 5 is unblocked by this accepted revised Phase 4 evidence threshold.
