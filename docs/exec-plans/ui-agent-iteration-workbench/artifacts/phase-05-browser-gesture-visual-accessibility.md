# Phase 05 Browser Gesture Visual Accessibility Receipt

Date: 2026-06-17.

Status: complete for the required Workbench foundation.

## Implemented

- Promoted the SDK browser-interaction protocol to `3.0.0` with
  `pointer-target` semantic records, pointer target attributes, schema support,
  DOM snapshot parsing, normalized entity snapshots, and exported pointer target
  resolution.
- Added typed pointer target diagnostics for missing, disabled, ambiguous,
  stale, and incompatible targets while preserving exact protocol-attribute
  resolution.
- Emitted gameplay pointer target records from hand staging/drop targets through
  runtime-owned adapters; no Workbench-only target selectors were added.
- Regenerated reference fixtures and the Workbench catalog against browser
  protocol `3.0.0`; protocol `2.0.0` fixture bundles now fail the supported
  fixture schema check.
- Added a private Workbench semantic browser driver that imports SDK
  normalization/resolution, uses exact protocol locators, supports activate,
  fill, desktop mouse drag, and Chromium CDP touch drag, and reports typed
  semantic resolution failures.
- Expanded the Playwright browser matrix to Chromium desktop, Chromium touch
  phone, and WebKit phone with deterministic locale/timezone, reduced motion,
  device scale factor 1, blocked external network, and failure artifacts.
- Added reusable Workbench layout/accessibility assertions for horizontal
  overflow, enabled actuator viewport containment, touch target sizing, overlap,
  dialog safe area, and basic accessibility invariants.
- Enforced Axe in the Workbench and fixed `Interaction.Submit` to meet the
  44px phone touch-target contract.
- Kept WebKit gesture confidence scoped to layout/tap/accessibility smoke;
  WebKit does not run the touch-drag parity assertion.

## Verification

Commands run from `<sdk-checkout>`:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test src/browser-interaction
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench test --project=chromium-desktop tests/driver/semantic-browser-driver.spec.ts
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench test --project=chromium-desktop tests/scenario.spec.ts
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench test --project=chromium-touch-phone tests/driver/semantic-browser-driver.spec.ts
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm exec prettier --check packages/sdk/src/browser-interaction packages/sdk/src/runtime/primitives/hand-surface.tsx packages/sdk/src/ui/components/card-drag/CardDropTargetView.tsx packages/sdk/src/testing/ui-fixture/schema.ts packages/sdk/src/testing/ui-fixture/ui-fixture.test.ts packages/ui-workbench/playwright.config.ts packages/ui-workbench/tests scripts/ui-fixtures/compile-reference-fixtures.mjs docs/exec-plans/ui-agent-iteration-workbench/phase-05-browser-gesture-visual-and-accessibility-matrix.md docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-05-browser-gesture-visual-accessibility.md
```

Results:

- SDK typecheck passed.
- SDK browser-interaction/runtime test command passed with 528 passing tests.
- Workbench typecheck passed.
- Desktop semantic driver and desktop scenario tests passed.
- Chromium touch semantic driver tests passed, including CDP touch drag.
- Fixture compile/check passed for 5 reference fixtures.
- Catalog generation/check passed for 5 UI scenarios.
- Required Workbench scenario command passed and wrote
  `artifacts/ui/2026-06-17T11-52-18-778Z/receipt.json`.
- The receipt contains passing measured evidence for Hearts on Chromium desktop,
  Chromium touch phone, and WebKit phone; Hex Network Trading physical desktop
  pointer drag; and Worker Placement Tableau runtime draft mutation.
- The drag and draft scenarios each retain intermediate-state and committed-state
  screenshots plus projection, semantic, and submission digests.

## Foundation Boundary

- Hearts is required across Chromium desktop, Chromium touch phone, and WebKit
  phone with measured click/tap, semantic, projection, submission, screenshot,
  layout, touch-target, and Axe evidence.
- Desktop pointer drag and runtime draft scenarios are required and passing.
  Mobile touch-drag promotion and real iOS/Android canaries remain follow-up
  expansion.
