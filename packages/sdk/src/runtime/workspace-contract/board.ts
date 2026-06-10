import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import type {
  BoardHexGridProps,
  BoardHexViewProps,
} from "../primitives/index.js";
import type { BoardSpaceTargetProps } from "../primitives/board.js";
import { createBoardTargetInputSlot } from "./slots.js";
import type {
  WorkspaceBoardSurfaceDescriptor,
  WorkspaceContractContext,
} from "./types.js";

export function createUseBoardSurface<Card>(
  ctx: WorkspaceContractContext<Card>,
) {
  const { baseUI, runtimeBoard } = ctx;
  return function useBoardSurface(_name: string) {
    return {
      Root: ({ children }: { children?: ReactNode }) =>
        createElement(baseUI.Board.Root, { children }),
      Space: (props: BoardSpaceTargetProps<string>) =>
        createElement(runtimeBoard.SpaceTarget, props),
      slot: {
        space: createBoardTargetInputSlot(ctx, "space"),
        playerSpace: createBoardTargetInputSlot(ctx, "space"),
        edge: createBoardTargetInputSlot(ctx, "edge"),
        vertex: createBoardTargetInputSlot(ctx, "vertex"),
        tile: createBoardTargetInputSlot(ctx, "tile"),
      },
    };
  };
}

/**
 * Assembles the `Board` namespace for one workspace contract. Called once per
 * `createWorkspaceUIContract` invocation so `HexView`/`HexGrid` keep stable
 * component identities.
 */
export function createBoardNamespace<Card>(
  ctx: WorkspaceContractContext<Card>,
) {
  const { options, baseUI } = ctx;
  const useBoardSurface = createUseBoardSurface(ctx);

  return {
    surface<Board extends string>(
      board: Board,
    ): WorkspaceBoardSurfaceDescriptor<Board> {
      return { kind: "board", board };
    },
    useSurface: useBoardSurface,
    HexView({ board: boardId, ...props }: { board: string }) {
      return createElement(
        baseUI.Board.HexView as never,
        {
          ...props,
          board: options.hexStaticBoards[boardId],
        } as BoardHexViewProps<never, never>,
      ) as ReactElement;
    },
    HexGrid({ board: boardId, ...props }: { board: string }) {
      return createElement(
        baseUI.Board.HexGrid as never,
        {
          ...props,
          board: options.hexStaticBoards[boardId],
        } as BoardHexGridProps<never, never>,
      ) as ReactElement;
    },
  };
}
