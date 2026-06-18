# Phase 01: Square Board Interaction And Roll-And-Write Example

Status: proposed.

Depends on Phase 00.

## Objective

Add one missing framework capability: a generated, interaction-aware
`Board.SquareGrid` adapter over the SDK's existing square-board topology,
collectors, and controlled `SquareGrid`.

Prove the capability with a new canonical roll-and-write reference game.

## What This Phase Introduces

| Area                 | Current SDK                                                          | Introduced here            |
| -------------------- | -------------------------------------------------------------------- | -------------------------- |
| Topology             | `BoardSpec` supports `layout: "square"`                              | Nothing                    |
| Reducer input        | Board-space, edge, and vertex collectors exist                       | Nothing                    |
| Presentation         | Controlled `SquareGrid` accepts interactive target layers            | Nothing                    |
| Generated runtime UI | `Board.HexGrid` binds target layers, but no square equivalent exists | `Board.SquareGrid`         |
| Example catalog      | No canonical roll-and-write example                                  | `roll-and-write-scorecard` |

This phase does **not** introduce:

- a `Sheet` runtime or collector;
- `printedOn`, carrier, or physical-format manifest fields;
- a compact-surface component;
- a new target kind or browser effect;
- a public `MarkCell` component; or
- score/outcome contract changes owned by Phase 02.

## Why The Adapter Is Needed

`Board.surface("scorecard-grid")` already exposes generated board targets.
However, its `Space` component renders an HTML button. It cannot be wrapped
around a cell inside the SVG scene rendered by `SquareGrid`.

`SquareGrid` already accepts `interactiveSpaces`, `interactiveEdges`, and
`interactiveVertices`. The missing capability is the runtime adapter that
supplies those layers from the existing board interaction context, matching the
current `Board.HexGrid` design.

The intended authored composition is:

```tsx
import { Board, UI } from "#dreamboard/ui-contract";

const useSurfaces = UI.defineSurfaces({
  scorecard: Board.surface("scorecard-grid"),
});

export function Scorecard({ view }: { view: GameView }) {
  const { scorecard } = useSurfaces();

  return (
    <ScorecardFrame>
      <scorecard.Root>
        <Board.SquareGrid
          board="scorecard-grid"
          renderPiece={() => null}
          renderCell={(row, col) => {
            const id = cellId(row, col);
            return (
              <GameMarkCell
                size={60}
                mark={view.marks[id] ?? "empty"}
                label={labelFor(id)}
              />
            );
          }}
        />
      </scorecard.Root>
    </ScorecardFrame>
  );
}
```

`ScorecardFrame` and `GameMarkCell` are authored presentation. The SDK addition
is only `Board.SquareGrid`.

## Runtime API

Generalize the current hex interaction filter:

```ts
export type BoardGridInteractionFilter<Key extends string = string> =
  | "auto"
  | false
  | {
      edge?: readonly Key[];
      vertex?: readonly Key[];
      space?: readonly Key[];
    };

export type BoardHexGridInteractionFilter = BoardGridInteractionFilter<string>;

export type BoardSquareGridProps<TBoard extends AnySquareBoardInput> = Omit<
  SquareGridBoardProps<TBoard>,
  "interactiveEdges" | "interactiveVertices" | "interactiveSpaces"
> & {
  interactions?: BoardGridInteractionFilter;
};

export function BoardSquareGrid<const TBoard extends AnySquareBoardInput>(
  props: BoardSquareGridProps<TBoard>,
): ReactElement;
```

`BoardSquareGrid` obtains target layers from `useBoardPrimitiveContext()` and
passes them to controlled `SquareGrid`. It must reuse the same automatic and
explicit interaction filtering semantics as `BoardHexGrid`.

## Generated Workspace Contract

The manifest generator already emits `staticBoards.square`. Thread that
existing map into `createWorkspaceUIContract`:

```ts
const squareStaticBoards = staticBoards.square;

export type SquareBoardId = keyof typeof squareStaticBoards & string;

export type SquareBoardGridProps<Id extends SquareBoardId> = Omit<
  BoardSquareGridPropsGeneric<(typeof squareStaticBoards)[Id]>,
  "board" | "interactions"
> & {
  board: Id;
  interactions?: BoardGridInteractionFilter<InteractionKey>;
};

type WorkspaceBoard = {
  // Existing members remain.
  SquareGrid<const Id extends SquareBoardId>(
    props: SquareBoardGridProps<Id>,
  ): ReactElement;
};
```

Add `SquareBoards` as a defaulted final generic on
`createWorkspaceUIContract`. Direct low-level callers may omit
`squareStaticBoards`; generated workspaces always pass the real map.

No card, sheet, print, carrier, or manufacturing metadata is generated.

## Reducer Authoring

The canonical example uses the existing board-space collector:

```ts
const markableCell = playerTurn.inputs.boardTarget
  .playerSpace<GameState, "scorecard-grid", CellId>("scorecard-grid")
  .where({
    id: "matches-roll",
    errorCode: "CELL_DOES_NOT_MATCH_ROLL",
    message: "Choose an unmarked cell matching the roll.",
    test: ({ state, playerId, target }) =>
      target.playerId === playerId &&
      unmarkedCellsMatchingRoll(state.publicState, playerId).includes(
        target.spaceId,
      ),
  })
  .build();

const markCell = playerTurn.interaction({
  inputs: {
    cell: playerTurn.inputs.board.playerSpace({
      target: markableCell,
    }),
  },
  reduce: ({ state, input, accept, edit }) => {
    const tx = edit(state);
    const { playerId, spaceId } = input.params.cell;
    tx.patchPublicState({
      marks: {
        ...state.publicState.marks,
        [playerId]: {
          ...state.publicState.marks[playerId],
          [spaceId]: "checked",
        },
      },
    });
    return accept(tx.state);
  },
});
```

Route the interaction through `scorecard.slot.playerSpace`. Eligibility,
drafts, submit validation, browser semantics, and diagnostics remain owned by
existing collectors.

## Canonical Example: Roll And Write

Create:

```text
examples/reference-games/roll-and-write-scorecard/
```

Implement **Cloudline Survey** from
[Canonical Game Briefs](canonical-game-briefs.md#roll-and-write-scorecard-cloudline-survey).
That brief is the rules authority for the board layout, round loop, failed-mark
branch, scoring, and scenario fixtures.

The original public-safe game demonstrates:

- one to four human players;
- a per-player square scorecard using `scope: "perPlayer"`;
- a shared seeded dice roll;
- eligible cells derived from the roll;
- drafted cell selection followed by submit;
- checked, crossed, and numbered cells;
- a compact mobile layout;
- pointer and keyboard activation;
- deterministic replay; and
- a complete playable loop using the current terminal API, migrated to
  `GameOutcome` in Phase 02.

The example README must answer:

1. Why a roll-and-write scorecard is an ordinary per-player square board.
2. Why `Board.SquareGrid` is needed instead of wrapping SVG cells in
   `Board.Space`.
3. Which reducer collector owns legal marks.
4. Which code is intentionally game-local presentation.
5. How to run the smallest Workbench and packed-consumer proofs.

## Ownership

Expected touchpoints:

- `packages/sdk/src/runtime/primitives/board.tsx`;
- `packages/sdk/src/runtime/primitives/index.ts`;
- `packages/sdk/src/runtime/ui-contract.ts`;
- `packages/sdk/src/runtime/workspace-contract/board.ts`;
- `packages/sdk/src/runtime/workspace-contract/types.ts`;
- `packages/sdk/src/runtime/workspace-contract/index.ts`;
- `packages/workspace-codegen/src/seeds.ts`;
- focused SDK and codegen tests;
- the new reference game and required UI scenarios; and
- generated API documentation.

Do not change:

- `packages/sdk-types/src/contracts.ts`;
- reducer input kinds;
- browser interaction effect kinds;
- internal transport contracts; or
- physical-format tooling.

## Contract Test Matrix

1. `BoardSquareGrid` supplies space, edge, and vertex target layers.
2. `interactions: false` disables all target layers.
3. Explicit filters behave identically to `Board.HexGrid`.
4. Generated `SquareBoardId` rejects unknown and hex-only IDs.
5. Generated `Board.SquareGrid` resolves
   `staticBoards.square[boardId]`.
6. Low-level workspace-contract callers compile without a square map.
7. Eligible cells emit the existing board-space browser effect.
8. SVG output contains no nested HTML target button.
9. The roll-and-write example works with shared and per-player runtime board
   IDs without ambiguous targets.

Expected test touchpoints:

```text
packages/sdk/src/runtime/primitives/board-square-grid.test.tsx
packages/sdk/src/runtime/workspace-contract.test.tsx
packages/sdk/src/ui/components/board/target-layer-grids.test.tsx
packages/workspace-codegen/src/seeds.test.ts
```

## Required Scenarios

- initial scorecard;
- deterministic dice result;
- eligible and ineligible cells;
- drafted but unsubmitted mark;
- submitted mark;
- stale or invalid submission rejection;
- keyboard-only play;
- 390x844 mobile play; and
- fixture replay matching real runtime projection.

## Implementation Sequence

1. Add `BoardSquareGrid` by following `BoardHexGrid`.
2. Generalize the grid interaction filter.
3. Thread `staticBoards.square` through generated workspace contracts.
4. Add focused runtime, type, and codegen tests.
5. Build `roll-and-write-scorecard`.
6. Add Workbench, accessibility, mobile, and deterministic scenarios.
7. Pack the SDK and run the example against the packed artifact.
8. Update generated API docs and the canonical-example index.

## Verification

```bash
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm check
```

## Exit Criteria

- `Board.SquareGrid` is the only new public runtime capability in this phase.
- Square-board manifests and reducer collectors are unchanged.
- The roll-and-write example is required, playable, documented, and packed.
- Pointer, keyboard, mobile, deterministic replay, and invalid-action proofs
  pass.
- No sheet, compact-surface, printed-on, or physical-carrier API exists.

## Stop Conditions

Stop and revise if:

- square targets cannot reuse the existing interactive target layers;
- per-player board IDs are ambiguous in generated contracts;
- the adapter requires a new browser-effect protocol;
- the example requires gameplay submission logic in presentation components;
  or
- the proposed public API starts encoding scorecard size, print format, or
  physical carrier.
