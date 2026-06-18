# Phase 04: Visual Loop, Cleanup, And Docs

Status: In Progress

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
- `docs/references/ui-iteration-loops.md`;
- `docs/references/ui-workbench-behavioral-proof.md`.

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

## Not required for completion

- packed-consumer receipts;
- internal real-host parity;
- release proof;
- device canaries;
- exhaustive coverage;
- set-cover optimization;
- performance budgets;
- checked-in migration or closeout artifacts.
