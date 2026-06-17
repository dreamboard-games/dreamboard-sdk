# Phase 08 Closeout

Date: 2026-06-17.

Status: complete for the required Workbench foundation.

## Completed

- Added SDK CI rollout workflow `.github/workflows/ui-check.yml` with pull
  request and main-branch UI tiers.
- Updated `.github/workflows/release-alpha.yml` to run `pnpm ui:release-proof`
  and retain release-proof artifacts before publish.
- Consolidated root UI commands around `ui:hard-cut:check`, Storybook
  interaction/visual receipts, Workbench matrix receipts, packed reference
  consumers, parity, and release proof.
- Added `pnpm ui:check` to the root `check` command before `pack:dry-run`.
- Deleted stale SDK public/API paths: generated `renderSummary` and
  `renderActions`, the public `useMobileHandTrayActive` export, old notebook
  CSS classes, and superseded UI runner scripts.
- Added hard-cut checks for deleted SDK APIs, stale CSS classes, protocol
  `2.0.0`, stale fixture selectors, packed-consumer workspace links, and
  missing interactive Workbench coverage.
- Generated current agent-facing docs:
  - `docs/ui-agent-iteration.md`
  - `docs/reference-games.md`
  - `docs/reference/agent-api.md`
  - `packages/sdk/REFERENCE.md`
- Updated the private Workbench package dependency boundary so dist-aliased SDK
  runtime imports resolve their UI runtime dependencies under pnpm's strict
  linker.
- Added the internal UI parity workflow in the sibling internal repository and
  updated the internal protocol guard to require
  `dreamboard-browser-interaction@3.0.0`.
- Deleted internal editable published examples and public demo assets for
  `frontier-trails`, `sketchbook`, `hearts`, `artisans-guild`, and `sushi-go`.
- Removed internal public-demo registrations, published-example scripts, old
  workspace package globs, Optopus demo registrations, and stale demo copy
  paths.
- Copied the digest-pinned SDK reference bundle lock into the internal repo as
  `examples/reference-bundle.lock.json`.

## Verification

SDK commands run from `/Users/kevintang/code/dreamboard-sdk`:

```bash
pnpm install
pnpm ui:hard-cut:check
pnpm docs:check
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
pnpm ui:storybook:build
pnpm ui:test:stories
pnpm ui:test:visual
pnpm ui:test --required
pnpm ui:check
pnpm reference-games:test:packed --required
pnpm ui:test:parity --scenario hearts.pass-three.mobile --out artifacts/ui-parity/phase-08-local --skip-build
node --check scripts/ui/check-ui-hard-cut.mjs
node --check scripts/ui/create-ui-release-proof.mjs
node --check scripts/ui/run-packed-ui-scenarios.mjs
node --check scripts/ui/run-story-tests.mjs
node --check scripts/ui/run-visual-tests.mjs
node --check scripts/ui/run-ui-scenarios.mjs
```

Results:

- UI hard-cut guard: passed.
- Agent docs check: passed, 1,734 exports.
- Component coverage: passed, 100 component exports, 92 Storybook IDs, 5
  Workbench scenario IDs, and 17 interactive coverage entries.
- Scenario catalog: passed for 5 Workbench scenarios.
- Fixture check: passed for 5 UI fixtures.
- Storybook static build: passed.
- Storybook interaction receipt:
  `artifacts/ui-stories/2026-06-17T11-51-34-576Z/receipt.json`.
- Storybook visual receipt:
  `artifacts/ui-visual/2026-06-17T11-51-55-838Z/receipt.json`.
- Workbench matrix receipt:
  `artifacts/ui/2026-06-17T11-52-18-778Z/receipt.json`.
- Packed reference consumer receipt:
  `build/reference-games/packed-consumer-receipt.json`.
- SDK parity receipt:
  `artifacts/ui-parity/2026-06-17T11-53-19-987Z/receipt.json`.
- `pnpm ui:check`: passed end to end.

Internal commands run from `/Users/kevintang/code/internal`:

```bash
bun test packages/demo-gallery/src packages/browser-demo-scenario-contract/test packages/ui-host-runtime/src/screenshot/projection-to-gameplay-frame.test.ts packages/compiler-core/src/demo-games/package-demo-games.test.ts
node --check scripts/ui-fixtures/compile-internal-fixtures.mjs
node --check scripts/check-browser-demo-compiled-replay-hard-cut.mjs
node scripts/check-browser-demo-compiled-replay-hard-cut.mjs
DREAMBOARD_SDK_REPO=/Users/kevintang/code/dreamboard-sdk pnpm verify:ui-parity --input ../dreamboard-sdk/artifacts/ui-parity/phase-08-local/input.json
```

Results:

- Focused internal tests: passed, 45 tests.
- Internal browser-demo compiled replay hard-cut guard: passed.
- Internal real-host UI parity: passed. The SDK parity receipt retains the
  internal observation at
  `artifacts/ui-parity/2026-06-17T11-53-19-987Z/internal/observations/hearts.pass-three.mobile.json`.

Absence searches:

- SDK deleted API/style/script scan returned no matches outside the hard-cut
  guard and historical phase docs.
- Internal scan returned no matches for retired `examples/published/*` live
  references, browser interaction protocol `2.0.0`, or the removed portable
  replay-step drift expectation.
- `find examples/published apps/web/public/demos -maxdepth 2 -type d` now
  returns only the empty parent directories.

## Release Proof Boundary

`pnpm ui:release-proof` verifies the tarball, reference bundle, Storybook
receipts, the required Hearts, Hex drag, and Worker draft Workbench matrix,
their packed reference consumers, and independently measured Hearts real-host
parity. The alpha workflow checks out the internal host and executes parity
directly; it does not depend on repository-variable paths to external receipts.
A real-device canary is optional unless `--require-device-canary` is supplied.

Verified foundation receipt:

`artifacts/ui-release-proof/drag-draft-foundation/receipt.json`

All required gates passed. The receipt records
`realDeviceCanary: "not-required"` and
`parityScenarios: ["hearts.pass-three.mobile"]`.
