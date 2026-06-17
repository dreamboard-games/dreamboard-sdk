# Phase 03: Deterministic Fixture Runtime

Status: reopened on 2026-06-17 by the
[Plugin Runtime Contract Hard Cut](./plugin-runtime-contract-hard-cut.md).
`artifacts/phase-03-runtime.md` records the superseded fake-runtime
implementation.

## Objective

Run compiled UI fixtures through the same transport-agnostic runtime client,
runtime providers, generated contracts, draft store, interaction adapters, and
semantic projection marker used by production.

Replace only the browser host transport. An in-memory fixture host validates
each observable command against the compiled protocol tape and emits version 3
protocol frames to the real runtime client.

## 03A. Extract one runtime client core

`createPluginRuntimeAPI` currently owns browser messaging, protocol state,
commands, and subscriptions. Split it into a transport-agnostic
`PluginRuntimeClient` and a browser postMessage transport.

```ts
export interface PluginTransport {
  start(onMessage: (message: HostToPluginEnvelope) => void): () => void;
  send(message: PluginToHostPayload): void;
}

export function createPluginRuntimeClient(options: {
  transport: PluginTransport;
  idFactory?: RuntimeIdFactory;
  clock?: RuntimeClock;
}): PluginRuntimeClient;
```

The client owns:

- strict version 3 protocol parsing;
- immutable session state;
- the current gameplay frame;
- validation and submission request correlation;
- delivery acknowledgments and render commits;
- diagnostics and disconnect behavior.

It does not read `window`, `parent`, `location`, `Date.now()`, or
`crypto.randomUUID()` directly.

The browser adapter owns:

- channel negotiation;
- source and origin validation;
- envelope delivery over `window.postMessage`;
- browser lifecycle cleanup.

No runtime command accepts a caller-supplied player ID. The client derives
perspective and revision basis from the current gameplay frame.

## 03B. Keep one shared React shell

`PluginRuntime` remains the public browser entry point. Extract an internal
boundary so production and fixture execution share the same providers.

```tsx
// packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx
export function PluginRuntimeBoundary({
  runtime,
  children,
}: {
  runtime: PluginRuntimeClient;
  children: React.ReactNode;
}) {
  return (
    <RuntimeCommandProvider runtime={runtime}>
      <PluginSessionProvider runtime={runtime}>
        <PluginGameplayFrameProvider runtime={runtime}>
          <InteractionUiProvider>{children}</InteractionUiProvider>
        </PluginGameplayFrameProvider>
      </PluginSessionProvider>
    </RuntimeCommandProvider>
  );
}
```

Production constructs the browser transport and the shared client:

```tsx
export function PluginRuntime(props: PluginRuntimeProps) {
  const runtime = useMemo(() => {
    const transport = createPostMessagePluginTransport({
      timeout: props.timeout,
      onDiagnostic: props.onDiagnostic,
    });
    return createPluginRuntimeClient({ transport });
  }, [props.timeout, props.onDiagnostic]);

  return (
    <PluginRuntimeBoundary runtime={runtime}>
      {props.children}
    </PluginRuntimeBoundary>
  );
}
```

Session and gameplay frame providers are separate. The runtime command context
does not expose host-only history, notification, or perspective-switching
commands.

Do not add a raw runtime injection prop to authored game components. The
boundary remains internal to the SDK and testing exports.

## 03C. Implement a strict in-memory fixture host

Replace `createFixtureRuntime` with `createFixtureHostHarness`.

```ts
export interface FixtureHostEvent {
  readonly sequence: number;
  readonly atMs: number;
  readonly kind:
    | "frame-sent"
    | "validate-received"
    | "submit-received"
    | "ack-received"
    | "rendered-received"
    | "diagnostic";
  readonly requestDigest?: string;
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly result?: "accepted" | "rejected";
}

export interface FixtureHostHarness {
  readonly transport: PluginTransport;
  readonly tape: PluginProtocolTape;
  reset(): void;
  flush(): Promise<void>;
  advanceHost(): Promise<void>;
  getCurrentFrameId(): string;
  getEvents(): readonly FixtureHostEvent[];
  assertConsumed(): void;
}

export function createFixtureHostHarness(options: {
  tape: PluginProtocolTape;
  strict?: boolean;
  latencyMs?: number;
  onEvent?: (event: FixtureHostEvent) => void;
}): FixtureHostHarness;
```

Core submission behavior:

```ts
async function handleSubmit(command: SubmitInteractionCommand): Promise<void> {
  const requestDigest = digestTransportRequest(command);
  const exchange = consumeExpectedSubmit(command, requestDigest);

  sendSubmitResult(command.requestId, exchange.response);

  if (exchange.response.kind === "accepted") {
    await waitForConfiguredLatency();
    await drainHostFrameSteps();
  }
}
```

Validation returns a result and never publishes a frame:

```ts
function handleValidate(command: ValidateInteractionCommand): void {
  const requestDigest = digestTransportRequest(command);
  const exchange = consumeExpectedValidation(command, requestDigest);
  sendValidationResult(command.requestId, exchange.response);
}
```

The harness implements the host side of `PluginTransport`, not
`PluginRuntimeClient`. Unsupported commands fail with a fixture-specific
diagnostic. They must not silently succeed.

The harness drains the leading `host.frame` step during initialization and
drains post-submit host-frame steps only after the submit result has been sent.
`advanceHost()` delivers an explicit independent host frame for scenarios such
as another player's action or a timer. Validation itself never causes frame
delivery.

## 03D. Preserve production runtime semantics

The fixture path must reuse:

- `PluginRuntimeClient`;
- strict version 3 protocol parsing;
- `PluginRuntimeBoundary`;
- session and gameplay frame providers;
- `InteractionUiProvider`;
- `RuntimeSemanticProjectionMarker`;
- generated `UI.Root`;
- generated zone, board, hand, and form adapters;
- interaction preparation and draft logic;
- browser-interaction attributes and snapshot normalization;
- production projection and draft digest functions.

Do not fork or copy any of these into `packages/ui-workbench`.

The fixture host may own only:

- the compiled protocol tape;
- ordered protocol-step cursor;
- delivery sequence;
- event transcript;
- configurable simulated latency;
- reset and assertion controls.

It must not own a parallel session store, gameplay store, runtime API, or
projection assembler.

## 03E. Install a deterministic browser environment

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

Inject the clock and ID factory into `PluginRuntimeClient`; do not patch
production code paths or depend directly on `Date.now()`, `Math.random()`, or
`crypto.randomUUID()`.

The Workbench browser context should reject unexpected `fetch`, WebSocket, and
EventSource requests. Loading local fixture modules, fonts, and Workbench
assets remains allowed.

## 03F. Load game UI modules against the current SDK candidate

Each compiled render module from Phase 02 externalizes:

- `@dreamboard-games/sdk`;
- `@dreamboard-games/sdk/*`;
- `@dreamboard-games/plugin-runtime-contract`;
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
const harness = createFixtureHostHarness({
  tape: fixture.protocol,
  strict: true,
});
const runtime = createPluginRuntimeClient({ transport: harness.transport });

assertContractFingerprint(
  module.uiContractFingerprint,
  fixture.source.uiContractFingerprint,
);

root.render(
  <PluginRuntimeBoundary runtime={runtime}>
    <module.Root />
  </PluginRuntimeBoundary>,
);
```

## 03G. Record runtime evidence

Expose a read-only test bridge from the Workbench page:

```ts
declare global {
  interface Window {
    __dreamboardUIFixture?: {
      getScenarioId(): string;
      getFrameId(): string;
      getHostEvents(): readonly FixtureHostEvent[];
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

## 03H. Test browser and fixture transport parity

Run the same protocol contract suite against:

1. `createPostMessagePluginTransport` connected to an in-memory browser host;
2. `createFixtureHostHarness`.

Mount the same generated UI tree through `PluginRuntimeClient` for both and
compare:

- parsed session descriptor;
- gameplay frame and frame revision;
- rendered projection digest;
- browser-interaction semantic snapshot;
- initial draft digest;
- validation result with unchanged frame ID;
- submit payload digest;
- projected frame after accepted submit;
- explicit independent host-frame delivery;
- acknowledgment and render-commit sequence.

This is an SDK-level transport parity test, not the cross-repo real-host lane in
Phase 07.

## Expected files

```text
packages/plugin-runtime-contract/src/**
packages/sdk/src/runtime/core/create-plugin-runtime-client.ts
packages/sdk/src/runtime/core/runtime-store.ts
packages/sdk/src/runtime/browser/post-message-transport.ts
packages/sdk/src/runtime/components/PluginRuntime.tsx
packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx
packages/sdk/src/runtime/context/PluginGameplayFrameContext.tsx
packages/sdk/src/testing/ui-fixture/create-fixture-host-harness.ts
packages/sdk/src/testing/ui-fixture/deterministic-environment.ts
packages/sdk/src/testing/ui-fixture/*.test.tsx
packages/ui-workbench/src/runtime/load-scenario.ts
packages/ui-workbench/src/runtime/test-bridge.ts
```

## Verification

```bash
pnpm --filter @dreamboard-games/plugin-runtime-contract typecheck
pnpm --filter @dreamboard-games/plugin-runtime-contract test
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:fixtures:check
pnpm ui:runtime:test
```

Run every runtime test with:

- zero simulated latency;
- non-zero simulated latency;
- accepted validation with no frame transition;
- rejected validation;
- accepted submission with one frame transition;
- rejected submission with no frame transition;
- explicit independent host-frame transition;
- incomplete protocol tape;
- unexpected transport request;
- stale frame basis;
- protocol version mismatch;
- contract fingerprint mismatch.

## Acceptance criteria

- Production and fixture execution instantiate the same
  `PluginRuntimeClient`.
- Browser and fixture paths differ only in their `PluginTransport`
  implementation.
- The fixture host fails closed on unexpected or unconsumed protocol steps.
- Accepted validation never changes the current frame.
- Gameplay frames preserve `gameVersion`, `actionSetVersion`, and perspective.
- Generated UI, draft handling, semantic markers, and adapters are production
  implementations.
- A reference render module loads against both SDK source and a packed SDK.
- Runtime transcripts and digests are deterministic across repeated runs.
- `PluginStateSnapshot`, `createFixtureRuntime`, and fixture-only runtime state
  stores are deleted.

## Implementation receipt: 2026-06-17

SDK-side Phase 03 replacement work landed for the fixture and Workbench path:

- added `PluginRuntimeClient` under `packages/sdk/src/runtime/core/` with a
  transport-neutral version `3` protocol client;
- added `createPostMessagePluginTransport` under
  `packages/sdk/src/runtime/browser/`;
- added `createFixtureHostHarness` under
  `packages/sdk/src/testing/ui-fixture/`;
- changed `FixturePluginRuntime` and `packages/ui-workbench` scenario loading
  to use the real client plus in-memory host harness;
- deleted the old `createFixtureRuntime` implementation and removed it from
  testing exports.

Verification run:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
cd packages/sdk && mise exec node@24 -- bun test src/runtime/browser src/testing/ui-fixture src/export-surface.test.ts
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench test
```

Remaining work before Phase 03 and the hard cut fully close: migrate the
existing React primitive/provider surface away from `PluginStateSnapshot` and
actor-supplied command calls, then migrate the internal host to emit version
`3` frames through `@dreamboard-games/plugin-runtime-contract`.

## Risks and controls

| Risk                                           | Control                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Fixture behavior drifts from production client | Instantiate one runtime client with injected transports                |
| Host and SDK parse different wire shapes       | Import strict schemas from `plugin-runtime-contract` in both repos     |
| Validation accidentally mutates fixture state  | Encode validation as a distinct step with no frame reference           |
| Delivery IDs are mistaken for game revisions   | Keep envelope `sequence` separate from frame revision fields           |
| Compiled game module bundles an old SDK        | Externalize SDK, protocol contract, and React; inspect bundle contents |
| Determinism hooks leak into production         | Inject clock and ID interfaces into the core                           |
| Fixture host becomes a second authority        | Replay only compiled frames and command results                        |
