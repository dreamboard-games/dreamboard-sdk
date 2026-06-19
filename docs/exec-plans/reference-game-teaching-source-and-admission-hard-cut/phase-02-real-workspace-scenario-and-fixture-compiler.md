# Phase 02: Real Workspace Scenario And Fixture Compiler

Status: proposed

Depends on: Phase 01

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repository: `dreamboard-sdk`

## Objective

Add the compiler path that derives Workbench fixtures from a real teaching
workspace: the authored reducer bundle, an authored behavior scenario, the
authored UI entrypoint, and a declarative browser replay recipe.

Do not switch live reference games in this phase. Phase 03 performs the
coordinated cutover and deletes the legacy compiler path.

## Target Scenario Ownership

Behavior scenarios remain the reducer authority:

```text
test/scenarios/*.scenario.ts
```

Workbench selection and browser replay live under:

```text
test/ui-scenarios/*.scenario.ts
```

A UI scenario may contain:

- behavior scenario import;
- viewer/seat selection;
- viewport and browser requirements;
- semantic browser replay steps;
- required capability tags;
- expected stable branch name.

It may not contain:

- game state literals that replace the behavior scenario;
- interaction legality;
- scoring;
- projection logic;
- a replacement reducer bundle;
- React components that replace `ui/index.tsx`.

## Public Testing Helper

Add a target helper under `@dreamboard-games/sdk/testing`:

```ts
export type ReferenceGameUIScenarioDefinition = {
  id: string;
  title: string;
  behaviorScenario: ReducerScenarioDefinition;
  viewer: {
    seatId: string;
    playerId?: string;
  };
  environment: {
    viewport: "desktop" | "phone";
    browsers: readonly ("chromium" | "webkit")[];
    input: readonly ("mouse" | "touch" | "keyboard")[];
  };
  replay: readonly UIScenarioReplayStep[];
  contracts: readonly UIContractId[];
};

export function defineReferenceGameUIScenario(
  definition: ReferenceGameUIScenarioDefinition,
): ReferenceGameUIScenarioDefinition {
  return definition;
}
```

Do not add a second replay language. Reuse `UIScenarioReplayStep` and the
existing semantic browser-interaction request types.

## Target Game Scenario

Example target file:

```ts
// <game-root>/test/ui-scenarios/pass-three.mobile.scenario.ts
import { defineReferenceGameUIScenario } from "@dreamboard-games/sdk/testing";
import { passThree } from "../scenarios/pass-three.scenario";

export default defineReferenceGameUIScenario({
  id: "hearts.pass-three.mobile",
  title: "Hearts: pass three cards",
  behaviorScenario: passThree,
  viewer: {
    seatId: "south",
    playerId: "south",
  },
  environment: {
    viewport: "phone",
    browsers: ["chromium", "webkit"],
    input: ["touch"],
  },
  contracts: [
    "CardFace",
    "HandView",
    "InteractionSubmit",
    "Panel",
    "PluginRuntime",
  ],
  replay: [
    {
      exercise: "activate",
      request: {
        intent: "select",
        interactionRef: "pass-three",
        target: { kind: "card", id: "two-clubs" },
      },
    },
    {
      exercise: "activate",
      request: {
        intent: "select",
        interactionRef: "pass-three",
        target: { kind: "card", id: "queen-spades" },
      },
    },
    {
      exercise: "activate",
      request: {
        intent: "select",
        interactionRef: "pass-three",
        target: { kind: "card", id: "ace-hearts" },
      },
    },
    {
      exercise: "activate",
      request: {
        intent: "submit",
        interactionRef: "pass-three",
      },
    },
  ],
});
```

The exact target request fields must match the existing public
browser-interaction schema. Do not add game-specific selectors.

## Workspace Loader

Create a loader that consumes `reference-game.json` entrypoints:

```ts
type LoadedReferenceGameWorkspace = {
  metadata: ReferenceGameMetadataV2;
  reducerBundle: ReducerBundleContract;
  uiEntry: string;
  behaviorScenarios: Map<string, ReducerScenarioDefinition>;
  uiScenarios: Map<string, ReferenceGameUIScenarioDefinition>;
};

export async function loadReferenceGameWorkspace(
  gameRoot: string,
): Promise<LoadedReferenceGameWorkspace>;
```

Rules:

- resolve every entrypoint relative to `gameRoot`;
- reject absolute paths and `..` traversal;
- require every resolved path to remain inside `gameRoot`;
- load through normal ESM/build tooling;
- import only public SDK package subpaths;
- fail if a UI scenario references a behavior scenario outside its workspace;
- fail if two scenarios share an ID.

## Reducer Authority

Refactor `scripts/ui-fixtures/authority/reducer-authority.mjs` to accept the
real reducer bundle and behavior scenario:

```ts
export async function executeReferenceGameAuthority({
  reducerBundle,
  behaviorScenario,
  viewer,
}: {
  reducerBundle: ReducerBundleContract;
  behaviorScenario: ReducerScenarioDefinition;
  viewer: ScenarioViewer;
}) {
  const runner = createReducerScenarioRunner({
    bundle: reducerBundle,
    scenario: behaviorScenario,
  });
  const trace = await runner.run();
  return compileProtocolTapeFromReducerTrace({ trace, viewer });
}
```

Delete all shape inference from `coverage.replay.kind` in the new path.

## Real UI Render Module

Generate fixture render modules as forwarders to the actual UI entrypoint:

```js
export { default as Root } from "./workspace/ui/index.js";
export const uiContractFingerprint = "sha256:...";
export const referenceGameSourceDigest = "sha256:...";
```

If the authored entrypoint exports `App` rather than `Root`, provide one generic
adapter in the compiler. Do not add per-game adapter files.

## Fixture Provenance

Extend fixture source metadata:

```ts
source: {
  referenceGameSourceDigest: `sha256:${string}`;
  sourceProvenance: { kind: "worktree" } | {
    kind: "git";
    revision: string;
  };
  gameSourceSha256: `sha256:${string}`;
  behaviorScenario: string;
  uiScenario: string;
  reducerFingerprint: string;
  uiContractFingerprint: string;
  renderModule: string;
  renderModuleDigest: string;
}
```

The compiler must first create one frozen source snapshot, compute the source
manifest from that snapshot, and compile the reducer, scenarios, and UI from
the same snapshot. It must not hash the live tree and then import mutable live
files.

Normal authoring records `sourceProvenance.kind: "worktree"` and no revision.
Release proof supplies an expected exact-Git `bundleDigest`; compilation fails
if the snapshot digest differs. This allows pre-commit fixture generation
without pretending that a future commit already exists.

## Compiler Structure

Create:

```text
scripts/ui-fixtures/workspace/
  load-reference-workspace.mjs
  execute-reference-scenario.mjs
  build-render-module.mjs
```

Refactor:

```text
scripts/ui-fixtures/compile-scenario.mjs
scripts/ui-fixtures/authority/reducer-authority.mjs
scripts/ui-fixtures/load-scenario-module.mjs
```

Do not modify `examples/ui-scenarios`; protocol-authoritative primitive
scenarios remain a separate valid source.

## Tests

Add a compiler-owned fixture workspace under a test fixture directory, not
under the live canonical games. Prove:

- real reducer bundle is invoked;
- changing reducer behavior changes the protocol tape digest;
- changing UI source changes the render-module digest;
- changing only browser replay changes the fixture digest but not reducer
  fingerprint;
- source mutation during compilation cannot produce a mixed snapshot;
- the same bytes under worktree and Git provenance produce the same source
  digest;
- a synthetic replacement bundle is rejected;
- a UI scenario with embedded game state is rejected if the type permits
  detection; otherwise prevent it by contract shape;
- path traversal and out-of-workspace imports fail;
- primitive protocol scenarios continue to compile unchanged.

## Verification

```sh
mise exec node@24 -- node --test scripts/ui-fixtures/authority/authority.test.mjs
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:fixtures:check
```

Expected:

- new compiler tests pass;
- existing live reference fixtures remain unchanged;
- primitive scenarios remain green.

## Exit Criteria

- One generic compiler path can execute a real reference workspace.
- The new path has no dependency on legacy coverage metadata.
- Fixture provenance includes the source-manifest digest.
- No live game has partially migrated.

## STOP Conditions

Stop and report if:

- authored scenario files cannot be executed without private CLI source;
- the real UI entrypoint depends on generated files unavailable in a clean
  packed consumer;
- the reducer scenario format cannot expose a deterministic trace;
- supporting real reducers would require embedding hidden reducer state in the
  portable fixture.
