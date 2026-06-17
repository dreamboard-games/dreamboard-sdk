# Phase 06 UI Ergonomics Migration Receipt

Date: 2026-06-17.

Status: complete for the Hearts foundation.

## Implemented

- Added `UI.defineGameUI` to the workspace contract and generated UI seed. The
  generated type surface now requires an exhaustive phase map and typed
  interaction route map while the runtime helper composes `UI.Root`,
  `Game.Root`, `Phase.Switch`, `Interaction.Routes`, surfaces, and optional
  interaction UI.
- Added generated compound hand slots: `hand.Cards`, `hand.Summary`, and
  `hand.Actions`. Generated author-facing seed types no longer expose
  `renderSummary` or `renderActions`; runtime lower-level plumbing still feeds
  `HandSurfaceView`.
- Added `Game.Viewport` plus an overlay inset registry owned by
  `MobileHandTrayProvider`. The mobile tray registers its measured bottom
  overlay height, and `Game.Viewport` applies
  `--dreamboard-bottom-overlay-inset` with the safe-area padding contract.
- Added a compound `Panel` primitive and rebuilt `ActionPanel` on top of it.
  `Panel` is exported from the public UI/component surfaces and has Storybook
  coverage.
- Replaced generated form surface `Dialog` forwarding with a composed dialog
  that owns interaction lifecycle plus the SDK visual dialog shell, title,
  description, trigger, focus trap, and close behavior.
- Migrated the shared reference-game root to `Game.Viewport` and regenerated
  the five portable UI fixture modules/bundles.
- Added `scripts/ui/check-reference-ui-ergonomics.mjs` and
  `pnpm ui:ergonomics:check` to reject deprecated reference authoring patterns.
- Updated reference-game validation so existing shared reference infrastructure
  and component-scenario index generation are recognized as reference-owned
  surfaces, allowing packed consumer verification to run.

## Reference Boundary

Hearts uses the documented lower-level path through the shared
`Game.Root`/`Game.Viewport` helper because the portable reference consumer does
not own a generated per-game workspace contract. `UI.defineGameUI` and compound
hand slots are covered by SDK compile/runtime tests. The other examples are
optional follow-up migration pressure.

## Verification

Commands run from `/Users/kevintang/code/dreamboard-sdk`:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/workspace-codegen typecheck
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:ergonomics:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test src/runtime/workspace-contract.test.tsx src/runtime/primitives/hand-mobile-registration.test.tsx src/runtime/primitives/ui.test.tsx src/ui/index.test.ts src/export-surface.test.ts
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:test --scenario hearts.pass-three.mobile
mise exec node@24 -- pnpm reference-games:test:packed
mise exec node@24 -- pnpm ui:test
```

Results:

- SDK and workspace-codegen typechecks passed.
- Fixture compile/check passed for 5 reference fixtures.
- Catalog check passed for 5 UI scenarios.
- Ergonomics hard-cut check passed.
- Focused SDK test run passed with 530 passing tests.
- Component coverage check passed with 101 component exports, 92 story IDs, and
  17 interactive component coverage entries.
- Focused Workbench scenario passed and wrote
  `artifacts/ui/2026-06-17T07-08-36-910Z/receipt.json`.
- Packed reference consumer verification passed for all five reference games
  and wrote `build/reference-games/packed-consumer-receipt.json` with SDK
  tarball digest
  `sha256:ef47f8467755c306881a44ecbaa604328c86589fbf1608260c79d140f149d4cf`.
- Full Workbench UI scenario matrix passed and wrote
  `artifacts/ui/2026-06-17T07-13-03-236Z/receipt.json`.

## Follow-Up

- Optional examples may later adopt richer generated workspace contracts.
- Drag/draft examples may later exercise the compound hand slots in Workbench.
