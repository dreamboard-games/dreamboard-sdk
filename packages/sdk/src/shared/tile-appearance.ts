import { rotateHex, rotateSquare } from "./board-topology.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";
import type { PublicTileAppearance } from "./domain/tile-disclosure.js";
import type { TilePlacement } from "./domain/tile-placement.js";
import type { ReadonlyRuntimeData } from "./runtime-json.js";

type Placement = TilePlacement extends infer P
  ? P extends TilePlacement
    ? Omit<P, "type" | "boardId">
    : never
  : never;

function coordinate(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(value) > MAXIMUM_BOARD_COORDINATE
  )
    throw new Error(
      "Public tile footprint exceeds the board coordinate domain.",
    );
  return value === 0 ? 0 : value;
}

/** Transform only the independently public footprint, never assigned face geometry. */
export function getPublicTileFootprint(
  appearance: ReadonlyRuntimeData<PublicTileAppearance>,
  placement: Placement,
) {
  if (appearance.layout === "hex" && placement.layout === "hex")
    return {
      layout: "hex" as const,
      cells: appearance.cells.map((cell) => {
        const rotated = rotateHex(cell.q, cell.r, placement.rotation);
        return {
          q: coordinate(rotated.q + placement.q),
          r: coordinate(rotated.r + placement.r),
        };
      }),
    };
  if (appearance.layout === "square" && placement.layout === "square")
    return {
      layout: "square" as const,
      cells: appearance.cells.map((cell) => {
        const rotated = rotateSquare(cell.col, cell.row, placement.rotation);
        return {
          col: coordinate(rotated.col + placement.col),
          row: coordinate(rotated.row + placement.row),
        };
      }),
    };
  throw new Error(
    "Tile public appearance must match its board placement layout.",
  );
}
