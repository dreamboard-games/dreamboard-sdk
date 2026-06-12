# Phase 6: Observability Capability

## Objective

Replace ad-hoc `console.*` calls and the `__DREAMBOARD_AUTHORING_WARNINGS__`
host global with a single injected diagnostics capability, and surface the
already-existing dispatch trace (`DispatchTraceEntry`) to the consumers who
need it (test runtime, dev host, gameplay executor). After this phase, every
reducer-side signal flows through one typed sink that hosts can aggregate,
and agents debugging a dead interaction can see the accepted-input /
applied-instruction / rng-consumption trail instead of silence.

Additive phase: the sink defaults to no-op; no wire changes.

## Background

- The SDK contains exactly 14 `console.*` call sites outside tests
  (`runtime/api/createPluginRuntimeAPI.ts:478` for runtime errors,
  `reducer/bundle/trusted/collector-domains.ts:443` for a projection warning,
  `runtime/primitives/interaction-submit.ts:36`, the UI `ErrorBoundary`, …).
  None are subscribable by a host.
- Authoring warnings are gated behind a host-set global
  (`__DREAMBOARD_AUTHORING_WARNINGS__`, read in `collector-domains.ts`)
  because the compiler admission scanner rejects trusted bundles referencing
  `process.env`. A capability passed through runtime args achieves the same
  gating without a global — and removes one special case from the admission
  scanner's model.
- `DispatchTraceEntry` (`reducer/core/types.ts`) already records accepted
  client inputs, applied instructions, and rng consumption per dispatch, but
  nothing outside the trusted runtime can observe it: the test runtime
  discards it and the dev host never sees it.

## Proposed Fix

### 6A. The Sink Contract

New module `packages/sdk/src/reducer/diagnostics.ts`, exported from
`/reducer` (it is part of the host-facing bundle API):

```ts
export type ReducerDiagnosticEvent =
  | {
      type: "submitReceived";
      submissionId: string;
      playerId: string;
      interactionId: string;
      phase: string;
    }
  | {
      type: "submitRejected";
      submissionId: string;
      errorCode: string;
      ruleId?: string;
      message?: string;
    }
  | {
      type: "submitAccepted";
      submissionId: string;
      /** Summarized trace — names and counts, never full state. */
      trace: readonly DispatchTraceSummaryEntry[];
    }
  | { type: "phaseTransition"; from: string; to: string; reason: "effect" | "lifecycle" }
  | { type: "authoringWarning"; code: string; message: string }
  | { type: "internalError"; submissionId?: string; message: string; stack?: string };

export type DispatchTraceSummaryEntry =
  | { kind: "acceptedClientInput"; interactionId: string; playerId: string }
  | { kind: "appliedInstruction"; instruction: string }
  | { kind: "rngConsumption"; operation: string; traceEntry: string };

export type ReducerDiagnosticsSink = {
  event(event: ReducerDiagnosticEvent): void;
};

export const noopDiagnosticsSink: ReducerDiagnosticsSink = {
  event() {},
};
```

Design constraints, stated for the implementer:

- Events carry **summaries, never state objects** — the sink crosses the
  trust boundary toward host logging; leaking hidden/private state through a
  log line must be structurally impossible.
- The sink is synchronous and must never throw into the dispatch path: wrap
  every emit in the runtime with a try/catch that downgrades a throwing sink
  to no-op for the rest of the session (emit one `internalError` first).
- `submissionId` is generated per dispatch inside the trusted runtime
  (`crypto.randomUUID()` is unavailable under admission constraints — use the
  existing rng-free counter pattern: monotonically increasing
  `"sub-" + n` scoped to the runtime instance). Transport-level propagation
  to the backend is a cross-repo follow-up, out of scope here.

### 6B. Injection Points

```ts
// createReducerBundle gains an options bag (today it takes only the game):
export function createReducerBundle<...>(
  game: ReducerGameDefinition<...>,
  options?: {
    diagnostics?: ReducerDiagnosticsSink;
    /** phase-2 verbose descriptor mode rides the same bag */
    descriptorDiagnostics?: "off" | "verbose";
  },
): ReducerBundle;
```

- `trusted-runtime-args.ts` / `runtime-scope.ts` thread the sink into the
  instruction runner, lifecycle runner, and collector layers.
- `collector-domains.ts:443`'s `console.warn` and every
  `__DREAMBOARD_AUTHORING_WARNINGS__`-gated emission become
  `sink.event({ type: "authoringWarning", ... })`. The global read is
  deleted; the admission-scanner allowance for it is retired (cross-repo
  note for `compiler-core`).
- Hosts:
  - **Gameplay executor** (private monorepo) passes a sink that forwards to
    its structured logging.
  - **Dev host / `dreamboard dev`** (public CLI) passes a sink that prints
    human-readable lines and feeds the browser dev overlay.
  - **PluginRuntime** (client side): `createPluginRuntimeAPI.ts`'s
    `console.error(\`[Plugin RuntimeAPI] ...\`)` path gains an optional
    `onDiagnostic` prop on `PluginRuntime`, defaulting to the current
    console behavior — client-side logging stays visible by default but
    becomes interceptable.

### 6C. Test Runtime Exposure

`createTestRuntime` wires a capturing sink automatically and exposes it:

```ts
const ctx = createTestRuntime({ baseId: "after-setup" });
await ctx.game.submit(p1, "buildTrail", { edgeId });

ctx.diagnostics.events;            // ReducerDiagnosticEvent[] in order
ctx.diagnostics.lastDispatch;      // { submissionId, trace } of the latest accept
ctx.diagnostics.clear();
```

Scenario failure output (`create-expect-api.ts`) appends the last rejection
event when a `submit` throws, so a failing `when` step shows
`errorCode`/`ruleId` without the author adding anything — this composes with
phase 2's `explain` (explain answers "why can't I"; the sink answers "what
happened when I tried").

### 6D. Console Sweep

Inventory and disposition for the 14 call sites (complete list to be
generated by `grep -rn "console\.(warn|error|log)" packages/sdk/src --include='*.ts*' | grep -v test`
at implementation time):

| Site | Disposition |
| --- | --- |
| `runtime/api/createPluginRuntimeAPI.ts` (error + warn) | route through `onDiagnostic`, default console |
| `runtime/primitives/interaction-submit.ts` | route through `onDiagnostic` |
| `runtime/primitives/board.tsx`, `interaction/routes.tsx` | authoring-time misuse warnings → `onDiagnostic`, default console (these fire in the browser during development) |
| `reducer/bundle/trusted/collector-domains.ts` | sink (`authoringWarning`) — **no console fallback**; trusted bundles must not write to host console |
| `ui/components/ErrorBoundary.tsx` | keep `console.error`, add optional `onError` prop |

Add an ESLint flat-config rule (`no-console`) scoped to
`src/reducer/bundle/**` so trusted-runtime code cannot regress.

## Files Touched

- `packages/sdk/src/reducer/diagnostics.ts` (new), `reducer.ts` facade
- `packages/sdk/src/reducer/bundle/ingress-bundle.ts`, `trusted-bundle.ts`,
  `trusted/trusted-runtime-args.ts`, `trusted/runtime-scope.ts`,
  `trusted/instruction-runner.ts`, `trusted/lifecycle-runner.ts`,
  `trusted/collector-domains.ts`
- `packages/sdk/src/testing/create-test-runtime.ts`, `create-expect-api.ts`
- `packages/sdk/src/runtime/api/createPluginRuntimeAPI.ts`,
  `runtime/components/PluginRuntime.tsx` (prop), the primitives call sites
- `eslint.config.js` (scoped `no-console`)

## Verification

- Unit: every dispatch outcome emits exactly the documented event sequence
  (golden-event tests piggyback on the phase-4A fixture game); a throwing
  sink is disarmed after one `internalError` and dispatch results are
  unaffected.
- Leak test: serialize every emitted event for a full fixture game and assert
  no value deep-equals any hidden/private state slice content (structural
  scan for forbidden keys).
- Grep gates: no `__DREAMBOARD_AUTHORING_WARNINGS__` outside its removal
  changelog; `no-console` lint green.
- Cross-repo: gameplay executor + dev host adopt the sink behind their
  normal verification lanes (`verify:embedded`, `verify:browser`); the
  admission-scanner allowance removal lands only after both hosts are on the
  sink (two-step deploy noted in the PR).

## Acceptance Criteria

- Zero `console.*` in `reducer/bundle/**`; the authoring-warnings global is
  gone from the SDK.
- A scenario author can read `ctx.diagnostics.lastDispatch.trace` and see the
  instruction trail for any accepted submit.
- A rejected submit in tests prints `errorCode` + `ruleId` with no authoring.
- Default-configured production behavior is unchanged (no-op sink, identical
  projections, identical client console output).

## Risks

- **Ordering with the executor**: deleting the global before the executor
  passes a sink silently drops authoring warnings. Sequencing: SDK release
  N keeps reading the global *and* supports the sink; hosts migrate; SDK
  release N+1 deletes the global. Both steps inside this phase, two
  releases.
- Event taxonomy churn: keep the union small and additive; new event types
  are non-breaking by construction (sinks must ignore unknown `type`s —
  state this in the type's doc comment and test it with a synthetic event).
