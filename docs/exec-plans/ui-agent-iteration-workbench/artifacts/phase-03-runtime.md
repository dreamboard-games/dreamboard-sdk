# Phase 03 Deterministic Fixture Runtime Receipt

Date: 2026-06-17.

Status: complete.

## Implemented

- Extracted the shared runtime provider shell into
  `packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx` and routed
  production `PluginRuntime` through it.
- Added `FixturePluginRuntime`, `createFixtureRuntime`, deterministic browser
  environment helpers, strict transport request digests, and runtime event
  transcript types to `@dreamboard-games/sdk/testing`.
- Added SDK fixture runtime tests for ordered validation/submission, delayed
  frame publication, rejected validation/submission diagnostics, unexpected
  transport requests, and unconsumed exchange assertions.
- Split semantic replay digests from fixture transport digests in the reference
  fixture compiler and regenerated the committed reference fixture bundle.
- Added the minimal `@dreamboard-games/ui-workbench` package with scenario
  loading, contract fingerprint checks, SDK candidate mode types, and the
  test-only fixture bridge.
- Added a Workbench literal edge-case test for fixture/render fingerprint
  mismatches so stale generated bundles fail with a regeneration instruction.
- Added `pnpm ui:runtime:test` as the focused Phase 03 runtime gate.

## Fixture Bundle

Bundle: `fixtures/ui/reference-games/index.json`

The bundle still contains the five Phase 02 reference fixtures:

- `deck-building-market.buy-card.desktop`
- `hearts.pass-three.mobile`
- `hex-network-trading.place-route.desktop`
- `simultaneous-card-drafting.lock-choice.mobile`
- `worker-placement-tableau.place-worker.desktop`

Each transport exchange now records a canonical
`ui-fixture-transport-request@1` digest for its operation, player, interaction,
and payload. Semantic replay steps keep their existing
`ui-replay-request@1` digest.

## Verification

Commands run from `/Users/kevintang/code/dreamboard-sdk`:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
find fixtures/ui/reference-games -type f -print0 | sort -z | xargs -0 shasum -a 256
```

Results:

- `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck`:
  passed.
- `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test`: passed,
  508 tests.
- `mise exec node@24 -- pnpm ui:fixtures:compile`: passed, compiled 5 UI
  fixtures.
- `mise exec node@24 -- pnpm ui:fixtures:check`: passed, checked 5 UI
  fixtures.
- `mise exec node@24 -- pnpm ui:runtime:test`: passed. The gate rebuilt the
  SDK, ran the SDK fixture runtime suite, typechecked
  `@dreamboard-games/ui-workbench`, and ran the Workbench runtime test.

`tsup` emitted existing DTS circular re-export warnings during SDK builds; the
builds completed successfully.

## SDK Checksum Receipt

```text
eaa2ac7550dd5a5469f110029dba502c43ce25f6f8edfd30d5efa9e7eb7fbc58  fixtures/ui/reference-games/deck-building-market.buy-card.desktop.fixture.json
ebd26595dbfff748602540db38a4ec01d937017e5c3cbdecdb2f8ad2d2ed73b7  fixtures/ui/reference-games/hearts.pass-three.mobile.fixture.json
7fb1071c5752b5f427490a0cbb2014546ef66a8cee20ba094dc3ea34daa4f59a  fixtures/ui/reference-games/hex-network-trading.place-route.desktop.fixture.json
91adb34e264d8d1796c533907126f41a7272c8abac288a5735b800eebac45341  fixtures/ui/reference-games/index.json
8145f8878c9f654f5fd4715582f35834923c73f2b4440a03c4fcb20efce44219  fixtures/ui/reference-games/modules/deck-building-market.buy-card.desktop.mjs
38738961f73caa2e030e4f15dfb26b4eedf06439f560bf14a4b78f516f67e312  fixtures/ui/reference-games/modules/hearts.pass-three.mobile.mjs
1fb960233e4493db35a6f6724838ff63c7a60e183f2709dfa6b0a89eda28f167  fixtures/ui/reference-games/modules/hex-network-trading.place-route.desktop.mjs
c25494ea683f624d5ed5fb6b93018e83f003a4e8a3d0c35769031232202a9936  fixtures/ui/reference-games/modules/simultaneous-card-drafting.lock-choice.mobile.mjs
5e5cf4f37decece6c6b6e98f30b948d6816078f426f51fddca45e05386391a42  fixtures/ui/reference-games/modules/worker-placement-tableau.place-worker.desktop.mjs
a19c0caee421e6568486e6d88bc26156a300f31475cfa0cf78e2013bb9ec0af9  fixtures/ui/reference-games/simultaneous-card-drafting.lock-choice.mobile.fixture.json
9894f871bb28d4a0191c2dc1151efa6616282b787f5e1ec73cb766d44a5e3965  fixtures/ui/reference-games/worker-placement-tableau.place-worker.desktop.fixture.json
```
