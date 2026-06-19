# Phase 03: All-Game Workspace Migration And Legacy Deletion

Status: proposed

Depends on: Phases 01 and 02

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repository: `dreamboard-sdk`

## Objective

Move all nine canonical games to the root teaching-workspace layout, switch
fixture generation and packed verification to that layout, and delete the
legacy fixture-sidecar implementation.

This is the coordinated hard cut. Do not merge a mixed-layout state.

## Games In Scope

Existing rich workspaces to promote:

- `hearts`;
- `hex-network-trading`;
- `deck-building-market`;
- `worker-placement-tableau`;
- `simultaneous-card-drafting`.

Fixture-first games that require complete workspace implementations:

- `roll-and-write-scorecard`;
- `multiplayer-ranking-and-ties`;
- `solo-countdown-puzzle`;
- `automa-river-rival`.

## File Move For Existing Workspaces

For each rich game:

```text
examples/reference-games/<id>/demo-workspace/* -> examples/reference-games/<id>/*
```

Reconcile root package metadata rather than keeping two packages:

- keep one `package.json`;
- keep one `pnpm-lock.yaml`;
- preserve exact `@dreamboard-games/sdk` version;
- preserve required React, TypeScript, Zod, and test dependencies;
- retain `private: true`;
- keep the game outside the root pnpm workspace.

Delete the empty `demo-workspace/` directory after the move.

## Complete The Four Fixture-First Games

Implement each from its existing canonical rules and fixture behavior. Do not
invent a larger game.

Required minimum:

```text
rule.md
manifest.ts
app/game.ts
app/game-contract.ts
app/player-view.ts
app/phases/**
ui/App.tsx
ui/index.tsx
ui/interaction-routes.tsx
test/scenarios/**
test/ui-scenarios/**
```

Behavior parity requirements:

| Game                           | Required behavior                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `roll-and-write-scorecard`     | Eight seeded rolls, legal/fallback marks, draft, stale rejection, scoring, terminal outcome        |
| `multiplayer-ranking-and-ties` | Draft flow, unique winner, true tie, tie-break evidence, scoreless cancellation                    |
| `solo-countdown-puzzle`        | Deterministic auto phases, countdown, repair action, reconnect, terminal outcome                   |
| `automa-river-rival`           | Deterministic rival procedure, system events, duplicate protection, reconnect, cooperative outcome |

Use the rules already committed in the game README and current fixture model as
characterization input. The new reducer and tests become authority.

## Standard Package Scripts

Every game root uses:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit -p manifest.tsconfig.json && tsc --noEmit -p app/tsconfig.json && tsc --noEmit -p ui/tsconfig.json && tsc --noEmit -p test/tsconfig.json",
    "test": "dreamboard test run",
    "test:ui": "tsx --tsconfig test/tsconfig.tsx-runtime.json --test test/ui/**/*.test.tsx",
    "verify": "pnpm typecheck && pnpm test && pnpm test:ui"
  }
}
```

If the public CLI command differs in the live release, use the same command
already used by complete reference workspaces. Do not retain `node
src/reference-game.mjs` as `build`.

## README Contract

Every game README includes:

```text
# <Game Name>

## What This Teaches
## When To Copy This Pattern
## Files To Read First
## Rules Summary
## Authoring Model
## Reducer Flow
## UI Flow
## Scenario Coverage
## Workbench Proof
## Verification
```

The `Files To Read First` list must exactly match
`reference-game.json.teaching.readFirst`.

## Manifest V2 Cutover

Update all `reference-game.json` files to schema version 2 and require:

- root workspace entrypoints;
- behavior scenarios;
- UI scenarios;
- teaching metadata;
- existing rights metadata;
- exact SDK policy;
- mechanics and UI patterns.

For Hearts demo publication:

- derive the source root from the containing game directory;
- derive the UI entrypoint from `workspace.ui`;
- remove `demoRelease.sourcePath`;
- remove `demoRelease.screenshot.projection`.

Keep presentation metadata and screenshot presets.

## Fixture Compiler Cutover

Change discovery from:

```text
src/scenarios/*.scenario.mjs
```

to the explicit `workspace.uiScenarios` entries in `reference-game.json`.

Switch reducer authority to the Phase 02 workspace loader.

Delete the legacy source path and all fallback logic in the same change:

```text
examples/reference-games/*/src/
examples/reference-games/*/scenarios/
examples/reference-games/shared/reference-reducer.mjs
examples/reference-games/shared/reference-ui.mjs
```

`examples/reference-games/shared/` may remain only for shared authored
workspace code imported by real games. Rename it if necessary so it cannot be
mistaken for fixture authority.

## Packed Consumer Cutover

Update `scripts/ui/verify-reference-consumers.mjs`:

```ts
for (const game of admittedGames) {
  const sandbox = await copyWorkspace(game.root);
  await rewriteSdkDependencyToCandidateTarball(sandbox);
  await installFrozenOrRegenerateOnlyCandidateBinding(sandbox);
  await run("pnpm", ["typecheck"], { cwd: sandbox });
  await run("pnpm", ["test"], { cwd: sandbox });
  await run("pnpm", ["test:ui"], { cwd: sandbox });
  await assertNoWorkspaceLink(sandbox, "@dreamboard-games/sdk");
}
```

Receipt fields become:

```ts
{
  id: string;
  sourceManifestDigest: `sha256:${string}`;
  workspaceSourceSha256: `sha256:${string}`;
  packageJsonSha256: `sha256:${string}`;
  lockfileSha256: `sha256:${string}`;
  typecheck: "passed";
  reducerTests: "passed";
  uiTests: "passed";
}
```

## Generated Output

Regenerate only through:

```sh
pnpm ui:fixtures:compile
pnpm ui:catalog:generate
pnpm docs:generate
```

Do not hand-edit fixtures, the scenario index, Workbench catalog, or generated
docs.

## Tests

For every game:

- at least one behavior scenario invokes the actual reducer;
- at least one UI scenario imports that behavior scenario;
- generated fixture provenance names both scenario files and the source
  manifest digest;
- package `verify` passes against the candidate SDK tarball.

For the five promoted games, compare representative old and new fixture
digests. If a digest changes, explain whether the old fixture was wrong or the
real authored game behavior differs. Never copy the old expected digest into
the new result.

For the four completed games, retain tests for every branch currently
represented by generated Workbench scenarios.

## Verification

Focused migration:

```sh
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm docs:generate
```

Full gate:

```sh
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm ui:hard-cut:check
mise exec node@24 -- pnpm docs:check
```

Deletion check:

```sh
test -z "$(find examples/reference-games -path '*/demo-workspace' -o -path '*/src/reference-game.mjs' -o -path '*/src/ui.mjs' -o -path '*/scenarios/coverage.json')"
```

Expected: all commands exit 0 and the deletion check prints nothing.

## Exit Criteria

- All nine games are complete root workspaces.
- Fixture compilation executes real reducers and real UI.
- Packed verification proves the teaching workspace.
- Legacy fixture-sidecar source is deleted.
- No mixed-layout compatibility path remains.

## STOP Conditions

Stop and report if:

- any fixture-first game's committed rules are insufficient to implement a
  deterministic playable reducer without a product decision;
- a real authored game contradicts a required Workbench behavior;
- the move would require committing credentials, local `.dreamboard` state, or
  `node_modules`;
- one game cannot pass isolated candidate-SDK verification.
