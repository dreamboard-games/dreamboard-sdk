# SDK Phase 03 Source Workspace Evidence

Date: 2026-06-19

This artifact records the SDK-side Phase 03 cutover for
`docs/exec-plans/reference-game-teaching-source-and-admission-hard-cut/`.
It is not a whole-plan closeout artifact: internal source admission,
demo-release consumption, agent-runner materialization, and cross-repo CI
closeout remain Phase 04 through Phase 07 work.

## Implemented

- Added the public `@dreamboard-games/sdk/reference-games` source-manifest
  subpath with schema parsing and digest helpers.
- Added deterministic SDK source bundle materialization tooling under
  `scripts/reference-games/`.
- Added workspace-loader capability under `scripts/ui-fixtures/workspace/` and
  switched fixture compilation to `reference-game.json.workspace.uiScenarios`
  using real authored reducer and UI entrypoints.
- Updated `reference-games:check` and packed consumer verification to require
  schema v2 root teaching workspaces.
- Completed root teaching workspaces for all nine canonical games:
  - `automa-river-rival`
  - `deck-building-market`
  - `hearts`
  - `hex-network-trading`
  - `multiplayer-ranking-and-ties`
  - `roll-and-write-scorecard`
  - `simultaneous-card-drafting`
  - `solo-countdown-puzzle`
  - `worker-placement-tableau`
- Removed the legacy fixture sidecar authorities:
  - `examples/reference-games/*/demo-workspace/`
  - `examples/reference-games/*/src/reference-game.mjs`
  - `examples/reference-games/*/src/ui.mjs`
  - `examples/reference-games/*/src/scenarios/`
  - `examples/reference-games/*/scenarios/coverage.json`
  - `examples/reference-games/*/scenarios/verify.mjs`
- Regenerated UI fixtures, fixture module index, Workbench catalog, generated
  reference docs, and SDK API docs from the owning source commands.

## Evidence

The legacy sidecar scan returned no paths:

```sh
find examples/reference-games \( -path '*/demo-workspace' -o -path '*/src/reference-game.mjs' -o -path '*/src/ui.mjs' -o -path '*/src/scenarios' -o -path '*/scenarios/coverage.json' -o -path '*/scenarios/verify.mjs' \) -print
```

The source manifest/package verification passed:

```sh
pnpm reference-games:check
```

- Checked at: `2026-06-19T06:34:07.500Z`
- Verified all nine game package hashes, lockfile hashes, source hashes,
  scenario hashes, manifest hashes, and SDK dependency versions.

Packed consumer verification passed:

```sh
pnpm reference-games:test:packed --required
```

- Checked at: `2026-06-19T06:58:30.806Z`
- SDK tarball digest:
  `sha256:cb81506796f9b6123693f33ebf4ac6a472c6fdb60dce849a2518d9ec3abe208f`
- Verified typecheck, reducer tests, and UI tests for all nine packed
  workspaces.

Workbench scenario verification passed:

```sh
pnpm ui:test
```

- Receipt: `artifacts/ui/2026-06-19T06-32-34-316Z/receipt.json`
- Focused scenario receipts also passed for simultaneous card drafting, deck
  building, and worker placement.

The required Workbench foundation passed after the required scenario list was
cut over to canonical root workspace fixture IDs:

```sh
pnpm ui:test --required
```

- Receipt: `artifacts/ui/2026-06-19T07-02-44-002Z/receipt.json`
- Required scenarios:
  - `hearts.pass-three.mobile`
  - `hex-network-trading.build-trail.desktop`
  - `worker-placement-tableau.place-worker.desktop`

Runtime visual verification passed:

```sh
pnpm ui:test:runtime-visual
```

- Result: 5 passed, 10 skipped.
- Covered the blocking runtime baseline set after retargeting the Hex visual
  baseline to the canonical trail-building scenario.

Focused keyboard replay verification passed after the canonical scenario-key
and runtime-actuator fixes:

```sh
pnpm --filter @dreamboard-games/ui-workbench test -- tests/scenario-keyboard.spec.ts
```

- Result: 3 passed across Chromium desktop, Chromium touch phone, and WebKit
  phone.

The Phase 03 hard-cut guard passed:

```sh
pnpm ui:hard-cut:check
```

The final aggregate gate passed:

```sh
pnpm check
```

- The run completed through `pack:dry-run`.
- Final line: `SDK tarball self-contained OK: scanned 77 JS/CSS/declaration/metadata files`.

Known non-fatal warnings observed during the SDK gates:

- `ui:coverage:check` warns that `CardDragSurface`, `CardDropTargetView`, and
  `Drawer` do not yet have Workbench scenario coverage.
- Workbench build/test logs contain generated fixture-module
  `IMPORT_IS_UNDEFINED` warnings.
- Workbench build logs contain chunk-size warnings.

## Remaining Plan Work

SDK Phase 03 is complete once the final aggregate rerun passes. The following
plan phases remain open and must close in the paired internal repository before
the whole hard cut is complete:

- Phase 04: internal source admission and proof linkage.
- Phase 05: demo-release consumption hard cut.
- Phase 06: agent-runner teaching-bundle hard cut.
- Phase 07: cross-repo CI, documentation, and permanent deletion guards.
