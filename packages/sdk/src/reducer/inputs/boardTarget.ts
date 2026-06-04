import type { CollectorState, TargetKind } from "../model/spec";
import type { PlayerIdOfState } from "../model/extract";
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

export type BoardTargetRule<State extends CollectorState, Target> = TargetRule<
  State,
  Target
> & {
  readonly boardId: string;
  readonly targetKind: TargetKind;
  readonly valueKind: "board-id" | "player-board-space";
};

export type BoardTargetBuilder<
  State extends CollectorState,
  Target,
> = TargetRuleBuilder<State, Target, BoardTargetRule<State, Target>>;

export type PlayerBoardSpaceTarget<
  BoardId extends string,
  SpaceId extends string,
  PlayerId extends string,
> = {
  readonly boardId: BoardId;
  readonly playerId: PlayerId;
  readonly spaceId: SpaceId;
};

function candidateIdsForKind<State extends CollectorState, Id extends string>(
  q: TableQueriesOfState<State>,
  boardId: string,
  targetKind: TargetKind,
): readonly Id[] {
  if (targetKind === "edge") {
    return idsFromCollection<Id>(q.board.tiled(boardId as never).edges);
  }
  if (targetKind === "vertex") {
    return idsFromCollection<Id>(q.board.tiled(boardId as never).vertices);
  }
  return idsFromCollection<Id>(q.board.get(boardId as never)?.spaces);
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
>(targetKind: TargetKind, boardId: string): BoardTargetBuilder<State, Id> {
  return createTargetRuleBuilder<State, Id, BoardTargetRule<State, Id>>(
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

function createPlayerSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
>(
  boardId: BoardId,
): BoardTargetBuilder<
  State,
  PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerIdOfState<State>>
> {
  type Target = PlayerBoardSpaceTarget<
    BoardId,
    SpaceId,
    PlayerIdOfState<State>
  >;
  return createTargetRuleBuilder<State, Target, BoardTargetRule<State, Target>>(
    (predicates) => ({
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
            left.boardId === right.boardId &&
            left.playerId === right.playerId &&
            left.spaceId === right.spaceId,
        },
      ),
      boardId,
      targetKind: "space",
      valueKind: "player-board-space",
    }),
  );
}

function isPlayerBoardSpaceTarget(
  value: unknown,
): value is PlayerBoardSpaceTarget<string, string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    "boardId" in value &&
    "playerId" in value &&
    "spaceId" in value
  );
}

function makeBoardTargetFactory(targetKind: TargetKind) {
  return function target<State extends CollectorState, Id extends string>(
    boardId: string,
  ): BoardTargetBuilder<State, Id> {
    return createBoardTargetBuilder<State, Id>(targetKind, boardId);
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
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerIdOfState<State>>
  > {
    return createPlayerSpaceTargetBuilder<State, BoardId, SpaceId>(boardId);
  },
};
