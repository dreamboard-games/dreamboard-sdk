# Phase 00 Baseline

Date: 2026-06-16.

Scope:
`docs/exec-plans/ui-agent-iteration-workbench/phase-00-decision-freeze-and-executable-baseline.md`

Commit measured: `6adaadd`.

## Verified Starting State

- `packages/sdk/src/ui/stories/README.md` limits stories to pure components,
  controlled props, and local state.
- `packages/sdk/.storybook/visual-baselines.ts` declares visual cases.
- `packages/sdk/.storybook/visual-runner.config.ts` now points Playwright at
  `packages/sdk/visual/` and imports `@playwright/test`.
- `packages/sdk/visual/story-baselines.spec.ts` consumes every
  `VISUAL_BASELINES` entry and fails on unknown stories or projects.
- Storybook checks remain outside the root `check` command. Phase 00 adds the
  focused `ui:check:baseline` command and CI job instead.
- `@playwright/test` is now an explicit SDK dev dependency. The SDK unit-test
  script is scoped to `src` so Playwright specs remain owned by the visual
  runner.

## Versions

- Storybook: `10.4.5`.
- Playwright: `1.60.0`.
- Browser used by the visual projects: Chromium `148.0.7778.96`.
- Firefox and WebKit were not installed locally and are not part of this
  Phase 00 baseline; all configured visual projects use Chromium device
  profiles.

## Counts

- Public `@dreamboard-games/sdk/ui/components` value exports: 92.
- Storybook story count: 91.
- Storybook interaction story count: 35.
- Visual baseline screenshots: 39.
- Visual baseline count by viewport:
  - `desktop`: 31.
  - `phonePortrait`: 8.
  - `tabletPortrait`: 0.
- Checked-in screenshot files under
  `packages/sdk/visual/__screenshots__/story-baselines.spec.ts/`: 39.

## Approved Baseline Changes

- Added the initial visual snapshot set for all executable
  `VISUAL_BASELINES` entries.
- Corrected the stale declared story ID
  `hands-handview--thirteen-card-fan-compressed` to the actual Storybook ID
  `hands-handview--thirteen-card-compressed-fan`.
- Tightened the `ConvergesUnderCenteringParent` play assertion to verify a
  stable trailing layout window instead of failing on the expected first-frame
  resize from `720` to the settled width.

## Current Warnings

- Storybook build prints Vite warnings for package-level `"use client"`
  directives in Radix, Vaul, Framer Motion, and SDK internal UI modules. The
  build completes successfully.
- `test-storybook` prints non-fatal accessibility warning summaries for some
  existing stories. The configured Storybook test run still exits successfully.
- The local Storybook test run initially reported a Jest haste collision with
  `.dreamboard-dev/local-publish/.../@dreamboard-games__sdk/package.json`.
  This came from local generated publish artifacts, not the SDK source tree.

## Runtime Coverage Gaps

These interactive component exports require runtime-dependent capabilities but
intentionally have empty `workbenchScenarioIds` until the Workbench phases land:

- `CardDropTargetView`.
- `HandView`.
- `PrimaryActionButton`.
- `StagingZone`.

## Verification

Commands run with `mise exec node@24 -- ...` unless noted:

```bash
pnpm --filter @dreamboard-games/sdk add -D @playwright/test@1.60.0
pnpm install --frozen-lockfile
pnpm ui:coverage:check
pnpm format:check
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm ui:test:stories
pnpm --filter @dreamboard-games/sdk storybook:test:visual:update
pnpm --filter @dreamboard-games/sdk storybook:test:visual
pnpm --filter @dreamboard-games/sdk storybook:test:visual
pnpm ui:check:baseline
```

Results:

- `pnpm install --frozen-lockfile`: passed; lockfile was up to date.
- `pnpm ui:coverage:check`: passed; 92 component exports, 91 discovered story
  IDs, 16 interactive coverage entries.
- `pnpm format:check`: passed.
- `pnpm --filter @dreamboard-games/sdk typecheck`: passed.
- `pnpm --filter @dreamboard-games/sdk test`: passed; 495 tests across 67
  files.
- `pnpm ui:test:stories`: passed; 91 Storybook tests.
- `pnpm --filter @dreamboard-games/sdk storybook:test:visual:update`: passed;
  wrote 39 initial snapshots.
- First normal `pnpm --filter @dreamboard-games/sdk storybook:test:visual`:
  passed; 39 passed, 78 skipped.
- Second normal `pnpm --filter @dreamboard-games/sdk storybook:test:visual`:
  passed; 39 passed, 78 skipped, no new files or diffs.
- `pnpm ui:check:baseline`: passed end to end.
