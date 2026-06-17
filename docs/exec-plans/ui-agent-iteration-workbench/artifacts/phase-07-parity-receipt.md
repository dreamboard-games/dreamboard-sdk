# Phase 07 Parity Receipt

Generated: 2026-06-17

## SDK-Owned Implementation

- Added `UIParityObservationV1`, `UIParityFailureCode`, observation parsing,
  fixture-derived observation creation, and first-divergence comparison under
  `@dreamboard-games/sdk/testing`.
- Added `scripts/ui/run-ui-parity.mjs` to materialize the SDK tarball,
  reference bundle, fixture bundle index, selected scenario IDs, source and
  packed Workbench observations, and the internal parity input.
- Added `scripts/ui/compare-ui-parity.mjs` as a CLI over the SDK comparator.
- Added root commands:
  - `pnpm ui:test:packed --scenario <id>`
  - `pnpm ui:test:parity --scenario <id>`
  - `pnpm ui:check`

## Golden Scenario Name Boundary

The current SDK fixture bundle IDs are:

- `hearts.pass-three.mobile`
- `deck-building-market.buy-card.desktop`
- `hex-network-trading.place-route.desktop`
- `worker-placement-tableau.place-worker.desktop`
- `simultaneous-card-drafting.lock-choice.mobile`

The Phase 07 shorthand names are accepted only through explicit aliases in
`scripts/ui/run-ui-parity.mjs`; the generated input records any alias under
`scenarioAliases`.

## Verification

Commands run from `/Users/mac/code/dreamboard-sdk`:

```bash
pnpm --filter @dreamboard-games/sdk test src/testing/ui-fixture
pnpm --filter @dreamboard-games/sdk build
pnpm docs:generate
pnpm docs:check
pnpm ui:test --scenario hearts.pass-three.mobile
pnpm ui:test:parity --scenario hearts.pass-three.mobile --out artifacts/ui-parity/phase-07-local
pnpm ui:test:packed --scenario hearts.pass-three.mobile
pnpm --filter @dreamboard-games/ui-workbench typecheck
node scripts/ui/run-ui-parity.mjs --scenario hex-network-trading.place-network --out artifacts/ui-parity/phase-07-alias-check --skip-build
DREAMBOARD_INTERNAL_REPO=../dreamboard pnpm ui:test:parity --scenario hearts.pass-three.mobile --out artifacts/ui-parity/phase-07-internal
```

Commands run from `/Users/mac/code/dreamboard`:

```bash
pnpm verify:ui-parity --input ../dreamboard-sdk/artifacts/ui-parity/phase-07-internal/input.json --out ../dreamboard-sdk/artifacts/ui-parity/phase-07-internal/internal
pnpm --dir tools/product-harness typecheck
pnpm check:browser-demo-compiled-replay-hard-cut
pnpm verify:browser
pnpm --filter web build
git diff --check
```

Results:

- SDK fixture/parity tests: passed, 532 tests.
- SDK build: passed.
- Agent reference generation/check: passed, 1,734 exports, `llms.txt` at
  32,382 bytes.
- `ui:test --scenario hearts.pass-three.mobile`: passed after the Workbench Vite
  build target was narrowed to the modern Playwright runtime.
- `ui:test:parity`: passed for SDK source-vs-packed observation comparison.
- Internal `verify:ui-parity`: passed for portable parity contract ingest and
  real-host browser replay from `../dreamboard`.
- Internal comparison: passed, `internal-comparison.json` returned `{ "ok": true }`.
- Internal real-host executor: passed. The internal lane receipt records
  `realHostExecutor: true`, `mode: "real-host-parity"`, host route
  `/_dev/ui-parity/:scenarioId`, `pluginIframe: true`, and
  `pluginSessionGateway: true`.
- Real-host replay events for `hearts.pass-three.mobile`: state ack for
  `gameVersion: 1`, `interaction.submit` for
  `pass-three:player-1` / `hearts.pass-three.mobile.invoke`, then state ack for
  `gameVersion: 2`.
- `ui:test:packed --scenario hearts.pass-three.mobile`: passed and verified the
  isolated packed SDK consumer for `hearts`.
- Workbench typecheck: passed.
- Phase 07 shorthand alias materialization: passed for
  `hex-network-trading.place-network` -> `hex-network-trading.place-route.desktop`.
- Internal product harness typecheck: passed.
- Internal web build: passed.
- Internal browser-demo compiled replay hard-cut guard: passed after the SDK
  `./browser-interaction` package export was made source-addressable for Bun and
  the redundant direct SDK `playwright` dev dependency was removed.
- Internal full browser lane: passed. Receipt:
  `/Users/mac/code/dreamboard/build/verification/2026-06-17T08-26-26-596Z-dd207f08/browser/receipt.json`.
  This proves the internal installed-release browser harness, isolated backend,
  local registry, compiler worker, web runtime, and CLI browser runner are
  runnable on this machine.
- Phase 07 golden-fixture real-host parity: closed for the initial required
  proof scenario, `hearts.pass-three.mobile`, through the internal dev-host
  PluginIframe gateway. The remaining golden scenarios are covered by the
  trigger policy for follow-up expansion.
- `git diff --check`: passed in both SDK and internal repositories.

Machine-readable receipts:

- `artifacts/ui-parity/phase-07-local/input.json`
- `artifacts/ui-parity/phase-07-local/receipt.json`
- `artifacts/ui-parity/phase-07-local/hearts.pass-three.mobile.source-observation.json`
- `artifacts/ui-parity/phase-07-local/hearts.pass-three.mobile.packed-observation.json`
- `artifacts/ui-parity/phase-07-internal/input.json`
- `artifacts/ui-parity/phase-07-internal/receipt.json`
- `artifacts/ui-parity/phase-07-internal/internal/receipt.json`
- `artifacts/ui-parity/phase-07-internal/internal/observation.json`
- `artifacts/ui-parity/phase-07-internal/internal-comparison.json`
