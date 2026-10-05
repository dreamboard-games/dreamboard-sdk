import type { GameplayBasis, ReferenceBasis } from "../runtime-types.js";
/** Explicit deterministic authority metadata for authored runtime tests. */
export const testReferenceBasis: ReferenceBasis = {
  sessionId: "test-authority",
  version: 1,
};
export function testGameplayBasis(
  playerId: string,
  version = 1,
): GameplayBasis {
  return {
    sessionId: testReferenceBasis.sessionId,
    version,
    perspectivePlayerId: playerId,
    actionSetVersion: "test-actions",
  };
}

import type * as z from "zod";
import {
  SeatHexSpaceSchema,
  SeatSquareSpaceSchema,
  BoardProjectionSchema,
} from "../seat-topology-schema.js";
import type { SourceSnapshot } from "../../headless/sources/types.js";
import type { SeatSpaceRef } from "../domain/seat-reference.js";
/** Find a current client cell through its deliberately visible tile definition. */
export function projectedSpaceRef(
  snapshot: SourceSnapshot,
  boardId: string,
  tileTypeId: string,
): SeatSpaceRef {
  const view = snapshot.frame.view;
  if (
    !view ||
    typeof view !== "object" ||
    Array.isArray(view) ||
    !("boards" in view)
  )
    throw new Error("Missing board view");
  const board = BoardProjectionSchema.parse(view.boards)[boardId];
  if (!board || board.layout === "generic")
    throw new Error("Missing tiled board");
  const tile = board.tiles.find(
    (tile) => tile.disclosure === "visible" && tile.tileTypeId === tileTypeId,
  );
  const cell =
    tile &&
    Object.values<
      | z.output<typeof SeatHexSpaceSchema>
      | z.output<typeof SeatSquareSpaceSchema>
    >(board.spaces).find((space) => space.tileRef === tile.ref);
  if (!cell) throw new Error("Missing visible tile cell");
  return cell.id;
}
