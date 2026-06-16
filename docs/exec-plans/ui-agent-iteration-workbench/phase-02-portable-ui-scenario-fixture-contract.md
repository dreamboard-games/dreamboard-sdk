# Phase 02: Portable UI Scenario Fixture Contract

Status: proposed.

## Objective

Define a versioned, portable scenario format that captures the observable game
state and host exchanges needed to run real generated UI without compiling the
source game.

The contract must reuse the existing browser-interaction protocol and runtime
snapshot types. It must not invent selectors or serialize hidden authority
state.

## 02A. Place the shared contract in the testing export

Add the schema and canonicalization helpers to:

```text
packages/sdk/src/testing/ui-fixture/
```

Export them from `@dreamboard-games/sdk/testing`. Keep the module serializable
and free of React or browser dependencies so both the SDK and internal fixture
compilers can use it.

Suggested exports:

```ts
export {
  UI_SCENARIO_FIXTURE_SCHEMA_VERSION,
  parseUIScenarioFixture,
  canonicalizeUIScenarioFixture,
  digestUIScenarioFixture,
  type UIScenarioFixture,
  type UIScenarioReplayStep,
  type UIFixtureTransportExchange,
} from "./ui-fixture/index.js";
```

## 02B. Model observable frames and transport exchanges

A fixture stores projected plugin snapshots and the transport exchanges visible
to the runtime. It never stores a reducer object, authority database row, or
private state that the plugin could not receive.

Example contract:

```ts
import type {
  BrowserInteractionEffectRequest,
  BrowserInteractionIntentRequest,
} from "@dreamboard-games/sdk/browser-interaction";
import type { PluginStateSnapshot } from "@dreamboard-games/sdk/runtime";

export interface UIScenarioFixtureV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly tags: readonly string[];
  readonly source: {
    readonly scenarioId: string;
    readonly reducerFingerprint: string;
    readonly uiContractFingerprint: string;
    readonly renderModule: string;
    readonly renderModuleDigest: string;
    readonly sourceDigest: string;
  };
  readonly viewer: {
    readonly seatId: string;
    readonly playerId?: string;
  };
  readonly environment: {
    readonly clockIso: string;
    readonly randomSeed: string;
    readonly locale: "en-US";
    readonly timezone: "UTC";
    readonly viewportTags: readonly (
      | "desktop"
      | "tablet"
      | "phone"
      | "touch"
    )[];
  };
  readonly frames: readonly UIFixtureFrame[];
  readonly transport: readonly UIFixtureTransportExchange[];
  readonly replay: readonly UIScenarioReplayStep[];
  readonly expected: {
    readonly initialProjectionDigest: string;
    readonly finalProjectionDigest: string;
    readonly finalSemanticDigest: string;
    readonly submissionDigest: string;
  };
}

export interface UIFixtureFrame {
  readonly id: string;
  readonly snapshot: PluginStateSnapshot;
  readonly projectionDigest: string;
}

export interface UIFixtureTransportExchange {
  readonly id: string;
  readonly fromFrameId: string;
  readonly operation: "validate" | "submit" | "refresh";
  readonly requestDigest: string;
  readonly response:
    | {
        readonly kind: "accepted";
        readonly nextFrameId: string;
      }
    | {
        readonly kind: "rejected";
        readonly diagnostics: readonly {
          readonly code: string;
          readonly message: string;
        }[];
      };
}

export type UIScenarioReplayStep =
  | {
      readonly id: string;
      readonly kind: "interaction";
      readonly resolve:
        | BrowserInteractionIntentRequest
        | BrowserInteractionEffectRequest;
      readonly execute:
        | { readonly kind: "activate" }
        | { readonly kind: "fill"; readonly value: string }
        | {
            readonly kind: "drag";
            readonly target: BrowserInteractionEffectRequest;
          };
      readonly expect: UIStepExpectation;
    }
  | {
      readonly id: string;
      readonly kind: "assert";
      readonly expect: UIStepExpectation;
    };
```

`UIStepExpectation` should support observable contracts, not implementation
details:

```ts
export interface UIStepExpectation {
  readonly frameId?: string;
  readonly projectionDigest?: string;
  readonly semanticDigest?: string;
  readonly draftDigest?: string;
  readonly submissionDigest?: string;
  readonly focusedInteractionKey?: string;
  readonly visibleInteractionKeys?: readonly string[];
}
```

`renderModule` points to a compiled browser ESM module containing the generated
UI contract and the authored game UI tree required by the scenario. The module
must externalize all `@dreamboard-games/sdk` imports. It must not bundle a copy
of the SDK, React, or the runtime, otherwise component edits would not be
visible in the Workbench.

The module is built only in the fixture compilation lane. Normal component
iteration consumes the committed or downloaded bundle and does not compile the
source game.

Example module contract:

```ts
import type { ComponentType } from "react";

export interface UIScenarioRenderModule {
  readonly uiContractFingerprint: string;
  readonly Root: ComponentType;
}

export const uiContractFingerprint = "sha256:...";
export const Root = AuthoredGameUI;
```

The `drag.target` request initially resolves an existing semantic actuator.
Phase 05 may extend browser-interaction with a pointer-target record if a drop
surface has no actuator. That extension belongs to the existing protocol and
requires a protocol version decision; it must not become a Workbench-only
selector.

## 02C. Store exact semantic identity as an assertion

The compiler should resolve each replay request against the source scenario and
record the exact identity it matched:

```ts
export interface UIResolvedReplayIdentity {
  readonly stepId: string;
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly actuatorId: string;
  readonly descriptorDigest?: string;
  readonly draftDigest?: string;
}
```

At replay time:

1. Resolve by intent or effect using the current semantic snapshot.
2. Assert that resolution is unique.
3. Compare the exact identity and descriptor digest when the fixture marks them
   stable.
4. Execute through the resolved actuator.

This preserves the existing internal browser demo contract's strongest
property: automation cannot silently fall back to text, labels, roles, or DOM
order.

## 02D. Build a compiler around reducer scenarios

Create shared compiler utilities under `@dreamboard-games/sdk/testing` and
repository adapters in:

```text
scripts/ui-fixtures/
examples/reference-games/<id>/scenarios/
```

Example compiler call:

```ts
import { compileUIScenarioFixture } from "@dreamboard-games/sdk/testing";

await compileUIScenarioFixture({
  id: "hearts.pass-three.mobile",
  sourceScenario: heartsScenarios.passThree,
  viewer: { seatId: "south", playerId: "player-1" },
  environment: {
    clockIso: "2026-01-01T00:00:00.000Z",
    randomSeed: "hearts-pass-three-v1",
    locale: "en-US",
    timezone: "UTC",
    viewportTags: ["phone", "touch"],
  },
  replay: [
    selectCard("two-clubs"),
    selectCard("queen-spades"),
    selectCard("ace-hearts"),
    commitSelection(),
  ],
  outputFile: "fixtures/ui/hearts.pass-three.mobile.fixture.json",
});
```

The compiler adapter is responsible for:

- starting from an existing reducer scenario;
- producing the viewer-specific `PluginStateSnapshot`;
- observing validation and submit exchanges;
- recording all projected frames;
- reading the runtime browser-interaction snapshot;
- resolving replay steps before writing them;
- canonicalizing and hashing the output;
- rejecting non-deterministic output.

The compiler runs the same input twice and compares the complete canonical
fixture bytes.

## 02E. Extract the portable replay core from the internal browser demo

The internal repository already has
`@dreamboard/browser-demo-scenario-contract` schema version `3.0.0` and a
compiled semantic replay executor. Do not leave two independent definitions of
interaction identity, effect requests, preparation, and expected digests.

Move the generic replay-step types and schemas into the SDK testing module:

```ts
export interface PortableSemanticReplayStep {
  readonly stepId: string;
  readonly resolve:
    | BrowserInteractionIntentRequest
    | BrowserInteractionEffectRequest;
  readonly execute: UIReplayExecution;
  readonly expectedIdentity?: UIResolvedReplayIdentity;
  readonly expect: UIStepExpectation;
}
```

Then:

- `UIScenarioFixture.replay` uses this public portable type;
- the internal browser demo contract composes the same type;
- internal-only seat materialization, live session, performance sampling, and
  release evidence remain in the internal contract;
- conversion tests compare the old compiled browser demo recipe with the new
  portable representation before the old generic fields are deleted.

Fixture schema version `1` and internal browser demo schema version `3.0.0` are
different contracts. Do not align their numbers artificially.

## 02F. Define the fixture bundle

Store fixtures in a bundle with an index:

```json
{
  "schemaVersion": 1,
  "bundleId": "reference-games@f2e8c12",
  "sdkCommit": "f2e8c12",
  "browserInteractionProtocol": "2.0.0",
  "fixtures": [
    {
      "id": "hearts.pass-three.mobile",
      "file": "hearts.pass-three.mobile.fixture.json",
      "sha256": "sha256:...",
      "renderModule": "modules/hearts.pass-three.mobile.mjs",
      "renderModuleSha256": "sha256:...",
      "components": ["HandView", "CardFace", "MobileHandTray"],
      "capabilities": ["touch-drag", "runtime-draft", "runtime-submit"]
    }
  ]
}
```

The bundle index is the input to the Workbench catalog and component-scenario
index in Phase 04.

## 02G. Provide fixture compatibility rules

The parser must fail closed when:

- the fixture schema version is unsupported;
- the browser-interaction protocol major version is unsupported;
- source or contract fingerprints are absent;
- a referenced frame or transport exchange is missing;
- a request digest does not match the runtime call;
- a semantic request resolves ambiguously;
- expected digests do not use the canonical algorithm;
- the fixture contains unknown top-level fields in a strict schema.

Schema changes follow these rules:

- additive optional fields may stay in the current major version;
- changed replay semantics, transport semantics, or canonicalization require a
  major fixture version;
- browser-interaction protocol changes follow their own version and
  compatibility declaration;
- compilers may read the previous major only during a bounded migration window;
- the Workbench reads committed fixtures and never upgrades them silently.

## Expected files

SDK repository:

```text
packages/sdk/src/testing/ui-fixture/index.ts
packages/sdk/src/testing/ui-fixture/schema.ts
packages/sdk/src/testing/ui-fixture/canonical.ts
packages/sdk/src/testing/ui-fixture/compiler.ts
packages/sdk/src/testing/ui-fixture/*.test.ts
scripts/ui-fixtures/compile-reference-fixtures.mjs
scripts/ui-fixtures/check-fixtures.mjs
fixtures/ui/reference-games/index.json
fixtures/ui/reference-games/*.fixture.json
fixtures/ui/reference-games/modules/*.mjs
```

Internal repository:

```text
packages/browser-demo-scenario-contract/src/**
scripts/ui-fixtures/compile-internal-fixtures.*
fixtures/ui/internal-golden/index.json
```

Internal private fixture output must stay in the internal repository or its
artifact store.

## Verification

```bash
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:fixtures:compile
pnpm ui:fixtures:check
```

Run each compiler twice from clean output directories and compare:

```bash
shasum -a 256 fixtures/ui/reference-games/*
```

Add negative tests for unsupported versions, ambiguous interactions, changed
request digests, missing frames, and non-deterministic output.

## Acceptance criteria

- `@dreamboard-games/sdk/testing` exposes one strict fixture schema and
  canonical digest implementation.
- At least one fixture from each reference game compiles deterministically.
- Every fixture render module externalizes the SDK and React dependencies.
- Fixtures contain only projected snapshots and observable transport
  exchanges.
- Replay steps resolve through the existing browser-interaction protocol.
- The UI fixture and internal browser demo schemas share one portable semantic
  replay-step contract.
- No text, label, role, CSS, XPath, test ID, or DOM-position selector appears
  in the fixture schema.
- The bundle index maps scenarios to components and required capabilities.
- The internal compiler can produce private fixtures with the same schema.

## Risks and controls

| Risk                                                  | Control                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| Fixture becomes a frozen mock unrelated to production | Compile from real reducer scenarios and record real projected frames |
| Schema leaks authority internals                      | Restrict to plugin snapshots and observable transport exchanges      |
| Replay semantics diverge from browser demo automation | Import browser-interaction request types and canonical resolver      |
| Fixture regeneration causes opaque churn              | Canonical JSON, stable seeds, content digests, and two-run check     |
| Protocol extension is hidden in Workbench code        | Require browser-interaction version review for new gesture records   |
