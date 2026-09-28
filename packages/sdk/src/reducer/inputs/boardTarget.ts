import {
  isPlayerBoardSpaceTarget,
  samePlayerBoardSpaceTarget,
  type PlayerBoardSpaceTarget,
} from "../../shared/board-target";
export type { PlayerBoardSpaceTarget } from "../../shared/board-target";
import type { CollectorState, TargetKind } from "../model/spec";
import type {
  PlayerIdOfState,
  BoardIdOfTable,
  TableOfState,
} from "../model/extract";
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

export type BoardTargetRule<
  State extends CollectorState,
  Target,
  Kind extends BoardTargetKind = BoardTargetKind,
> = TargetRule<State, Target> & {
  readonly boardId: Target extends PlayerBoardSpaceTarget<
    infer BoardId,
    string,
    string
  >
    ? BoardId
    : string;
  readonly targetKind: Kind;
  readonly valueKind: Target extends string ? "board-id" : "player-board-space";
};

export type BoardTargetBuilder<
  State extends CollectorState,
  Target,
  Kind extends BoardTargetKind = BoardTargetKind,
> = TargetRuleBuilder<State, Target, BoardTargetRule<State, Target, Kind>>;

function candidateIdsForKind<State extends CollectorState, Id extends string>(
  q: TableQueriesOfState<State>,
  boardId: string,
  targetKind: BoardTargetKind,
): readonly Id[] {
  const board = q.board(boardId as BoardIdOfTable<TableOfState<State>>).state;
  if (targetKind === "edge")
    return idsFromCollection<Id>(board.layout === "generic" ? [] : board.edges);
  if (targetKind === "vertex")
    return idsFromCollection<Id>(
      board.layout === "generic" ? [] : board.vertices,
    );
  return idsFromCollection<Id>(board.spaces);
}

function idsFromCollection<Id extends string>(
  collection: unknown,
): readonly Id[] {
  if (!collection) return [];
  const values = Array.isArray(collection)
    ? collection
    : Object.values(collection as Record<string, unknown>);
  return values.flatMap((value) => {
    if (typeof value === "string") return [value as Id];
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof (value as { id?: unknown }).id === "string"
    ) {
      return [(value as { id: string }).id as Id];
    }
    return [];
  });
}

function createBoardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind,
>(targetKind: Kind, boardId: string): BoardTargetBuilder<State, Id, Kind> {
  return createTargetRuleBuilder<State, Id, BoardTargetRule<State, Id, Kind>>(
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
      boardId: boardId as BoardTargetRule<State, Id>["boardId"],
      targetKind,
      valueKind: "board-id" as BoardTargetRule<State, Id>["valueKind"],
    }),
  );
}

function createPlayerSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
>(
  boardId: BoardId,
): BoardTargetBuilder<
  State,
  PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerIdOfState<State>>,
  "space"
> {
  type Target = PlayerBoardSpaceTarget<
    BoardId,
    SpaceId,
    PlayerIdOfState<State>
  >;
  return createTargetRuleBuilder<
    State,
    Target,
    BoardTargetRule<State, Target, "space">
  >((predicates) => ({
    ...createTargetRule(
      ({ state, q }) => {
        const spacesForPlayer = (playerId: string): readonly SpaceId[] =>
          candidateIdsForKind<State, SpaceId>(
            q,
            `${boardId}:${playerId}`,
            "space",
          );
        return state.table.playerOrder.flatMap((playerId) =>
          spacesForPlayer(playerId).map((spaceId) => ({
            boardId,
            playerId: playerId as PlayerIdOfState<State>,
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
          isPlayerBoardSpaceTarget(left) &&
          isPlayerBoardSpaceTarget(right) &&
          samePlayerBoardSpaceTarget(left, right),
      },
    ),
    boardId: boardId as BoardTargetRule<State, Target>["boardId"],
    targetKind: "space",
    valueKind: "player-board-space",
  }));
}

function makeBoardTargetFactory<Kind extends BoardTargetKind>(
  targetKind: Kind,
) {
  return function target<State extends CollectorState, Id extends string>(
    boardId: string,
  ): BoardTargetBuilder<State, Id, Kind> {
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
  >(
    boardId: BoardId,
  ): BoardTargetBuilder<
    State,
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerIdOfState<State>>,
    "space"
  > {
    return createPlayerSpaceTargetBuilder<State, BoardId, SpaceId>(boardId);
  },
};
