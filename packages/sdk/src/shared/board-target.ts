import * as z from "zod";

/** A space on one player's board; boardId is the base manifest board ID. */
export type PlayerBoardSpaceTarget<
  BoardId extends string = string,
  SpaceId extends string = string,
  PlayerId extends string = string,
> = {
  readonly boardId: BoardId;
  readonly playerId: PlayerId;
  readonly spaceId: SpaceId;
};

export const PlayerBoardSpaceTargetSchema = z.strictObject({
  boardId: z.string(),
  playerId: z.string(),
  spaceId: z.string(),
});

export function isPlayerBoardSpaceTarget(
  value: unknown,
): value is PlayerBoardSpaceTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 3 &&
    "boardId" in value &&
    typeof value.boardId === "string" &&
    "playerId" in value &&
    typeof value.playerId === "string" &&
    "spaceId" in value &&
    typeof value.spaceId === "string"
  );
}

export function samePlayerBoardSpaceTarget(
  left: PlayerBoardSpaceTarget,
  right: PlayerBoardSpaceTarget,
): boolean {
  return (
    left.boardId === right.boardId &&
    left.playerId === right.playerId &&
    left.spaceId === right.spaceId
  );
}
