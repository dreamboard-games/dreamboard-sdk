import * as z from "zod";

/** A space addressed by its canonical runtime board instance. */
export type BoardSpaceTarget<
  BoardId extends string = string,
  SpaceId extends string = string,
> = {
  readonly boardId: BoardId;
  readonly spaceId: SpaceId;
};

export const BoardSpaceTargetSchema = z.strictObject({
  boardId: z.string(),
  spaceId: z.string(),
});

export function isBoardSpaceTarget(value: unknown): value is BoardSpaceTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 2 &&
    "boardId" in value &&
    typeof value.boardId === "string" &&
    "spaceId" in value &&
    typeof value.spaceId === "string"
  );
}

export function sameBoardSpaceTarget(
  left: BoardSpaceTarget,
  right: BoardSpaceTarget,
): boolean {
  return left.boardId === right.boardId && left.spaceId === right.spaceId;
}
