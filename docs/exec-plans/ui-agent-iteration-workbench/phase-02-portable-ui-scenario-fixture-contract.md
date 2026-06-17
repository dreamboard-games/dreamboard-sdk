# Phase 02: Portable UI Scenario Fixture Contract

Status: complete on 2026-06-17 after the
[Plugin Runtime Contract Hard Cut](./plugin-runtime-contract-hard-cut.md).
`artifacts/phase-02-fixture-contract.md` records the original version 1
implementation; the hard-cut amendment and
`artifacts/plan-closeout.md` record the accepted version 2 boundary.

The existing implementation proved deterministic serialization and portable
semantic replay, but it serialized `PluginStateSnapshot` and compiled through
`createTestRuntime`. Those two choices are no longer accepted completion
evidence. Preserve the replay work and regenerate the fixture bundle after the
runtime contract hard cut.

## Objective

Define a versioned, portable scenario format that captures the observable game
state and host exchanges needed to run real generated UI without compiling the
source game.

The contract reuses the existing browser-interaction protocol and the
standalone `@dreamboard-games/plugin-runtime-contract` frame schemas. It must
not invent selectors, serialize hidden authority state, or include host chrome
in gameplay frames.

## 02A. Separate runtime and fixture contracts

Place plugin session, gameplay frame, wire protocol, projection materialization,
and frame digest contracts in:

```text
packages/plugin-runtime-contract/
```

Place UI fixture composition, browser replay, and fixture canonicalization in:

```text
packages/sdk/src/testing/ui-fixture/
```

Export fixture APIs from `@dreamboard-games/sdk/testing`. Both packages remain
serializable and free of React or browser dependencies. The internal host
imports the runtime contract package; private fixture compilers may additionally
import the SDK testing export.

Suggested exports:

```ts
export {
  UI_SCENARIO_FIXTURE_SCHEMA_VERSION,
  parseUIScenarioFixture,
  canonicalizeUIScenarioFixture,
  digestUIScenarioFixture,
  type UIScenarioFixture,
  type UIScenarioReplayStep,
  type PluginProtocolTape,
  type UIFixtureProtocolStep,
} from "./ui-fixture/index.js";
```

## 02B. Model an ordered protocol tape

A fixture stores a plugin session descriptor once, revisioned gameplay frames,
and ordered host/client protocol steps visible to the runtime. It never stores a
reducer object, authority database row, host activity queue, or private state
that the plugin could not receive.

Example contract:

```ts
import type {
  BrowserInteractionEffectRequest,
  BrowserInteractionIntentRequest,
} from "@dreamboard-games/sdk/browser-interaction";
import type {
  PluginGameplayFrame,
  PluginSessionDescriptor,
  SubmissionResult,
  ValidationResult,
} from "@dreamboard-games/plugin-runtime-contract";

export interface UIScenarioFixtureV2 {
  readonly schemaVersion: 2;
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
  readonly protocol: PluginProtocolTape;
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
  readonly frame: PluginGameplayFrame;
  readonly projectionDigest: string;
}

export interface PluginProtocolTape {
  readonly session: PluginSessionDescriptor;
  readonly frames: readonly UIFixtureFrame[];
  readonly steps: readonly UIFixtureProtocolStep[];
}

export type UIFixtureProtocolStep =
  | {
      readonly id: string;
      readonly kind: "host.frame";
      readonly frameId: string;
    }
  | {
      readonly id: string;
      readonly fromFrameId: string;
      readonly kind: "client.validate";
      readonly requestDigest: string;
      readonly response: ValidationResult;
    }
  | {
      readonly id: string;
      readonly fromFrameId: string;
      readonly kind: "client.submit";
      readonly requestDigest: string;
      readonly response: SubmissionResult;
    };

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
must externalize all `@dreamboard-games/sdk` and
`@dreamboard-games/plugin-runtime-contract` imports. It must not bundle a copy
of the SDK, protocol contract, React, or the runtime, otherwise component edits
would not be visible in the Workbench.

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

The reducer scenario runner is responsible for:

- starting from an existing reducer scenario;
- deterministic reducer validation and dispatch;
- recording reducer states and raw seat projections in a non-portable trace;
- distinguishing observational validation from state-changing submission;
- assigning stable reducer frame and exchange IDs.

The protocol tape compiler is responsible for:

- materializing viewer-specific `PluginGameplayFrame` values through the shared
  contract helper;
- preserving `gameVersion` and `actionSetVersion`;
- adding explicit fixture session/player metadata once;
- recording validation results without a next frame;
- recording submit results and subsequent host-frame emissions as separate
  ordered steps;
- canonicalizing and hashing the protocol tape.

The UI fixture compiler is responsible for:

- combining the protocol tape with render module identity and environment
  controls;
- reading the runtime browser-interaction snapshot;
- resolving replay steps before writing them;
- recording browser and semantic expectations;
- canonicalizing and hashing the complete fixture;
- rejecting non-deterministic output.

The reducer runner and protocol tape compiler may not import
`createTestRuntime`, `PluginRuntimeAPI`, React, or a browser transport. The UI
fixture compiler exercises the real runtime client through the in-memory host
defined in Phase 03; it does not execute reducers.

Land the schema, reducer runner, and protocol tape compiler before Phase 03.
Regenerate the final browser-enriched fixture bundle after the Phase 03
in-memory host is available. Phase 02 and Phase 03 close together at that
integration point.

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

Fixture schema version `2` and internal browser demo schema version `3.0.0` are
different contracts. Do not align their numbers artificially.

## 02F. Define the fixture bundle

Store fixtures in a bundle with an index:

```json
{
  "schemaVersion": 2,
  "bundleId": "reference-games@f2e8c12",
  "sdkCommit": "f2e8c12",
  "pluginRuntimeProtocol": 3,
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
- a referenced frame or protocol step is missing;
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
- migration tooling may read version `1` only until committed fixtures are
  regenerated;
- the final compiler and Workbench parser support version `2` only;
- the Workbench reads committed fixtures and never upgrades them silently.

## Expected files

SDK repository:

```text
packages/sdk/src/testing/ui-fixture/index.ts
packages/sdk/src/testing/ui-fixture/schema.ts
packages/sdk/src/testing/ui-fixture/canonical.ts
packages/sdk/src/testing/ui-fixture/compiler.ts
packages/sdk/src/testing/ui-fixture/compile-plugin-protocol-tape.ts
packages/sdk/src/testing/ui-fixture/*.test.ts
packages/sdk/src/testing/reducer-scenario/create-reducer-scenario-runner.ts
packages/sdk/src/testing/reducer-scenario/types.ts
packages/plugin-runtime-contract/src/**
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
pnpm --filter @dreamboard-games/plugin-runtime-contract typecheck
pnpm --filter @dreamboard-games/plugin-runtime-contract test
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
- Every fixture render module externalizes the SDK, plugin runtime contract,
  and React dependencies.
- Fixtures contain only plugin session metadata, gameplay frames, and
  observable protocol steps.
- Gameplay frames preserve authority `gameVersion` and `actionSetVersion`.
- Accepted validation does not advance the fixture frame.
- The fixture compiler does not import `createTestRuntime` or
  `PluginStateSnapshot`.
- Replay steps resolve through the existing browser-interaction protocol.
- The UI fixture and internal browser demo schemas share one portable semantic
  replay-step contract.
- No text, label, role, CSS, XPath, test ID, or DOM-position selector appears
  in the fixture schema.
- The bundle index maps scenarios to components and required capabilities.
- The internal compiler can produce private fixtures with the same schema.

## Risks and controls

| Risk                                                  | Control                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Fixture becomes a frozen mock unrelated to production | Compile reducer traces and materialize frames through the production contract helper |
| Schema leaks authority or host internals              | Serialize only session metadata, gameplay frames, and protocol steps                 |
| Replay semantics diverge from browser demo automation | Import browser-interaction request types and canonical resolver                      |
| Fixture regeneration causes opaque churn              | Canonical JSON, stable seeds, content digests, and two-run check                     |
| Protocol extension is hidden in Workbench code        | Require protocol version review for changed frame, command, or gesture semantics     |

## Implementation receipt: 2026-06-17

SDK-side Phase 02 replacement work landed in this repository:

- added `@dreamboard-games/plugin-runtime-contract` with protocol version `3`,
  plugin session/frame schemas, projection materialization, and action-set
  hashing;
- replaced the UI fixture schema with schema version `2`, `PluginProtocolTape`,
  `PluginGameplayFrame`, and strict bundle parsing;
- added reducer scenario trace contracts and a trace-to-protocol-tape compiler;
- regenerated all five reference-game fixtures with protocol tape frames and
  explicit host/client steps;
- removed `createTestRuntime` from reference fixture compilation;
- updated render-module checks so React, the SDK runtime, and the plugin
  runtime contract are externalized.

Verification run:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/plugin-runtime-contract typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/plugin-runtime-contract test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
cd packages/sdk && mise exec node@24 -- bun test src/testing/ui-fixture src/export-surface.test.ts
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm exports:check
mise exec node@24 -- pnpm pack:consumer-check
mise exec node@24 -- node scripts/assert-sdk-tarball-self-contained.mjs
mise exec node@24 -- pnpm docs:check
```

Follow-up hard-cut work is now recorded as closed in
`plugin-runtime-contract-hard-cut.md`: the transitional runtime adapter was
removed, fixtures and Workbench run through the real `PluginRuntimeClient` and
`createFixtureHostHarness`, the internal host sends shared protocol version
`3` frames, and the final SDK/internal deletion gates returned no live matches.

## Remaining-gap closure receipt: 2026-06-17

The final fixture portability gaps are closed:

- reference fixtures now compile reducer traces, mount the authored React UI in
  `happy-dom`, read the rendered browser-interaction attributes, resolve and
  activate the semantic actuator, and consume the real runtime protocol tape;
- `readBrowserInteractionSnapshot` is a public browser-interaction helper with
  focused DOM filtering coverage;
- every reference game provides an authored fixture render module, and all five
  generated bundles pass deterministic two-run compilation;
- the internal private compiler now emits and validates the same strict
  `UIScenarioFixture` schema version `2` and bundle index version `2`;
- fixture protocol frame and step schemas are direct aliases of the shared
  plugin runtime contract instead of an SDK-maintained duplicate.

Final verification:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk build
cd packages/sdk && mise exec node@24 -- bun test src/browser-interaction src/testing/ui-fixture src/runtime src/export-surface.test.ts
mise exec node@24 -- node scripts/ui-fixtures/compile-reference-fixtures.mjs
mise exec node@24 -- node scripts/ui-fixtures/check-fixtures.mjs
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench test
cd /Users/kevintang/code/internal
mise exec node@24 -- node scripts/ui-fixtures/compile-internal-fixtures.mjs
mise exec node@24 -- node scripts/ui-fixtures/check-internal-fixtures.mjs
```
