# Phase 04: Visual Loop, Cleanup, And Docs

Status: Complete

Depends on: Phases 00 through 03

## Objective

Add a small number of useful runtime visual baselines, delete the superseded
authorities, and document the final backend-free coding-agent loop.

## Runtime visual checks

Keep screenshots for debugging, but make only a few stable runtime compositions
blocking visual baselines with Playwright `toHaveScreenshot()`.

Start with:

- Hearts phone layout with three cards selected;
- Hex route placement before or after commit;
- Worker placement form or committed placement;
- one prompt validation state;
- one board targeting state.

Use one stable browser project per baseline unless a browser-specific visual
risk exists.

Add:

```sh
pnpm ui:test:runtime-visual
pnpm ui:test:runtime-visual:update
```

Baseline updates should be explicit. A separate receipt is not required.

## Cleanup

Delete:

- scenario IDs from manual component coverage declarations;
- `componentOwnership` generator maps;
- duplicate fixture selector ownership maps;
- filename-to-component changed-selection heuristics;
- per-scenario Playwright process spawning;
- synthetic reference reducer creation;
- compiler branches keyed to replay kind or game ID;
- source rewriting and `new Function`;
- direct interactive Replay calls to runtime validation or submission.

Keep existing packed, parity, and release scripts unchanged unless they directly
depend on a deleted API. Adapting them is maintenance, not a new proof program.

## Documentation

Update:

- `AGENTS.md`;
- `docs/architecture/ui-test-surfaces.md`;
- `docs/reference/ui-iteration-loops.md`;
- `docs/reference/ui-workbench-behavioral-proof.md`.

Regenerate:

- `docs/ui-agent-iteration.md`;
- `docs/reference-games.md`;
- Workbench catalog and scenario index.

The docs should explain:

- use Storybook for isolated presentation;
- use Workbench for runtime behavior;
- use protocol scenarios for primitive contracts;
- use real reducers for reference-game scenarios;
- use focused or changed-only tests during development;
- use the full UI suite only for shared framework changes;
- no backend is required for the normal loop.

## Expected files

Create:

- `packages/ui-workbench/tests/runtime-visual.spec.ts`
- `packages/ui-workbench/tests/runtime-visual.spec.ts-snapshots/`

Modify the authored and generated docs above.

Delete the superseded files and code paths identified under Cleanup.

## Implementation sequence

1. Add the initial runtime visual baselines.
2. Verify focused scenario, changed-only, and full UI commands.
3. Move all remaining consumers to the typed contract and generated index.
4. Delete old ownership, compiler, selector, runner, and replay paths.
5. Update AGENTS and architecture docs.
6. Regenerate fixtures, catalog, and generated docs.

## Verification

```sh
pnpm ui:test:runtime-visual
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
pnpm ui:runtime:test
pnpm ui:test
pnpm ui:hard-cut:check
pnpm docs:check
```

Use repository search to confirm that deleted map names, synthetic reducer
helpers, source rewriting, filename matching, and direct replay submission are
gone.

## Acceptance criteria

- Representative runtime compositions have blocking visual baselines.
- Baseline updates are explicit.
- The old duplicate ownership and compilation paths are removed.
- The normal agent loop is documented in AGENTS and generated docs.
- Focused iteration does not require a backend.
- Existing full UI checks pass.

## Completion notes

- Added `packages/ui-workbench/tests/runtime-visual.spec.ts` with five blocking
  Workbench baselines: Hearts selected phone hand, Hex route draft, Worker
  placement form draft, prompt validation, and board slot targeting.
- Added explicit runtime visual commands and included the normal check path in
  `ui:check:baseline`.
- Removed the legacy generated `components` index and the DOM selector based
  fixture ownership map. Scenario modules now declare their contracts directly,
  and generated fixtures/catalog/docs consume the typed contract index.
- Updated AGENTS, architecture docs, iteration-loop docs, behavioral-proof docs,
  and generated UI/reference docs to describe the backend-free Storybook,
  Workbench, protocol-scenario, reducer-scenario, focused-test, and runtime
  visual loops.
- Repository search confirms no remaining `componentOwnership`,
  `renderedComponentSelectors`, legacy `componentIndex.components`,
  source-rewriting, or `new Function` fixture-loading paths. Remaining
  `validateInteraction` and `submitInteraction` calls are compile-time/test
  evidence paths; the interactive Replay button uses the shared replay adapter.

Verification:

```sh
pnpm docs:generate
pnpm ui:catalog:check
pnpm docs:check
pnpm ui:fixtures:check
pnpm ui:coverage:check
pnpm ui:runtime:test
pnpm ui:test:runtime-visual
pnpm ui:test --required
pnpm ui:hard-cut:check
git diff --check
node --test scripts/ui-fixtures/authority/authority.test.mjs scripts/ui/component-scenario-index-lib.test.mjs
```

## Progress notes

Completed:

- Added the runtime visual baseline lane and explicit update command:
  `pnpm ui:test:runtime-visual` and `pnpm ui:test:runtime-visual:update`.
- Added five pinned Workbench runtime visual baselines:
  `hearts.pass-three.mobile`, `hex-network-trading.place-route.desktop`,
  `worker-placement-tableau.place-worker.desktop`,
  `ui-scenarios.prompts-choice.desktop`, and
  `ui-scenarios.boards-slot.desktop`.
- Removed the generated legacy `components` index from
  `fixtures/ui/component-scenario-index.json`; consumers now read typed
  `contracts`.
- Removed DOM selector based fixture component ownership inference from the
  fixture compiler. Reference-game scenarios now declare their component
  contracts directly, matching protocol scenarios.
- Updated AGENTS and UI loop/proof docs to describe the backend-free normal loop,
  Storybook versus Workbench responsibilities, and the explicit runtime visual
  baseline lane.

Verification:

```sh
pnpm ui:test:runtime-visual
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
pnpm ui:runtime:test
pnpm ui:test
pnpm ui:hard-cut:check
pnpm docs:check
```

Receipt:

- `artifacts/ui/2026-06-18T08-36-49-926Z/receipt.json`

Remaining:

- The cleanup items for deleting synthetic reference reducer creation and
  replay-kind keyed reducer-authority branches still need tracked real reducer
  scenario authority. The checked-in reference-game source currently contains
  metadata and UI, but no real reducer implementations to migrate to. Replacing
  the synthetic helper with protocol tapes would remove the helper by weakening
  the authority, so this remains open until real reducer source is checked in or
  the phase scope is changed.
- Direct runtime validation remains in fixture materialization and the Playwright
  proof adapter where it is used to preserve protocol-order evidence. Direct
  interactive Workbench Replay validation/submission was removed in Phase 03.

## Not required for completion

- packed-consumer receipts;
- internal real-host parity;
- release proof;
- device canaries;
- exhaustive coverage;
- set-cover optimization;
- performance budgets;
- checked-in migration or closeout artifacts.
