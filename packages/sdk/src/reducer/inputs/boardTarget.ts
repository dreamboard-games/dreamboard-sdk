import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../../shared/domain/per-player-instance.js";
import {
  isBoardSpaceTarget,
  sameBoardSpaceTarget,
  type BoardSpaceTarget,
} from "../../shared/board-target";
export type { BoardSpaceTarget } from "../../shared/board-target";
import type { CollectorState, TargetKind } from "../model/spec";
import type { BoardIdOfTable, TableOfState } from "../model/extract";
import type { TableQueriesOfState } from "../model/queries";
import {
  createTargetRule,
  createTargetRuleBuilder,
  type TargetPredicate,
  type TargetRule,
  type TargetRuleBuilder,
} from "./targetRule";

export type BoardTargetPredicate<
  State extends CollectorState,
  Target,
> = TargetPredicate<State, Target>;

type BoardTargetKind = Exclude<TargetKind, "card">;

export type BoardIdTargetRule<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind = BoardTargetKind,
> = TargetRule<State, Id> & {
  readonly targetKind: Kind;
  readonly boardId: string;
  readonly valueKind: "board-id";
};
export type BoardSpaceTargetRule<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
> = TargetRule<
  State,
  BoardSpaceTarget<PerPlayerInstanceId<"board", BoardId>, SpaceId>
> & {
  readonly targetKind: "space";
  readonly boardBaseId: BoardId;
  readonly valueKind: "board-space";
};
export type BoardTargetRule<
  State extends CollectorState,
  Target,
  Kind extends BoardTargetKind = BoardTargetKind,
> = TargetRule<State, Target> &
  (Target extends string
    ? {
        readonly targetKind: Kind;
        readonly boardId: string;
        readonly valueKind: "board-id";
      }
    : Target extends BoardSpaceTarget<
          PerPlayerInstanceId<"board", infer BoardId>,
          string
        >
      ? {
          readonly targetKind: "space";
          readonly boardBaseId: BoardId;
          readonly valueKind: "board-space";
        }
      : never);
export type BoardTargetBuilder<
  State extends CollectorState,
  Target,
  Kind extends BoardTargetKind = BoardTargetKind,
> = TargetRuleBuilder<State, Target, BoardTargetRule<State, Target, Kind>>;
type BoardIdTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind,
> = TargetRuleBuilder<State, Id, BoardIdTargetRule<State, Id, Kind>>;
type BoardSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
> = TargetRuleBuilder<
  State,
  BoardSpaceTarget<PerPlayerInstanceId<"board", BoardId>, SpaceId>,
  BoardSpaceTargetRule<State, BoardId, SpaceId>
>;

function candidateIdsForKind<State extends CollectorState, Id extends string>(
  q: TableQueriesOfState<State>,
  boardId: string,
  targetKind: BoardTargetKind,
): readonly Id[] {
  const board = q.board(boardId as BoardIdOfTable<TableOfState<State>>).state;
  const collection:
    Readonly<Record<string, { id: string }>> | readonly { id: string }[] =
    targetKind === "edge"
      ? board.layout === "generic"
        ? []
        : board.edges
      : targetKind === "vertex"
        ? board.layout === "generic"
          ? []
          : board.vertices
        : board.spaces;
  // This builder binds Id to the selected board and target kind in the same State.
  return Object.values(collection).map((value) => value.id) as Id[];
}

function createBoardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind,
>(targetKind: Kind, boardId: string): BoardIdTargetBuilder<State, Id, Kind> {
  return createTargetRuleBuilder<State, Id, BoardIdTargetRule<State, Id, Kind>>(
    (predicates) => ({
      ...createTargetRule(
        ({ q }) => candidateIdsForKind<State, Id>(q, boardId, targetKind),
        predicates,
        {
          missingCandidateIssue: {
            errorCode: "BOARD_TARGET_NOT_ELIGIBLE",
            message: "Board target is not eligible.",
          },
        },
      ),
      boardId,
      targetKind,
      valueKind: "board-id",
    }),
  );
}

function createPerPlayerBoardSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
>(boardId: BoardId): BoardSpaceTargetBuilder<State, BoardId, SpaceId> {
  type Target = BoardSpaceTarget<
    PerPlayerInstanceId<"board", BoardId>,
    SpaceId
  >;
  return createTargetRuleBuilder<
    State,
    Target,
    BoardSpaceTargetRule<State, BoardId, SpaceId>
  >((predicates) => ({
    ...createTargetRule(
      ({ state, q }) => {
        const spacesForPlayer = (playerId: string): readonly SpaceId[] =>
          candidateIdsForKind<State, SpaceId>(
            q,
            perPlayerInstanceId("board", boardId, playerId),
            "space",
          );
        return state.table.playerOrder.flatMap((playerId) =>
          spacesForPlayer(playerId).map((spaceId) => ({
            boardId: perPlayerInstanceId("board", boardId, playerId),
            spaceId,
          })),
        );
      },
      predicates,
      {
        missingCandidateIssue: {
          errorCode: "BOARD_TARGET_NOT_ELIGIBLE",
          message: "Board target is not eligible.",
        },
        equals: (left, right) =>
          isBoardSpaceTarget(left) &&
          isBoardSpaceTarget(right) &&
          sameBoardSpaceTarget(left, right),
      },
    ),
    boardBaseId: boardId,
    targetKind: "space",
    valueKind: "board-space",
  }));
}

function makeBoardTargetFactory<Kind extends BoardTargetKind>(
  targetKind: Kind,
) {
  return function target<State extends CollectorState, Id extends string>(
    boardId: string,
  ): BoardIdTargetBuilder<State, Id, Kind> {
    return createBoardTargetBuilder<State, Id, Kind>(targetKind, boardId);
  };
}

export const boardTarget = {
  edge: makeBoardTargetFactory("edge"),
  vertex: makeBoardTargetFactory("vertex"),
  space: makeBoardTargetFactory("space"),
  tile: makeBoardTargetFactory("tile"),
  playerSpace<
    State extends CollectorState,
    BoardId extends string,
    SpaceId extends string,
  >(boardId: BoardId): BoardSpaceTargetBuilder<State, BoardId, SpaceId> {
    return createPerPlayerBoardSpaceTargetBuilder<State, BoardId, SpaceId>(
      boardId,
    );
  },
};
