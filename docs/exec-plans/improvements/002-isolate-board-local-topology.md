# 002 Isolate Board-Local Topology

- Status: Implemented
- Priority: P0
- Risk: High
- Effort: Small
- Primary owner: Codegen
- Depends on: 001
- Planned at: `d84c620`

## Summary

Stop materialized board states from inheriting spaces and containers owned by
other boards. Each runtime board must be built only from its analyzed board.

## Current State

Inside `materializeManifestTable`, the loop already has an `analyzedBoard`, but
space and container builders iterate global ID lists:

```ts
const buildSpaces = () =>
  Object.fromEntries(
    analysis.spaceIds.map((spaceId) => {
      const space = analyzedBoard.spaces.find((entry) => entry.id === spaceId);
      // Missing IDs become default placeholder spaces.
    }),
  );

const buildContainers = (runtimeBoardId: string) =>
  Object.fromEntries(
    analysis.boardContainerIds.map((containerId) => {
      const container = analyzedBoard.containers.find(
        (entry) => entry.id === containerId,
      );
      // Missing IDs become default placeholder containers.
    }),
  );
```

The global lists are correct for generated literal unions, but incorrect for a
specific board's runtime state.

## Scope

### In scope

- `packages/workspace-codegen/src/manifest-contract.ts`;
- multi-board materialization tests;
- generated contract tests that prove exact board-local keys.

### Out of scope

- changing global literal unions;
- changing board IDs or public board types;
- refactoring the complete manifest analysis model.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-002-board-local-topology
```

Commit:

```text
Keep materialized topology board-local
```

## Implementation Steps

### 1. Iterate local analyzed entries

Replace global-list iteration:

```ts
const buildSpaces = () =>
  Object.fromEntries(
    analyzedBoard.spaces.map((space) => {
      const spaceId = space.id;
      const baseSpaceState = {
        id: spaceId,
        name: "name" in space ? (space.name ?? null) : null,
        typeId: space.typeId ?? null,
        fields: {
          ...materializeObjectSchemaDefaults(
            analyzedBoard.spaceFieldsSchema,
            analysis,
          ),
          ...(space.fields ?? {}),
        },
        zoneId: "zoneId" in space ? (space.zoneId ?? null) : null,
      };
      return [spaceId, materializeLayoutFields(baseSpaceState, space)];
    }),
  );
```

Apply the same rule to containers:

```ts
const buildContainers = (runtimeBoardId: string) =>
  analyzedBoard.layout === "hex"
    ? {}
    : Object.fromEntries(
        analyzedBoard.containers.map((container) => [
          container.id,
          materializeContainerState(container, runtimeBoardId),
        ]),
      );
```

Do not use `analysis.spaceIds` or `analysis.boardContainerIds` inside a
per-board runtime builder.

### 2. Preserve per-player cloning

Keep cloning for each `runtimeBoardId`, but clone a local template:

```ts
const localSpaces = buildSpaces();

for (const runtimeBoardId of analyzedBoard.runtimeBoardIds) {
  boardStatesById[runtimeBoardId] = {
    // existing metadata
    spaces: cloneJson(localSpaces),
    containers: cloneJson(buildContainers(runtimeBoardId)),
  };
}
```

Per-player board instances should share authored topology but not mutable
object identity.

### 3. Add exact-key regression tests

Create a manifest with:

- `board-a` containing `a-1`, `a-2`, and `a-row`;
- `board-b` containing `b-1` and `b-row`;
- distinct field values so placeholder defaults are observable.

Assert:

```ts
expect(Object.keys(table.boards.byId["board-a"].spaces).sort()).toEqual([
  "a-1",
  "a-2",
]);
expect(Object.keys(table.boards.byId["board-b"].spaces)).toEqual(["b-1"]);
expect(table.boards.byId["board-a"].spaces).not.toHaveProperty("b-1");
expect(table.boards.byId["board-b"].containers).not.toHaveProperty("a-row");
```

Add a per-player board case and assert both runtime clones contain only that
board's local topology and do not share nested references.

## Test Plan

```sh
pnpm --filter @dreamboard-games/workspace-codegen test
pnpm --filter @dreamboard-games/workspace-codegen typecheck
pnpm check
```

The focused test must fail against `d84c620` before the implementation change.

## Done Criteria

- No runtime board contains a foreign space or container.
- Missing local entries are never synthesized from global IDs.
- Global generated literal unions remain unchanged.
- Shared and per-player board tests cover exact keys and field values.

## STOP Conditions

- Stop if any downstream consumer intentionally expects a board to expose
  global topology. That would be a contract bug requiring an explicit public
  model, not a reason to keep placeholder entries.
- Stop if the fix changes generated public ID unions; this phase should change
  runtime materialization only.

## Maintenance

Any future per-board builder must take `analyzedBoard` as its primary input.
Global analysis collections are for cross-board indexes and generated unions,
not board instance construction.
