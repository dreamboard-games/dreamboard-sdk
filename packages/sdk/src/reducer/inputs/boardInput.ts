import type { PlayerIdOfState, TableQueriesOfState } from "../model";
import { z } from "zod";
import type {
  BoardTargetDomainDescriptor,
  CollectorState,
  InputCollector,
  TargetKind,
} from "../model/spec";
import {
  markManifestScopedSchema,
  type ManifestIdSchema,
} from "../model/manifest";
import type { BoardTargetRule, PlayerBoardSpaceTarget } from "./boardTarget";

export type PlayerSpaceInputSchema<BoardId extends string> = z.ZodObject<{
  boardId: z.ZodLiteral<BoardId>;
  playerId: ManifestIdSchema<string, "playerId">;
  spaceId: z.ZodString;
}>;

/**
 * `boardInput.*` helpers produce collectors that accept a board-element id
 * (vertex / edge / space / tile) scoped to one built `boardTarget` rule.
 *
 * Id typing:
 *   The `Id` type parameter is the branded id for the board you target,
 *   e.g. `HexVertexIdOfTable<Table, "main">` or
 *   `SquareSpaceIdOfTable<Table, "board">`. Once tightened,
 *   `ParamsOf<Collectors>` downstream typing reflects the branded id too.
 *
 * Eligibility:
 *   Pass a built `boardTarget.*(...).where(...).build()` rule. The same rule
 *   feeds server-authoritative eligible-target projection, submit validation,
 *   and tests through its `bind({ state, playerId, q })` helper.
 *
 * Runtime vs. compile time:
 *   At runtime the submitted value is a string. Branding is purely a
 *   compile-time discipline.
 */
function makeBoardCollector<
  Kind extends "board-vertex" | "board-edge" | "board-tile" | "board-space",
>(kind: Kind) {
  return function collector<
    State extends CollectorState = CollectorState,
    Id extends string = string,
  >(options: {
    target: BoardTargetRule<
      State,
      Id,
      Kind extends `board-${infer Target extends Exclude<TargetKind, "card">}`
        ? Target
        : never
    >;
  }): InputCollector<z.ZodString, State, Kind, Id> {
    const target = options.target;
    const eligible = (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State>,
    ) => target.eligible({ state, playerId, q });
    // Assembly binds state/player/queries to one validated game contract.
    // Schemas check wire shape only; validateTarget must resolve a canonical
    // candidate before the runtime exposes the refined Id to authored reducers.
    // This is the explicit binding of both invariants into the runtime registry.
    // eslint-disable-next-line no-restricted-syntax -- Assembly binds these hooks to State; canonical target membership supplies Id after the string schema parses.
    return {
      kind,
      schema: z.string(),
      eligibleTargets: eligible,
      validateTarget: (
        state: State,
        playerId: PlayerIdOfState<State>,
        q: TableQueriesOfState<State>,
        targetId: unknown,
      ) => target.validate({ state, playerId, q }, targetId),
      domain: (
        state: State,
        playerId: PlayerIdOfState<State>,
        q: TableQueriesOfState<State>,
      ) =>
        ({
          type: "boardTarget",
          projection: "resolved",
          targetKind: target.targetKind,
          boardId: target.boardId,
          valueKind: "board-id",
          eligibleTargets: eligible(state, playerId, q),
        }) satisfies BoardTargetDomainDescriptor,
      meta: {
        targetKind: target.targetKind,
        boardId: target.boardId,
        valueKind: "board-id",
      },
    } as unknown as InputCollector<z.ZodString, State, Kind, Id>;
  };
}

export const vertexInput = makeBoardCollector("board-vertex");
export const edgeInput = makeBoardCollector("board-edge");
export const tileInput = makeBoardCollector("board-tile");
export const spaceInput = makeBoardCollector("board-space");

export function playerSpaceInput<
  State extends CollectorState = CollectorState,
  BoardId extends string = string,
  SpaceId extends string = string,
  PlayerId extends string = string,
>(options: {
  target: BoardTargetRule<
    State,
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>,
    "space"
  >;
}): InputCollector<
  PlayerSpaceInputSchema<BoardId>,
  State,
  "board-space",
  PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
> {
  const target = options.target;
  const playerIdSchema = markManifestScopedSchema(z.string(), "playerId");
  const eligible = (
    state: State,
    playerId: PlayerIdOfState<State>,
    q: TableQueriesOfState<State>,
  ) => target.eligible({ state, playerId, q });
  // Assembly binds state/player/queries to one validated game contract.
  // Schemas check wire shape only; validateTarget must resolve a canonical
  // candidate before the runtime exposes the refined Id to authored reducers.
  // This is the explicit binding of both invariants into the runtime registry.
  // eslint-disable-next-line no-restricted-syntax -- Assembly binds these hooks to State; the strict object schema and canonical target membership supply the player-space value.
  return {
    kind: "board-space",
    schema: z.strictObject({
      boardId: z.literal(target.boardId),
      playerId: playerIdSchema,
      spaceId: z.string(),
    }),
    eligibleTargets: eligible,
    validateTarget: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State>,
      targetValue: unknown,
    ) => target.validate({ state, playerId, q }, targetValue),
    domain: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State>,
    ) =>
      ({
        type: "boardTarget",
        projection: "resolved",
        targetKind: "space",
        boardId: target.boardId,
        valueKind: "player-board-space",
        eligibleTargets: eligible(state, playerId, q),
      }) satisfies BoardTargetDomainDescriptor,
    meta: {
      targetKind: target.targetKind,
      boardId: target.boardId,
      valueKind: "player-board-space",
    },
  } as unknown as InputCollector<
    PlayerSpaceInputSchema<BoardId>,
    State,
    "board-space",
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
  >;
}

export const boardInput = {
  vertex: vertexInput,
  edge: edgeInput,
  tile: tileInput,
  space: spaceInput,
  playerSpace: playerSpaceInput,
};
