# Phase 00: Decision Freeze And Executable Baseline

Status: proposed.

## Objective

Freeze the architectural boundaries and make the current Storybook interaction
and visual claims executable before adding a new Workbench.

This phase does not change the public UI authoring API. It establishes a
trustworthy baseline and prevents the Workbench from absorbing responsibilities
that belong to Storybook, reducer tests, or the real host.

## Current baseline

The implementation team should verify these facts again at phase start:

- `packages/sdk/src/ui/stories/README.md` intentionally limits stories to pure
  components, controlled props, and local state.
- `packages/sdk/.storybook/visual-baselines.ts` declares visual cases.
- `.storybook/visual-runner.config.ts` points Playwright at
  `packages/sdk/visual/`.
- No committed visual spec currently consumes `VISUAL_BASELINES`.
- Storybook checks are not part of the root `check` command.
- `packages/sdk` declares `playwright` while the visual config imports
  `playwright/test`. The test package and CLI ownership need to be made
  explicit.

Record the verified state in
`docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-00-baseline.md`.

## 00A. Freeze the test-surface contract

Add a short architecture record at
`docs/architecture/ui-test-surfaces.md`.

The record must define:

| Concern                        | Canonical owner                             |
| ------------------------------ | ------------------------------------------- |
| Pure presentational states     | Storybook                                   |
| Runtime-generated UI scenarios | UI Workbench                                |
| Reducer correctness            | Game reducer scenario tests                 |
| Browser semantic resolution    | `@dreamboard-games/sdk/browser-interaction` |
| Packed package correctness     | Isolated consumer verifier                  |
| Production host parity         | Internal repository                         |

The architecture record must explicitly reject:

- mocked copies of `PluginRuntime` inside individual stories;
- text, label, role, or DOM-position selectors as the agent protocol;
- fixture files containing hidden canonical reducer state;
- source-only SDK imports from consumer fixtures;
- a second replay language in the Workbench.

## 00B. Make the visual baseline list executable

Add `@playwright/test` as an explicit SDK development dependency and use its
runner consistently. Create a visual spec that imports every declared baseline.

Example:

```ts
// packages/sdk/visual/story-baselines.spec.ts
import { expect, test } from "@playwright/test";

import { VISUAL_BASELINES } from "../.storybook/visual-baselines.js";

for (const baseline of VISUAL_BASELINES) {
  for (const viewport of baseline.viewports) {
    test(`${baseline.storyId} @ ${viewport}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== viewport);

      await page.goto(
        `/iframe.html?id=${encodeURIComponent(baseline.storyId)}&viewMode=story`,
      );
      await page.locator("#storybook-root").waitFor();
      await page.evaluate(() => document.fonts.ready);

      await expect(page.locator("#storybook-root")).toHaveScreenshot(
        `${baseline.storyId}.png`,
      );
    });
  }
}
```

Change `.storybook/visual-runner.config.ts` to import from
`@playwright/test`. Keep deterministic settings in one shared helper so the
Workbench can reuse them later:

```ts
// packages/sdk/test-support/deterministic-browser.ts
export const deterministicBrowserUse = {
  colorScheme: "light" as const,
  deviceScaleFactor: 1,
  locale: "en-US",
  reducedMotion: "reduce" as const,
  timezoneId: "UTC",
};
```

The visual spec must:

- fail if a declared story does not exist;
- fail if a declared viewport does not match a Playwright project;
- wait for fonts and stable layout;
- disable animation through both Playwright and the SDK reduced-motion mode;
- store snapshots under a deterministic package-relative path;
- retain a trace and screenshot diff on failure.

## 00C. Add an executable component coverage manifest

Create one typed manifest for exported interactive components. The manifest is
the future source for changed-component scenario selection.

Example:

```ts
// packages/sdk/src/ui/testing/component-coverage.ts
export interface ComponentCoverage {
  exportName: string;
  owner: string;
  storyIds: readonly string[];
  requiredCapabilities: readonly (
    | "click"
    | "keyboard"
    | "pointer-drag"
    | "touch-drag"
    | "responsive-layout"
    | "runtime-draft"
    | "runtime-submit"
  )[];
  workbenchScenarioIds: readonly string[];
}

export const COMPONENT_COVERAGE: readonly ComponentCoverage[] = [
  {
    exportName: "HandView",
    owner: "sdk-ui",
    storyIds: [
      "hands-handview--five-card-fan",
      "hands-handview--phone-portrait-thirteen",
    ],
    requiredCapabilities: ["pointer-drag", "touch-drag", "responsive-layout"],
    workbenchScenarioIds: [],
  },
];
```

During Phase 00, `workbenchScenarioIds` may be empty. Add a validator that
requires every exported interactive component to have:

- an owner;
- at least one Storybook story;
- explicit capability tags;
- no unknown story IDs;
- no duplicate export entries.

Phase 04 will make `workbenchScenarioIds` mandatory for runtime-dependent
capabilities.

## 00D. Add focused root commands

Expose stable root commands without immediately lengthening every existing
package test invocation:

```jsonc
{
  "scripts": {
    "ui:storybook": "pnpm --filter @dreamboard-games/sdk storybook",
    "ui:storybook:build": "pnpm --filter @dreamboard-games/sdk storybook:build",
    "ui:test:stories": "pnpm ui:storybook:build && pnpm --filter @dreamboard-games/sdk storybook:test",
    "ui:test:visual": "pnpm ui:storybook:build && pnpm --filter @dreamboard-games/sdk storybook:test:visual",
    "ui:coverage:check": "node scripts/ui/assert-component-coverage.mjs",
    "ui:check:baseline": "pnpm ui:coverage:check && pnpm ui:test:stories && pnpm ui:test:visual",
  },
}
```

Create a dedicated CI job for `ui:check:baseline`. Phase 08 decides when the
stable UI gate joins the root `check` command.

## 00E. Capture the baseline evidence

The phase artifact must include:

- Storybook version and browser versions;
- component export count;
- story count;
- visual baseline count by viewport;
- current interaction story count;
- current failures or approved baseline changes;
- runtime-dependent capabilities that have no Workbench coverage yet;
- exact commands and commit used for the baseline.

Do not approve broad screenshot churn during this phase. If the executable
runner reveals existing drift, record and review each changed baseline.

## Expected files

SDK repository:

```text
docs/architecture/ui-test-surfaces.md
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-00-baseline.md
packages/sdk/.storybook/visual-runner.config.ts
packages/sdk/package.json
packages/sdk/src/ui/testing/component-coverage.ts
packages/sdk/visual/story-baselines.spec.ts
packages/sdk/test-support/deterministic-browser.ts
scripts/ui/assert-component-coverage.mjs
package.json
pnpm-lock.yaml
```

No internal repository change is required in this phase.

## Verification

```bash
pnpm install
pnpm format:check
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:coverage:check
pnpm ui:test:stories
pnpm ui:test:visual
```

Also run the visual suite twice from a clean checkout. The second run must
produce no new files or diffs.

## Acceptance criteria

- The architecture boundary is documented and approved by SDK and internal
  host owners.
- Every entry in `VISUAL_BASELINES` is executed by Playwright.
- Missing stories, projects, snapshots, and component coverage entries fail
  deterministically.
- Storybook interaction and visual checks have one stable root command.
- The baseline artifact identifies all runtime and gesture coverage gaps.
- No public API or reference game is migrated in this phase.

## Risks and controls

| Risk                                              | Control                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| Existing screenshot drift hides a runner bug      | Review one component family at a time and run twice          |
| Storybook becomes the runtime test harness        | Enforce the architecture record in review                    |
| UI checks make the root gate flaky too early      | Keep a separate required CI job until Phase 08               |
| Coverage manifest becomes hand-maintained fiction | Validate exports and story IDs directly from build artifacts |
