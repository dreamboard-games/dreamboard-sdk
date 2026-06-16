# Phase 03: Deterministic Fixture Runtime

Status: source-complete on 2026-06-17. Receipt:
`artifacts/phase-03-runtime.md`.

## Objective

Run compiled UI fixtures through the same runtime providers, generated
contracts, draft store, interaction adapters, and semantic projection marker
used by production.

Replace only the host transport. The fixture runtime must validate each
observable host exchange against the compiled scenario tape and emit the next
projected frame.

## 03A. Extract one shared runtime shell

`PluginRuntime` currently owns both host initialization and the provider tree.
Extract an internal shell so production and fixture execution cannot drift.

Target shape:

```tsx
// packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx
export function PluginRuntimeBoundary({
  runtime,
  children,
}: {
  runtime: PluginRuntimeAPI;
  children: React.ReactNode;
}) {
  return (
    <RuntimeProvider runtime={runtime}>
      <SessionScopedInteractionUiProvider>
        {children}
      </SessionScopedInteractionUiProvider>
    </RuntimeProvider>
  );
}
```

Production `PluginRuntime` remains the public host-facing entry point:

```tsx
export function PluginRuntime(props: PluginRuntimeProps) {
  const state = usePluginRuntime({
    timeout: props.timeout,
    onDiagnostic: props.onDiagnostic,
  });

  if (!state.isReady) {
    return renderRuntimeStatus(state, props);
  }

  return (
    <PluginRuntimeBoundary runtime={state.runtime}>
      {props.children}
    </PluginRuntimeBoundary>
  );
}
```

Export a fixture-specific wrapper only from
`@dreamboard-games/sdk/testing`:

```tsx
export function FixturePluginRuntime({
  harness,
  children,
}: {
  harness: FixtureRuntimeHarness;
  children: React.ReactNode;
}) {
  return (
    <PluginRuntimeBoundary runtime={harness.runtime}>
      {children}
    </PluginRuntimeBoundary>
  );
}
```

Do not add a raw `runtime` injection prop to normal authored game code. The
testing export is the deliberate boundary.

## 03B. Implement a strict fixture transport

Create `createFixtureRuntime` in the testing export.

```ts
export interface FixtureRuntimeEvent {
  readonly sequence: number;
  readonly atMs: number;
  readonly kind: "frame" | "validate" | "submit" | "refresh" | "diagnostic";
  readonly requestDigest?: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly result?: "accepted" | "rejected";
}

export interface FixtureRuntimeHarness {
  readonly runtime: PluginRuntimeAPI;
  readonly fixture: UIScenarioFixture;
  reset(): void;
  flush(): Promise<void>;
  getCurrentFrameId(): string;
  getEvents(): readonly FixtureRuntimeEvent[];
  assertConsumed(): void;
}

export function createFixtureRuntime(options: {
  fixture: UIScenarioFixture;
  strict?: boolean;
  latencyMs?: number;
  onEvent?: (event: FixtureRuntimeEvent) => void;
}): FixtureRuntimeHarness;
```

Core behavior:

```ts
async function submitInteraction(
  playerId: string,
  interaction: string,
  payload: unknown,
): Promise<void> {
  const requestDigest = digestTransportRequest({
    operation: "submit",
    playerId,
    interaction,
    payload,
  });
  const exchange = consumeExpectedExchange("submit", requestDigest);

  record({
    kind: "submit",
    requestDigest,
    result: exchange.response.kind,
  });

  if (exchange.response.kind === "rejected") {
    throw fixtureRejection(exchange.response.diagnostics);
  }

  await waitForConfiguredLatency();
  publishFrame(exchange.response.nextFrameId);
}
```

The harness must implement the complete `PluginRuntimeAPI` surface needed by
the real provider tree:

- `getSessionState`;
- session subscriptions;
- `getSnapshot`;
- state subscriptions;
- `validateInteraction`;
- `submitInteraction`;
- `disconnect`;
- `switchPlayer`;
- diagnostics used by generated adapters.

Unsupported operations fail with a fixture-specific diagnostic. They must not
silently succeed.

## 03C. Preserve production runtime semantics

The fixture path must reuse:

- `RuntimeProvider`;
- `PluginSessionContext`;
- `InteractionUiProvider`;
- `RuntimeSemanticProjectionMarker`;
- generated `UI.Root`;
- generated zone, board, hand, and form adapters;
- interaction preparation and draft logic;
- browser-interaction attributes and snapshot normalization;
- production projection and draft digest functions.

Do not fork or copy any of these into `packages/ui-workbench`.

The fixture runtime may own only:

- the current projected frame;
- deterministic session metadata;
- expected transport exchange cursor;
- event transcript;
- configurable simulated latency;
- reset and assertion controls.

## 03D. Install a deterministic browser environment

The Workbench must control every browser input that can alter observable
output:

- time;
- random values;
- generated client action IDs;
- locale and timezone;
- animation and transition duration;
- viewport and device pixel ratio;
- font files and font loading;
- network access;
- fixture transport latency.

Expose a browser initialization payload:

```ts
export interface FixtureEnvironmentInit {
  readonly clockIso: string;
  readonly randomSeed: string;
  readonly locale: "en-US";
  readonly timezone: "UTC";
  readonly reducedMotion: true;
  readonly network: "blocked";
}
```

Use an injected deterministic ID factory in fixture runtime code instead of
depending on `Date.now()`, `Math.random()`, or `crypto.randomUUID()`.

The Workbench browser context should reject unexpected `fetch`, WebSocket, and
EventSource requests. Loading local fixture modules, fonts, and Workbench
assets remains allowed.

## 03E. Load game UI modules against the current SDK candidate

Each compiled render module from Phase 02 externalizes:

- `@dreamboard-games/sdk`;
- `@dreamboard-games/sdk/*`;
- `react`;
- `react-dom`.

The Workbench provides those imports using one of two modes:

```ts
export type SDKCandidateMode =
  | {
      readonly kind: "source";
      readonly sdkRoot: string;
    }
  | {
      readonly kind: "packed";
      readonly tarball: string;
      readonly sha256: string;
    };
```

`source` mode is the fast local loop. `packed` mode materializes an isolated
Workbench install and proves public exports and package content.

Before rendering, compare the module's `uiContractFingerprint` with the
fixture. Fail with a regeneration instruction if they differ.

Example mount:

```tsx
const fixture = await loadUIScenarioFixture(scenario.fixtureUrl);
const module = await loadUIScenarioRenderModule(scenario.renderModuleUrl);
const harness = createFixtureRuntime({ fixture, strict: true });

assertContractFingerprint(
  module.uiContractFingerprint,
  fixture.source.uiContractFingerprint,
);

root.render(
  <FixturePluginRuntime harness={harness}>
    <module.Root />
  </FixturePluginRuntime>,
);
```

## 03F. Record runtime evidence

Expose a read-only test bridge from the Workbench page:

```ts
declare global {
  interface Window {
    __dreamboardUIFixture?: {
      getScenarioId(): string;
      getFrameId(): string;
      getRuntimeEvents(): readonly FixtureRuntimeEvent[];
      getProjectionDigest(): string;
      reset(): Promise<void>;
      assertConsumed(): void;
    };
  }
}
```

This bridge is enabled only in Workbench test builds. It must not be exported by
the SDK or included in production game packages.

The transcript must use canonical values and omit timestamps that are not
derived from the fixture clock.

## 03G. Test production and fixture shell parity

Add contract tests that mount the same generated UI tree twice:

1. with the production shell and an injected in-memory host message sequence;
2. with `FixturePluginRuntime` and the compiled fixture.

Compare:

- rendered projection digest;
- browser-interaction semantic snapshot;
- initial draft digest;
- session identity;
- submit payload digest;
- projected frame after submit.

This is an SDK-level shell parity test, not the cross-repo real-host lane in
Phase 07.

## Expected files

```text
packages/sdk/src/runtime/components/PluginRuntime.tsx
packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx
packages/sdk/src/testing/ui-fixture/create-fixture-runtime.ts
packages/sdk/src/testing/ui-fixture/FixturePluginRuntime.tsx
packages/sdk/src/testing/ui-fixture/deterministic-environment.ts
packages/sdk/src/testing/ui-fixture/*.test.tsx
packages/ui-workbench/src/runtime/load-scenario.ts
packages/ui-workbench/src/runtime/test-bridge.ts
```

## Verification

```bash
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:fixtures:check
pnpm ui:runtime:test
```

Run every runtime test with:

- zero simulated latency;
- non-zero simulated latency;
- accepted validation and submission;
- rejected validation and submission;
- incomplete exchange tape;
- unexpected transport request;
- contract fingerprint mismatch.

## Acceptance criteria

- Production and fixture execution share one provider shell.
- The fixture runtime implements the required `PluginRuntimeAPI` behavior and
  fails closed on unexpected exchanges.
- Generated UI, draft handling, semantic markers, and adapters are production
  implementations.
- A reference render module loads against both SDK source and a packed SDK.
- Normal component iteration does not compile a source game.
- Runtime transcripts and digests are deterministic across repeated runs.
- No global runtime singleton is required by fixture tests.

## Risks and controls

| Risk                                         | Control                                                     |
| -------------------------------------------- | ----------------------------------------------------------- |
| Fixture provider tree drifts from production | Extract one internal boundary used by both                  |
| Compiled game module bundles an old SDK      | Externalize SDK imports and inspect bundle contents         |
| Tape accepts the wrong request               | Canonical request digest and strict ordered consumption     |
| Determinism patches leak into production     | Keep initialization and bridge in testing/Workbench exports |
| Fixture runtime becomes a second authority   | It may replay only recorded projected frames and exchanges  |
