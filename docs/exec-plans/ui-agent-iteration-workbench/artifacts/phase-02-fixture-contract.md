# Phase 02 Fixture Contract Receipt

Date: 2026-06-17.

Status: source-complete.

## Implemented

- Added the strict SDK testing export module at
  `packages/sdk/src/testing/ui-fixture/`.
- Exported the portable UI fixture contract from
  `@dreamboard-games/sdk/testing`, including `PortableSemanticReplayStep`,
  `portableSemanticReplayStepSchema`, canonical serialization, request/fixture
  digests, fixture bundle parsing, deterministic compilation helpers, replay
  identity assertions, and negative tests.
- Added deterministic SDK repository scripts:
  - `pnpm ui:fixtures:compile`
  - `pnpm ui:fixtures:check`
- Upgraded the reference fixture compiler to build projected frames and
  validate/submit transport exchanges through `createTestRuntime`, then resolve
  replay identity through the existing browser-interaction protocol.
- Generated one committed reference fixture and one externalized render module
  for each Phase 01 reference game under `fixtures/ui/reference-games/`.
- Updated the sibling internal repository's
  `@dreamboard/browser-demo-scenario-contract` schema to require a portable
  replay step on each compiled replay recipe step and to validate the portable
  step against the legacy recipe conversion.
- Added internal deterministic private fixture scripts:
  - `/Users/mac/code/dreamboard/scripts/ui-fixtures/compile-internal-fixtures.mjs`
  - `/Users/mac/code/dreamboard/scripts/ui-fixtures/check-internal-fixtures.mjs`
- Generated the private internal-golden bundle at
  `/Users/mac/code/dreamboard/fixtures/ui/internal-golden/`.

The internal package can import the SDK's named `PortableSemanticReplayStep`
directly after the SDK package containing this phase is published and repinned.
Until that release handoff, it validates the same portable shape through its
private structural bridge and conversion tests.

## Fixture Bundle

Bundle: `fixtures/ui/reference-games/index.json`

Fixture IDs:

- `deck-building-market.buy-card.desktop`
- `hearts.pass-three.mobile`
- `hex-network-trading.place-route.desktop`
- `simultaneous-card-drafting.lock-choice.mobile`
- `worker-placement-tableau.place-worker.desktop`

The render modules import React and `@dreamboard-games/sdk/runtime` as external
dependencies. They do not bundle React, the SDK, or runtime code.

The Phase 01 reference games are intentionally outside the pnpm workspace. The
fixture compiler adapter evaluates their source with a local package-set stub
instead of importing them as workspace packages, preserving the consumer
boundary.

## Internal Golden Bundle

Bundle: `/Users/mac/code/dreamboard/fixtures/ui/internal-golden/index.json`

Fixture IDs:

- `frontier-trails-trade-cancel.internal-golden`

The internal golden fixture is a private browser-demo scenario contract fixture
using schema version `3.0.0`, browser-interaction protocol `2.0.0`, required
`gameplay` and `host` surfaces, portable seat references, and portable replay
steps derived from the compiled browser-demo recipe.

## Verification

Commands run from `/Users/mac/code/dreamboard-sdk`:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
find fixtures/ui/reference-games -type f -print0 | sort -z | xargs -0 shasum -a 256
```

Results:

- `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck`:
  passed.
- `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test`: passed, 502
  tests.
- `mise exec node@24 -- pnpm ui:fixtures:compile`: passed, compiled 5 UI
  fixtures after two clean deterministic runs.
- `mise exec node@24 -- pnpm ui:fixtures:check`: passed, checked 5 UI
  fixtures.

Commands run from `/Users/mac/code/dreamboard`:

```bash
mise exec node@24 -- node scripts/ui-fixtures/compile-internal-fixtures.mjs
mise exec node@24 -- node scripts/ui-fixtures/check-internal-fixtures.mjs
mise exec node@24 -- pnpm --filter @dreamboard/browser-demo-scenario-contract test
mise exec node@24 -- pnpm --filter @dreamboard/browser-demo-scenario-contract typecheck
find fixtures/ui/internal-golden -type f -print0 | sort -z | xargs -0 shasum -a 256
```

Results:

- `mise exec node@24 -- node scripts/ui-fixtures/compile-internal-fixtures.mjs`:
  passed, compiled 1 internal golden UI fixture.
- `mise exec node@24 -- node scripts/ui-fixtures/check-internal-fixtures.mjs`:
  passed, checked 1 internal golden UI fixture.
- `mise exec node@24 -- pnpm --filter @dreamboard/browser-demo-scenario-contract test`:
  passed, 21 tests.
- `mise exec node@24 -- pnpm --filter @dreamboard/browser-demo-scenario-contract typecheck`:
  passed.

`tsup` emitted existing DTS circular re-export warnings during SDK fixture
builds; the builds completed successfully. The internal repository emitted
existing pnpm override placement warnings for example packages; the targeted
internal checks completed successfully.

## SDK Checksum Receipt

```text
ab98327aa0c6f70da262d01461a5438b8063ce49ecd2aebfcaa022f4a07f47c6  fixtures/ui/reference-games/deck-building-market.buy-card.desktop.fixture.json
52e5024af8dd5f86e60fb50add118875d2bd12ae9deb9ae078e7629f66f57694  fixtures/ui/reference-games/hearts.pass-three.mobile.fixture.json
17608c83df827c048ea5740e826fe23265709e0ae8b994e2bcbd443d6360b448  fixtures/ui/reference-games/hex-network-trading.place-route.desktop.fixture.json
175533d84aff34296b127036c503525835258cd22f93ddf066967d9c00d69ce0  fixtures/ui/reference-games/index.json
8145f8878c9f654f5fd4715582f35834923c73f2b4440a03c4fcb20efce44219  fixtures/ui/reference-games/modules/deck-building-market.buy-card.desktop.mjs
38738961f73caa2e030e4f15dfb26b4eedf06439f560bf14a4b78f516f67e312  fixtures/ui/reference-games/modules/hearts.pass-three.mobile.mjs
1fb960233e4493db35a6f6724838ff63c7a60e183f2709dfa6b0a89eda28f167  fixtures/ui/reference-games/modules/hex-network-trading.place-route.desktop.mjs
c25494ea683f624d5ed5fb6b93018e83f003a4e8a3d0c35769031232202a9936  fixtures/ui/reference-games/modules/simultaneous-card-drafting.lock-choice.mobile.mjs
5e5cf4f37decece6c6b6e98f30b948d6816078f426f51fddca45e05386391a42  fixtures/ui/reference-games/modules/worker-placement-tableau.place-worker.desktop.mjs
80b248d5306a6d46b89085dec08079ab9051d7ef61ea4d3fd903bff3ee5e4326  fixtures/ui/reference-games/simultaneous-card-drafting.lock-choice.mobile.fixture.json
99546b0729a4453de087b51c92ef01f308c9e8d854c92ec9b1d42f8b3da9d33a  fixtures/ui/reference-games/worker-placement-tableau.place-worker.desktop.fixture.json
```

## Internal Checksum Receipt

```text
464cdd1cd91391613642609f8cf9610010d6518d5b3a8870e11c33922846a0e7  /Users/mac/code/dreamboard/fixtures/ui/internal-golden/frontier-trails-trade-cancel.internal-golden.browser-demo-scenario.json
29e10457377e5c7e8b6fc14524c2c028fcb0257ed6272baa4010868f22ef5800  /Users/mac/code/dreamboard/fixtures/ui/internal-golden/index.json
```
