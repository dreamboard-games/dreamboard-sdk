import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";
import { describe, expect, test } from "vitest";
import {
  BoardProjectionSchema,
  ProjectedTileSchema,
} from "./seat-topology-schema.js";
import {
  SeatSpaceRefSchema,
  SeatTileRefSchema,
} from "./domain/seat-reference.js";

const ref = SeatTileRefSchema.parse(`tile-ref:sha256:${"a".repeat(64)}`);
const spaceRef = SeatSpaceRefSchema.parse(`space-ref:sha256:${"b".repeat(64)}`);
const visible = {
  disclosure: "visible" as const,
  ref,
  tileTypeId: "terrain",
  name: "Terrain",
  ownerId: null,
  fields: {},
  properties: {},
};
const concealed = {
  disclosure: "concealed" as const,
  ref,
  appearance: { layout: "square" as const, cells: [{ col: 0, row: 0 }] },
};
function board() {
  return {
    id: "map",
    baseId: "map",
    name: "Map",
    scope: "shared" as const,
    layout: "square" as const,
    fields: {},
    relations: [],
    edges: [],
    vertices: [],
    tiles: [
      {
        ...visible,
        placement: { layout: "square" as const, col: 0, row: 0, rotation: 0 },
      },
    ],
    spaces: {
      [spaceRef]: {
        id: spaceRef,
        tileRef: ref,
        localCellId: "cell",
        col: 0,
        row: 0,
        fields: {},
      },
    },
  };
}
describe("seat topology wire admission", () => {
  test("admits visible and independent concealed presentations", () => {
    expect(ProjectedTileSchema.parse(visible)).toEqual(visible);
    expect(ProjectedTileSchema.parse(concealed)).toEqual(concealed);
    expect(BoardProjectionSchema.parse({ map: board() }).map).toEqual(board());
  });
  test.each(["tileId", "tileTypeId", "ownerId", "properties", "fields"])(
    "rejects secret %s on a concealed presentation",
    (key) => {
      expect(
        ProjectedTileSchema.safeParse({ ...concealed, [key]: "secret" })
          .success,
      ).toBe(false);
    },
  );
  test("rejects authoritative identity in reference and cell positions", () => {
    expect(
      ProjectedTileSchema.safeParse({ ...visible, ref: "authoritative-tile" })
        .success,
    ).toBe(false);
    const value = board();
    expect(
      BoardProjectionSchema.safeParse({
        map: {
          ...value,
          spaces: {
            [spaceRef]: {
              ...value.spaces[spaceRef],
              tileId: "authoritative-tile",
            },
          },
        },
      }).success,
    ).toBe(false);
  });
  test("rejects cells belonging to missing or concealed tiles", () => {
    const value = board();
    expect(
      BoardProjectionSchema.safeParse({ map: { ...value, tiles: [] } }).success,
    ).toBe(false);
    expect(
      BoardProjectionSchema.safeParse({
        map: {
          ...value,
          tiles: [{ ...concealed, placement: value.tiles[0].placement }],
        },
      }).success,
    ).toBe(false);
  });
  test("rejects duplicate local cells under different opaque references", () => {
    const value = board();
    const another = SeatSpaceRefSchema.parse(
      `space-ref:sha256:${"c".repeat(64)}`,
    );
    expect(
      BoardProjectionSchema.safeParse({
        map: {
          ...value,
          spaces: {
            ...value.spaces,
            [another]: { ...value.spaces[spaceRef], id: another },
          },
        },
      }).success,
    ).toBe(false);
  });
  test("rejects duplicate tile references and mismatched presentation layout", () => {
    const value = board();
    expect(
      BoardProjectionSchema.safeParse({
        map: { ...value, tiles: [...value.tiles, ...value.tiles] },
      }).success,
    ).toBe(false);
    expect(
      BoardProjectionSchema.safeParse({
        map: {
          ...value,
          spaces: {},
          tiles: [
            {
              ...concealed,
              appearance: { layout: "hex", cells: [{ q: 0, r: 0 }] },
              placement: value.tiles[0].placement,
            },
          ],
        },
      }).success,
    ).toBe(false);
  });
  test("rejects secret authored cell identities in independent public appearance", () => {
    expect(
      ProjectedTileSchema.safeParse({
        ...concealed,
        appearance: {
          layout: "square",
          cells: [{ id: "secret-cell", col: 0, row: 0 }],
        },
      }).success,
    ).toBe(false);
  });
});

test("rejects concealed footprints outside the coordinate domain after placement", () => {
  const value = {
    ...board(),
    spaces: {},
    tiles: [
      {
        ...concealed,
        appearance: { layout: "square", cells: [{ col: 1, row: 0 }] },
        placement: {
          layout: "square",
          col: MAXIMUM_BOARD_COORDINATE,
          row: 0,
          rotation: 0,
        },
      },
    ],
  };
  expect(BoardProjectionSchema.safeParse({ map: value }).success).toBe(false);
});
