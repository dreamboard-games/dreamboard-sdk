# Phase 04 UI Workbench And Agent Catalog Receipt

Date: 2026-06-17.

Status: source-complete.

## Implemented

- Expanded `@dreamboard-games/ui-workbench` into a private Vite Workbench with
  catalog, stable scenario routes, test mode, viewport controls, reset/replay
  controls, semantic and runtime inspector panels, Playwright smoke tests, and
  fixture asset serving.
- Generated `packages/ui-workbench/src/catalog.ts` from
  `fixtures/ui/reference-games/index.json` with validation for fixture/module
  existence, digests, duplicate scenario IDs, capability tags, source ownership,
  and fixture/render contract fingerprints.
- Added `fixtures/ui/component-scenario-index.json` and changed-file selection
  support for component/source ownership and full-suite fallback.
- Added root commands:
  `ui:workbench`, `ui:workbench:dev`, `ui:workbench:build`,
  `ui:catalog:generate`, `ui:catalog:check`, `ui:test`, and
  `ui:test:changed`.
- Added automated UI evidence receipts under `artifacts/ui/<run-id>/`.
- Exported `PluginRuntimeBoundary` from `@dreamboard-games/sdk/runtime` so the
  private Workbench can mount compiled fixture UI through the real runtime
  boundary.

## Catalog

The generated catalog currently contains the five compiled reference-game
fixtures produced by Phase 03:

- `deck-building-market.buy-card.desktop`
- `hearts.pass-three.mobile`
- `hex-network-trading.place-route.desktop`
- `simultaneous-card-drafting.lock-choice.mobile`
- `worker-placement-tableau.place-worker.desktop`

This satisfies one runtime-aware scenario per reference game. The larger
aspirational list in Phase 04 remains the expansion target for future fixture
coverage as new reducer scenarios are compiled.

## Verification

Commands run from `/Users/mac/code/dreamboard-sdk`:

```bash
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm --filter @dreamboard-games/ui-workbench typecheck
mise exec node@24 -- pnpm ui:workbench:build
mise exec node@24 -- pnpm ui:test --scenario hearts.pass-three.mobile
mise exec node@24 -- pnpm ui:test:changed --base HEAD
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- node scripts/ui/select-impacted-scenarios.mjs packages/sdk/src/ui/components/HandView.tsx --output artifacts/ui/selection-smoke.json
```

Results:

- Catalog generation/check passed for 5 UI scenarios.
- Workbench typecheck passed.
- Workbench production build passed and emitted bundled scenario modules.
- `ui:test --scenario hearts.pass-three.mobile` passed and wrote
  `artifacts/ui/2026-06-17T05-17-47-811Z/receipt.json`.
- `ui:test:changed --base HEAD` passed and wrote
  `artifacts/ui/2026-06-17T05-18-01-685Z/receipt.json`.
- `ui:runtime:test` passed: SDK build, SDK UI fixture tests, Workbench
  typecheck, and Workbench runtime unit tests.
- `HandView` selection smoke selected Hearts plus all current HandView-bearing
  fixture scenarios and related Storybook IDs.

## Browser Smoke

The Codex in-app Browser bridge was unavailable in this environment
(`browser-client` trust bridge error). A direct Playwright smoke against the
local dev server verified:

```json
{
  "cardCount": 5,
  "status": "ready",
  "frame": "frame-1",
  "gameVisible": true,
  "screenshot": "artifacts/ui/workbench-smoke.png"
}
```
