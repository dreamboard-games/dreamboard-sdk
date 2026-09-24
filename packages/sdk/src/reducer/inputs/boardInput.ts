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

export type PlayerSpaceInputSchema<
  BoardId extends string,
  SpaceId extends string,
  PlayerId extends string,
> = z.ZodObject<{
  boardId: z.ZodLiteral<BoardId>;
  playerId: ManifestIdSchema<PlayerId, "playerId">;
  spaceId: z.ZodType<SpaceId>;
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
    target: BoardTargetRule<State, Id>;
  }): InputCollector<z.ZodType<Id>, State, Kind> {
    const target = options.target;
    return {
      kind,
      schema: z.string() as unknown as z.ZodType<Id>,
      eligibleTargets: ((state, playerId, q) =>
        target.eligible({
          state: state as State,
          playerId: playerId as never,
          q: q as never,
        })) as
        | ((
            state: CollectorState,
            playerId: string,
            q: unknown,
          ) => ReadonlyArray<unknown>)
        | undefined,
      validateTarget: ((state, playerId, q, targetId) =>
        target.validate(
          {
            state: state as State,
            playerId: playerId as never,
            q: q as never,
          },
          targetId as Id,
        )) as
        | ((
            state: CollectorState,
            playerId: string,
            q: unknown,
            targetId: unknown,
          ) => ReturnType<BoardTargetRule<CollectorState, string>["validate"]>)
        | undefined,
      domain: (state: CollectorState, playerId: string, q: unknown) =>
        ({
          type: "boardTarget" as const,
          projection: "resolved" as const,
          targetKind: target.targetKind as Exclude<TargetKind, "card">,
          boardId: target.boardId,
          valueKind: target.valueKind,
          eligibleTargets: target
            .eligible({
              state: state as State,
              playerId: playerId as never,
              q: q as never,
            })
            .map(String),
        }) satisfies BoardTargetDomainDescriptor,
      meta: {
        targetKind: target.targetKind,
        boardId: target.boardId,
        valueKind: target.valueKind,
      },
    } as unknown as InputCollector<z.ZodType<Id>, State, Kind>;
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
    PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
  >;
}): InputCollector<
  PlayerSpaceInputSchema<BoardId, SpaceId, PlayerId>,
  State,
  "board-space"
> {
  const target = options.target;
  const playerIdSchema = markManifestScopedSchema(
    z.string(),
    "playerId",
  ) as unknown as ManifestIdSchema<PlayerId, "playerId">;
  return {
    kind: "board-space",
    schema: z.object({
      boardId: z.literal(target.boardId),
      playerId: playerIdSchema,
      spaceId: z.string() as unknown as z.ZodType<SpaceId>,
    }) as PlayerSpaceInputSchema<BoardId, SpaceId, PlayerId>,
    eligibleTargets: ((state, playerId, q) =>
      target.eligible({
        state: state as State,
        playerId: playerId as never,
        q: q as never,
      })) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
        ) => ReadonlyArray<unknown>)
      | undefined,
    validateTarget: ((state, playerId, q, targetValue) =>
      target.validate(
        {
          state: state as State,
          playerId: playerId as never,
          q: q as never,
        },
        targetValue as PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>,
      )) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
          targetId: unknown,
        ) => ReturnType<
          BoardTargetRule<
            CollectorState,
            PlayerBoardSpaceTarget<string, string, string>
          >["validate"]
        >)
      | undefined,
    domain: (state: CollectorState, playerId: string, q: unknown) =>
      ({
        type: "boardTarget" as const,
        projection: "resolved" as const,
        targetKind: target.targetKind as Exclude<TargetKind, "card">,
        boardId: target.boardId,
        valueKind: target.valueKind,
        eligibleTargets: target
          .eligible({
            state: state as State,
            playerId: playerId as never,
            q: q as never,
          })
          .map((candidate) => candidate.spaceId),
      }) satisfies BoardTargetDomainDescriptor,
    meta: {
      targetKind: target.targetKind,
      boardId: target.boardId,
      valueKind: target.valueKind,
    },
  };
}

export const boardInput = {
  vertex: vertexInput,
  edge: edgeInput,
  tile: tileInput,
  space: spaceInput,
  playerSpace: playerSpaceInput,
};
