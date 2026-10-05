import * as z from "zod";
import {
  BoardSpaceSchema,
  GenericBoardTopologySchema,
  HexBoardTopologySchema,
  SquareBoardTopologySchema,
  identityRecord,
  validateTopologyGraph,
} from "./board-topology-schema.js";
import { PublicTileAppearanceSchema } from "./domain/tile-disclosure.js";
import {
  SeatSpaceRefSchema,
  SeatTileRefSchema,
} from "./domain/seat-reference.js";
import { TilePlacementSchema } from "./domain/tile-placement.js";
import { RuntimeJsonSchema, type ReadonlyRuntimeData } from "./runtime-json.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";

const coordinate = z
  .int()
  .min(-MAXIMUM_BOARD_COORDINATE)
  .max(MAXIMUM_BOARD_COORDINATE);
const fields = z.record(z.string(), RuntimeJsonSchema);
export const ProjectedTileSchema = z.discriminatedUnion("disclosure", [
  z.strictObject({
    disclosure: z.literal("visible"),
    ref: SeatTileRefSchema,
    tileTypeId: z.string().min(1),
    name: z.string(),
    frontImage: z.string().optional(),
    ownerId: z.string().min(1).nullable(),
    fields,
    properties: fields,
  }),
  z.strictObject({
    disclosure: z.literal("concealed"),
    ref: SeatTileRefSchema,
    appearance: PublicTileAppearanceSchema,
  }),
]);
export type ProjectedTile = ReadonlyRuntimeData<
  z.output<typeof ProjectedTileSchema>
>;

const placement = z.discriminatedUnion("layout", [
  TilePlacementSchema.options[0].omit({ type: true, boardId: true }),
  TilePlacementSchema.options[1].omit({ type: true, boardId: true }),
]);
const placedTile = z.discriminatedUnion("disclosure", [
  ProjectedTileSchema.options[0].extend({ placement }),
  ProjectedTileSchema.options[1].extend({ placement }),
]);
const cell = BoardSpaceSchema.extend({
  id: SeatSpaceRefSchema,
  tileRef: SeatTileRefSchema,
  localCellId: z.string().min(1),
});
export const SeatHexSpaceSchema = cell.extend({ q: coordinate, r: coordinate });
export const SeatSquareSpaceSchema = cell.extend({
  col: coordinate,
  row: coordinate,
});
export const SeatBoardTopologySchema = z
  .discriminatedUnion("layout", [
    GenericBoardTopologySchema,
    HexBoardTopologySchema.extend({
      spaces: identityRecord(SeatHexSpaceSchema),
      tiles: z.array(placedTile),
    }),
    SquareBoardTopologySchema.extend({
      spaces: identityRecord(SeatSquareSpaceSchema),
      tiles: z.array(placedTile),
    }),
  ])
  .superRefine((board, ctx) => {
    validateTopologyGraph(board, ctx);
    if (board.layout === "generic") return;
    const tiles = new Map(board.tiles.map((tile) => [tile.ref, tile]));
    if (tiles.size !== board.tiles.length)
      ctx.addIssue({
        code: "custom",
        path: ["tiles"],
        message: "Tile references must be unique.",
      });
    for (const [index, tile] of board.tiles.entries()) {
      if (
        tile.placement.layout !== board.layout ||
        (tile.disclosure === "concealed" &&
          tile.appearance.layout !== board.layout)
      )
        ctx.addIssue({
          code: "custom",
          path: ["tiles", index],
          message: "Tile presentation must match its board layout.",
        });
    }
    const cellsByTile = new Map<string, Set<string>>();
    for (const [id, space] of Object.entries<
      | z.output<typeof SeatHexSpaceSchema>
      | z.output<typeof SeatSquareSpaceSchema>
    >(board.spaces)) {
      const cells = cellsByTile.get(space.tileRef) ?? new Set<string>();
      if (cells.has(space.localCellId))
        ctx.addIssue({
          code: "custom",
          path: ["spaces", id],
          message: "A visible tile cell may be projected only once.",
        });
      cells.add(space.localCellId);
      cellsByTile.set(space.tileRef, cells);
      if (tiles.get(space.tileRef)?.disclosure !== "visible")
        ctx.addIssue({
          code: "custom",
          path: ["spaces", id],
          message: "A projected cell must belong to a visible tile.",
        });
    }
  });
export const BoardProjectionSchema = identityRecord(SeatBoardTopologySchema);
export type SeatBoardTopology = ReadonlyRuntimeData<
  z.output<typeof SeatBoardTopologySchema>
>;
