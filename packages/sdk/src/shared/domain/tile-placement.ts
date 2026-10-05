import * as z from "zod";
import { MAXIMUM_BOARD_COORDINATE } from "./board-coordinates.js";
const coordinate = z
  .number()
  .int()
  .min(-MAXIMUM_BOARD_COORDINATE)
  .max(MAXIMUM_BOARD_COORDINATE);
export const TilePlacementSchema = z.discriminatedUnion("layout", [
  z.strictObject({
    type: z.literal("OnBoard"),
    layout: z.literal("hex"),
    boardId: z.string().min(1),
    q: coordinate,
    r: coordinate,
    rotation: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
  }),
  z.strictObject({
    type: z.literal("OnBoard"),
    layout: z.literal("square"),
    boardId: z.string().min(1),
    col: coordinate,
    row: coordinate,
    rotation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  }),
]);
export type TilePlacement = Readonly<z.output<typeof TilePlacementSchema>>;
