import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetPredicate<State, Target, Definitions>;

type BoardTargetKind = Exclude<TargetKind, "card" | "tile">;

export type BoardIdTargetRule<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind = BoardTargetKind,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRule<State, Id, Definitions> & {
  readonly targetKind: Kind;
  readonly boardId: string;
  readonly valueKind: "board-id";
};
export type BoardSpaceTargetRule<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRule<
  State,
  BoardSpaceTarget<PerPlayerInstanceId<"board", BoardId>, SpaceId>,
  Definitions
> & {
  readonly targetKind: "space";
  readonly boardBaseId: BoardId;
  readonly valueKind: "board-space";
};
export type BoardTargetRule<
  State extends CollectorState,
  Target,
  Kind extends BoardTargetKind = BoardTargetKind,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRule<State, Target, Definitions> &
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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRuleBuilder<
  State,
  Target,
  BoardTargetRule<State, Target, Kind, Definitions>,
  Definitions
>;
type BoardIdTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Kind extends BoardTargetKind,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRuleBuilder<
  State,
  Id,
  BoardIdTargetRule<State, Id, Kind, Definitions>,
  Definitions
>;
type BoardSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRuleBuilder<
  State,
  BoardSpaceTarget<PerPlayerInstanceId<"board", BoardId>, SpaceId>,
  BoardSpaceTargetRule<State, BoardId, SpaceId, Definitions>,
  Definitions
>;

function candidateIdsForKind<
  State extends CollectorState,
  Id extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  q: TableQueriesOfState<State, Definitions>,
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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  targetKind: Kind,
  boardId: string,
): BoardIdTargetBuilder<State, Id, Kind, Definitions> {
  return createTargetRuleBuilder<
    State,
    Id,
    BoardIdTargetRule<State, Id, Kind, Definitions>,
    Definitions
  >((predicates) => ({
    ...createTargetRule(
      ({ q }) =>
        candidateIdsForKind<State, Id, Definitions>(q, boardId, targetKind),
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
  }));
}

function createPerPlayerBoardSpaceTargetBuilder<
  State extends CollectorState,
  BoardId extends string,
  SpaceId extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  boardId: BoardId,
): BoardSpaceTargetBuilder<State, BoardId, SpaceId, Definitions> {
  type Target = BoardSpaceTarget<
    PerPlayerInstanceId<"board", BoardId>,
    SpaceId
  >;
  return createTargetRuleBuilder<
    State,
    Target,
    BoardSpaceTargetRule<State, BoardId, SpaceId, Definitions>,
    Definitions
  >((predicates) => ({
    ...createTargetRule(
      ({ state, q }) => {
        const spacesForPlayer = (playerId: string): readonly SpaceId[] =>
          candidateIdsForKind<State, SpaceId, Definitions>(
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
  return function target<
    State extends CollectorState,
    Id extends string,
    Definitions extends TopologyDefinitions = TopologyDefinitions,
  >(boardId: string): BoardIdTargetBuilder<State, Id, Kind, Definitions> {
    return createBoardTargetBuilder<State, Id, Kind, Definitions>(
      targetKind,
      boardId,
    );
  };
}

export const boardTarget = {
  edge: makeBoardTargetFactory("edge"),
  vertex: makeBoardTargetFactory("vertex"),
  space: makeBoardTargetFactory("space"),
  playerSpace<
    State extends CollectorState,
    BoardId extends string,
    SpaceId extends string,
    Definitions extends TopologyDefinitions = TopologyDefinitions,
  >(
    boardId: BoardId,
  ): BoardSpaceTargetBuilder<State, BoardId, SpaceId, Definitions> {
    return createPerPlayerBoardSpaceTargetBuilder<
      State,
      BoardId,
      SpaceId,
      Definitions
    >(boardId);
  },
};
