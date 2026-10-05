import * as z from "zod";
import {
  defineHex,
  Grid,
  ring as ringTraversal,
  rectangle as rectangleTraversal,
  spiral as spiralTraversal,
} from "honeycomb-grid";
import { MAXIMUM_BOARD_COORDINATE } from "../../shared/domain/board-coordinates.js";

type Coordinate = { readonly q: number; readonly r: number };
type TileIdentity = {
  readonly boardId: string;
  readonly tileTypeId: string;
  readonly tileId: string;
  readonly name?: string;
};
type CoordinateCell<C extends Coordinate> = C extends Coordinate
  ? { id: `${C["q"]},${C["r"]}`; at: { q: C["q"]; r: C["r"] } }
  : never;
const coordinate = z.strictObject({
  q: z.int().min(-MAXIMUM_BOARD_COORDINATE).max(MAXIMUM_BOARD_COORDINATE),
  r: z.int().min(-MAXIMUM_BOARD_COORDINATE).max(MAXIMUM_BOARD_COORDINATE),
});
const radius = z.int().nonnegative().max(MAXIMUM_BOARD_COORDINATE);
const dimension = z.int().positive().max(MAXIMUM_BOARD_COORDINATE);
/** Fixed boards use the same definitions and seeded placements as movable inventory. */
export function fromCoordinates<
  const Options extends TileIdentity & {
    readonly coordinates: readonly Coordinate[];
  },
>(options: Options) {
  z.array(coordinate).nonempty().parse(options.coordinates);
  const tileTypeId: Options["tileTypeId"] = options.tileTypeId;
  const tileId: Options["tileId"] = options.tileId;
  const boardId: Options["boardId"] = options.boardId;
  return {
    tileTypes: [
      {
        id: tileTypeId,
        name: options.name ?? tileTypeId,
        layout: "hex" as const,
        // Array.map loses the correlation between each coordinate pair and its ID.
        // Every result is built from that same validated pair, preserving the witness.
        cells: options.coordinates.map((at) => ({
          id: `${at.q},${at.r}` as const,
          at: { q: at.q, r: at.r },
        })) as CoordinateCell<Options["coordinates"][number]>[],
      },
    ],
    tileSeeds: [
      {
        id: tileId,
        typeId: tileTypeId,
        home: {
          type: "board" as const,
          boardId,
          layout: "hex" as const,
          q: 0,
          r: 0,
          rotation: 0 as const,
        },
      },
    ],
  };
}
const Hex = defineHex();
type RadiusOptions = TileIdentity & {
  readonly radius: number;
  readonly center?: Coordinate;
};
function checkedRadius(options: RadiusOptions) {
  radius.parse(options.radius);
  const center = coordinate.parse(options.center ?? { q: 0, r: 0 });
  for (const axis of [center.q, center.r]) {
    coordinate.shape.q.parse(axis + options.radius);
    coordinate.shape.q.parse(axis - options.radius);
  }
  return center;
}
export function hexagon<const Options extends RadiusOptions>(options: Options) {
  const center = checkedRadius(options);
  const coordinates = Array.from(
    new Grid(Hex, spiralTraversal({ radius: options.radius, start: center })),
    (hex) => ({ q: hex.q, r: hex.r }),
  );
  return fromCoordinates({ ...options, coordinates });
}
export function spiral<const Options extends RadiusOptions>(options: Options) {
  return hexagon(options);
}
export function ring<const Options extends RadiusOptions>(options: Options) {
  const center = checkedRadius(options);
  const coordinates = Array.from(
    new Grid(Hex, ringTraversal({ radius: options.radius, center })),
    (hex) => ({ q: hex.q, r: hex.r }),
  );
  return fromCoordinates({ ...options, coordinates });
}
export function rectangle<
  const Options extends TileIdentity & {
    readonly width: number;
    readonly height: number;
    readonly start?: Coordinate;
  },
>(options: Options) {
  dimension.parse(options.width);
  dimension.parse(options.height);
  const start = coordinate.parse(options.start ?? { q: 0, r: 0 });
  coordinate.shape.q.parse(start.q + options.width + options.height);
  coordinate.shape.r.parse(start.r + options.height);
  const coordinates = Array.from(
    new Grid(
      Hex,
      rectangleTraversal({
        width: options.width,
        height: options.height,
        start,
      }),
    ),
    (hex) => ({ q: hex.q, r: hex.r }),
  );
  return fromCoordinates({ ...options, coordinates });
}
