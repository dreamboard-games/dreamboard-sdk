# Phase 04: UI Workbench And Agent Catalog

Status: source-complete.

## Objective

Deliver a standalone, private Workbench that lets humans and coding agents
discover, render, inspect, reset, and automate runtime-aware UI scenarios.

The Workbench consumes compiled fixtures. Opening it must not build a reference
game, start the internal stack, or contact a game authority.

## 04A. Create a private Workbench package

Add:

```text
packages/ui-workbench/
```

Suggested package metadata:

```json
{
  "name": "@dreamboard-games/ui-workbench",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "playwright test"
  }
}
```

Use a standalone Vite application instead of a runtime Storybook project. The
Workbench needs a stable scenario URL, strict fixture lifecycle, runtime
transcript panel, semantic inspector, and packed-candidate mode. Storybook
continues to own pure component stories.

## 04B. Generate the scenario catalog

Generate catalog entries from fixture bundle indexes. Do not hand-maintain a
second registry.

```ts
export interface UIScenarioCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly fixtureUrl: string;
  readonly renderModuleUrl: string;
  readonly components: readonly string[];
  readonly capabilities: readonly string[];
  readonly viewportTags: readonly string[];
  readonly sourceDigest: string;
}
```

Generated registration:

```ts
export const scenarios = defineUIScenarios([
  {
    id: "hearts.pass-three.mobile",
    title: "Pass three cards on phone",
    gameId: "hearts",
    fixtureUrl:
      "/fixtures/reference-games/hearts.pass-three.mobile.fixture.json",
    renderModuleUrl:
      "/fixtures/reference-games/modules/hearts.pass-three.mobile.mjs",
    components: ["HandView", "CardFace", "MobileHandTray"],
    capabilities: ["touch-drag", "runtime-draft", "runtime-submit"],
    viewportTags: ["phone", "touch"],
    sourceDigest: "sha256:...",
  },
]);
```

The generator fails if:

- fixture or render module files are missing;
- their digests differ from the bundle index;
- scenario IDs collide;
- component exports are unknown;
- required capability tags are unknown;
- fixture and render module contract fingerprints differ.

## 04C. Expose stable scenario routes

Required routes:

```text
/                         Catalog and filters
/scenario/:scenarioId     Interactive scenario
/scenario/:scenarioId?mode=test
/scenario/:scenarioId?panel=semantic
/scenario/:scenarioId?panel=runtime
```

The scenario page must expose stable readiness attributes:

```html
<main
  data-dreamboard-workbench="scenario"
  data-dreamboard-scenario-id="hearts.pass-three.mobile"
  data-dreamboard-scenario-status="ready"
  data-dreamboard-frame-id="frame-0"
>
  <!-- Real authored UI tree -->
</main>
```

Allowed statuses:

- `loading`;
- `ready`;
- `failed`;
- `complete`.

`mode=test` hides catalog chrome and fixes the scenario viewport. It does not
change the runtime behavior.

## 04D. Build human inspection tools

The interactive Workbench includes:

- game, mechanic, UI pattern, component, and capability filters;
- desktop, tablet, and phone viewport controls;
- reset and replay controls;
- current frame and projection digest;
- normalized browser-interaction snapshot;
- draft and submission digest timeline;
- runtime diagnostics;
- fixture source metadata and fingerprints;
- a link to the pure Storybook stories for each component.

The inspection panels render normalized data. They must not reach into React
component internals or expose hidden reducer state.

## 04E. Generate a component-scenario index

Replace the Phase 00 placeholder fields with a generated index:

```json
{
  "schemaVersion": 1,
  "components": {
    "HandView": {
      "sourceFiles": [
        "packages/sdk/src/ui/components/HandView.tsx",
        "packages/sdk/src/ui/components/hand-layout.ts"
      ],
      "storyIds": [
        "hands-handview--five-card-fan",
        "hands-handview--phone-portrait-thirteen"
      ],
      "scenarioIds": [
        "hearts.pass-three.mobile",
        "simultaneous-card-drafting.choose-card.mobile"
      ],
      "capabilities": [
        "pointer-drag",
        "touch-drag",
        "responsive-layout",
        "runtime-draft"
      ]
    }
  }
}
```

Generate source-file ownership using the TypeScript export graph and fixture
bundle component metadata.

Changed-scenario selection rules:

1. Map changed source files to public exports.
2. Add every scenario declaring those exports.
3. Add scenarios for changed shared CSS tokens or runtime adapters.
4. Add pure stories for the same exports.
5. If any changed file cannot be mapped safely, run the full UI suite.

The selection result must be written to an artifact before tests run.

Example:

```ts
const selection = selectImpactedUIScenarios({
  baseRef: "origin/main",
  changedFiles,
  componentScenarioIndex,
});

await writeJson("artifacts/ui/selection.json", selection);
```

## 04F. Expose agent-oriented commands

Root commands:

```jsonc
{
  "scripts": {
    "ui:workbench": "node scripts/ui/open-ui-workbench.mjs",
    "ui:workbench:dev": "pnpm --filter @dreamboard-games/ui-workbench dev",
    "ui:workbench:build": "pnpm --filter @dreamboard-games/ui-workbench build",
    "ui:catalog:generate": "node scripts/ui/generate-scenario-catalog.mjs",
    "ui:catalog:check": "node scripts/ui/generate-scenario-catalog.mjs --check",
    "ui:test": "node scripts/ui/run-ui-scenarios.mjs",
    "ui:test:changed": "node scripts/ui/run-ui-scenarios.mjs --changed",
  },
}
```

Supported focused usage:

```bash
pnpm ui:workbench --component HandView
pnpm ui:workbench --scenario hearts.pass-three.mobile
pnpm ui:test --scenario hearts.pass-three.mobile
pnpm ui:test --component HandView
pnpm ui:test --capability touch-drag
pnpm ui:test:changed --base origin/main
```

Unknown component or scenario IDs fail and print valid close matches.
`open-ui-workbench.mjs` translates the component or scenario filter into the
initial Workbench URL, starts `ui:workbench:dev`, and prints the deterministic
route used by browser automation.

## 04G. Emit an evidence receipt

Every automated run writes:

```text
artifacts/ui/<run-id>/
  receipt.json
  selection.json
  semantic/
  screenshots/
  traces/
  transcripts/
```

Receipt schema:

```ts
export interface UIAgentEvidenceReceipt {
  readonly schemaVersion: 1;
  readonly sdkCommit: string;
  readonly candidate: {
    readonly kind: "source" | "packed";
    readonly digest: string;
  };
  readonly changedExports: readonly string[];
  readonly selectedScenarios: readonly string[];
  readonly projects: readonly string[];
  readonly results: readonly {
    scenarioId: string;
    project: string;
    result: "passed" | "failed" | "skipped";
    projectionDigest: string;
    semanticDigest: string;
    submissionDigest: string;
    screenshotFiles: readonly string[];
    traceFile?: string;
    transcriptFile: string;
  }[];
}
```

The receipt is evidence, not a mutable baseline. Baseline updates remain an
explicit reviewed command.

## 04H. Seed representative scenarios

At minimum, catalog:

| Scenario                                        | Main coverage                               |
| ----------------------------------------------- | ------------------------------------------- |
| `hearts.pass-three.desktop`                     | Multi-select, commit, desktop hand          |
| `hearts.pass-three.mobile`                      | Mobile hand, touch path, action area        |
| `hearts.play-trick.mobile`                      | Hidden hand, valid card choice, shared area |
| `hex-network-trading.place-network`             | Hex board target and placement              |
| `hex-network-trading.trade-panel`               | Resource controls and submit                |
| `deck-building-market.buy-card`                 | Market row and purchase                     |
| `deck-building-market.play-action.mobile`       | Mobile hand and action panel                |
| `worker-placement-tableau.place-worker`         | Board target and modal/form                 |
| `worker-placement-tableau.pay-resources`        | Resource controls and validation            |
| `simultaneous-card-drafting.choose-card.mobile` | Simultaneous private choice and lock        |

Prefer a small, high-pressure catalog over every reducer scenario. Add a
scenario when it introduces a new component, capability, responsive mode, or
runtime path.

## Expected files

```text
packages/ui-workbench/package.json
packages/ui-workbench/src/app.tsx
packages/ui-workbench/src/catalog.ts
packages/ui-workbench/src/scenario-page.tsx
packages/ui-workbench/src/inspectors/**
packages/ui-workbench/vite.config.ts
scripts/ui/generate-scenario-catalog.mjs
scripts/ui/generate-component-scenario-index.mjs
scripts/ui/open-ui-workbench.mjs
scripts/ui/run-ui-scenarios.mjs
fixtures/ui/component-scenario-index.json
artifacts/ui/.gitignore
package.json
pnpm-lock.yaml
```

## Verification

```bash
pnpm ui:catalog:generate
pnpm ui:catalog:check
pnpm ui:workbench:build
pnpm ui:test --scenario hearts.pass-three.desktop
pnpm ui:test:changed --base origin/main
```

Manually verify:

- the catalog loads with the network disabled;
- a scenario can reset and replay repeatedly;
- semantic and runtime inspectors update after each action;
- changing `HandView` selects both Hearts and simultaneous drafting scenarios;
- an unmapped shared style change selects the full suite.

## Acceptance criteria

- The Workbench runs from a fresh SDK checkout without the internal repository.
- Opening a committed scenario does not compile a source game.
- Scenario registration is generated from fixture bundle indexes.
- Stable scenario URLs work for humans and browser automation.
- Agents can select scenarios by component or diff.
- Every run emits a complete, machine-readable evidence receipt.
- At least one runtime-aware scenario exists for every reference game.
- The Workbench is private and absent from published SDK package files.

## Risks and controls

| Risk                                               | Control                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Workbench becomes another hand-maintained demo app | Generate catalog and indexes from fixture bundles                        |
| Changed-test selection misses shared effects       | Full-suite fallback for unknown files and explicit shared-token mappings |
| Inspection UI changes scenario behavior            | Read normalized snapshots and transcripts only                           |
| Scenario count makes the fast loop slow            | Select by components/capabilities and keep representative fixtures       |
| Workbench assets leak into the SDK package         | Private package plus publication-boundary assertion                      |
