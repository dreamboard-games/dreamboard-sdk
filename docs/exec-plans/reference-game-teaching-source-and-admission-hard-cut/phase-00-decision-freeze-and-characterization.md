# Phase 00: Decision Freeze And Characterization

Status: proposed

Depends on: none

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repositories: `dreamboard-sdk`, `internal`

## Objective

Freeze the new ownership model and retain executable evidence of the current
dual-source behavior before changing the compiler or moving files.

This phase changes checks and documentation only. It must not move reference
game source.

## Current State To Characterize

SDK:

- `scripts/ui/check-reference-games.mjs` requires
  `src/reference-game.mjs`, `scenarios/coverage.json`, and
  `scenarios/verify.mjs`.
- `scripts/ui-fixtures/discover-scenarios.mjs` discovers
  `src/scenarios/*.scenario.mjs`.
- `scripts/ui-fixtures/compile-scenario.mjs` imports `src/ui.mjs`.
- `examples/reference-games/shared/reference-reducer.mjs` synthesizes a
  reducer bundle from reference metadata.
- `scripts/ui/verify-reference-consumers.mjs` hashes and proves only `src/`
  plus `scenarios/`.
- `scripts/ui/build-reference-bundle.mjs` archives active-worktree files and
  records a short `HEAD` SHA.

Internal:

- `apps/agent-runner/src/integrations/github-workspace.ts` owns
  `VENDORED_EXAMPLE_SLUGS`.
- The same file falls back to `examples/published/<slug>`.
- Generated agent instructions teach the retired slug set.
- The demo-release input-admission redesign is proposed but not implemented;
  `packages/release-contract` currently owns only the live demo-release
  manifest contract.

## Decisions To Record

Add a short accepted architecture document:

```text
docs/architecture/reference-game-source-authority.md
```

It must state:

1. the game root is the sole editable workspace;
2. `ReferenceGameSourceManifest` is public SDK-owned source identity;
3. `ReferenceGameSourceAdmission` is internal verification identity;
4. fixture modules are generated outputs;
5. demo release and agent-runner consume one source admission;
6. no compatibility fallback is permitted after Phase 03.

## Baseline Receipt

Create:

```text
docs/exec-plans/reference-game-teaching-source-and-admission-hard-cut/
  artifacts/
    phase-00-baseline.md
```

Record:

- full SDK Git SHA;
- full internal Git SHA;
- current reference-game directory inventory;
- current per-game root-workspace file count;
- current fixture-sidecar file count;
- current `reference-games:check` output;
- current required Workbench fixture IDs and digests;
- current packed-consumer receipt;
- current demo-release source-path assumptions;
- current agent-runner slug list and tests.

Do not copy generated JSON blobs into the receipt. Record paths and relevant
digests.

## Characterization Tests

### SDK dual-source test

Add a focused test around the current fixture discovery that demonstrates:

- Hearts fixture compilation imports `src/ui.mjs`;
- Hearts fixture authority does not import
  `demo-workspace/app/game.ts`;
- the current source file list records the fixture-sidecar paths.

The test is expected to be deleted in Phase 03 after it has protected the
migration.

### Internal runner test

Retain a focused test proving the current prepared workspace contains:

```text
examples/hearts
examples/sushi-go
examples/frontier-trails
examples/sketchbook
examples/artisans-guild
```

Mark it as a migration characterization test. Phase 06 replaces its assertions
with manifest-driven SDK example IDs.

## Static Migration Guard

Add a temporary SDK check that prevents additional fixture-sidecar files from
being introduced outside the known inventory. It should fail if a new game
adds another `src/reference-game.mjs` or `src/ui.mjs`.

Example:

```js
const allowedLegacyGames = new Set([
  "hearts",
  "hex-network-trading",
  "deck-building-market",
  "worker-placement-tableau",
  "simultaneous-card-drafting",
  "roll-and-write-scorecard",
  "multiplayer-ranking-and-ties",
  "solo-countdown-puzzle",
  "automa-river-rival",
]);

for (const game of discoveredLegacyFixtureGames) {
  if (!allowedLegacyGames.has(game)) {
    errors.push(`${game}: new legacy fixture-sidecar source is forbidden`);
  }
}
```

This guard is temporary. Phase 07 replaces it with a zero-match deletion guard.

## Verification

SDK:

```sh
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm docs:check
```

Expected:

- all commands exit 0;
- the baseline receipt identifies the dual authorities explicitly;
- no reference-game source has moved.

Internal:

```sh
pnpm --filter @dreamboard/agent-runner test:unit
pnpm --dir packages/release-contract test
```

Expected: all tests pass with the existing behavior characterized.

## Exit Criteria

- The source and admission terminology is accepted.
- Both repositories retain a baseline tied to full Git SHAs.
- Tests demonstrate the exact legacy paths that later phases must remove.
- No new legacy fixture-sidecar path can be added.

## STOP Conditions

Stop and report if:

- any canonical game exists outside `expectedReferenceGameIds`;
- current required Workbench fixtures cannot be regenerated deterministically;
- internal agent-runner no longer uses the hardcoded slug path described above;
- the demo-release input-admission plan has been implemented with a materially
  different contract before this phase begins.
