import * as z from "zod";
import { GENERATED_ID_PREFIX } from "./per-player-instance.js";

const hostTuple = z.tuple([
  z.literal("board-space"),
  z.string().min(1),
  z.string().min(1),
]);
declare const boardSpaceIdentity: unique symbol;
export type BoardSpaceHostId<
  BoardId extends string = string,
  SpaceId extends string = string,
> = string & {
  readonly [boardSpaceIdentity]: {
    readonly boardId: BoardId;
    readonly spaceId: SpaceId;
  };
};

/** Encode host identity; existence and placement are admitted against current state. */
export function boardSpaceHostId<
  BoardId extends string,
  SpaceId extends string,
>(boardId: BoardId, spaceId: SpaceId): BoardSpaceHostId<BoardId, SpaceId> {
  hostTuple.parse(["board-space", boardId, spaceId]);
  // Only this validated canonical encoder constructs the phantom witness.
  return `${GENERATED_ID_PREFIX}${JSON.stringify(["board-space", boardId, spaceId])}` as BoardSpaceHostId<
    BoardId,
    SpaceId
  >;
}

/** Decode canonical syntax only; membership belongs to the zone host resolver. */
export function parseBoardSpaceHostId(
  value: unknown,
): { readonly boardId: string; readonly spaceId: string } | null {
  if (typeof value !== "string" || !value.startsWith(GENERATED_ID_PREFIX))
    return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(value.slice(GENERATED_ID_PREFIX.length));
  } catch {
    return null;
  }
  const parsed = hostTuple.safeParse(candidate);
  if (!parsed.success) return null;
  const [, boardId, spaceId] = parsed.data;
  if (boardSpaceHostId(boardId, spaceId) !== value) return null;
  return { boardId, spaceId };
}
