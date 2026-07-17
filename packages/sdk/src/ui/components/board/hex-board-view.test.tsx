import { describe, expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { createHexBoardView } from "./hex-board-view.js";
import { HexGrid, type HexGridBoardProps } from "./HexGrid.js";

const islandTopology = {
  id: "island",
  layout: "hex",
  spaces: {
    center: { id: "center", q: 0, r: 0, fields: { production: 2 } },
    east: { id: "east", q: 1, r: -1, fields: { production: 1 } },
  },
  edges: [{ id: "edge-1", spaceIds: ["center", "east"] }],
  vertices: [{ id: "vertex-1", spaceIds: ["center", "east"] }],
} as const;

interface IslandSpaceView {
  readonly id: "center" | "east";
  readonly terrain: "forest" | "desert";
  readonly numberToken: number | null;
}

describe("createHexBoardView", () => {
  test("merges overlays onto normalized hex tiles", () => {
    const view = createHexBoardView(islandTopology, {
      spaces: [
        { id: "center", terrain: "forest", numberToken: 6 },
        { id: "east", terrain: "desert", numberToken: null },
      ] satisfies readonly IslandSpaceView[],
    });

    expect(view.id).toBe("island");
    expect(view.tiles).toHaveLength(2);
    const center = view.tiles.find((tile) => tile.id === "center");
    expect(center?.q).toBe(0);
    expect(center?.r).toBe(0);
    expect(center?.properties?.production).toBe(2);
    expect(center?.view).toEqual({
      id: "center",
      terrain: "forest",
      numberToken: 6,
    });
  });

  test("throws when an overlay is missing for a board space", () => {
    expect(() =>
      createHexBoardView(islandTopology, {
        spaces: [
          { id: "center", terrain: "forest", numberToken: 6 },
        ] satisfies readonly IslandSpaceView[],
      }),
    ).toThrow(/missing overlay for space 'east'/);
  });

  test("throws when the same space id is supplied twice", () => {
    expect(() =>
      createHexBoardView(islandTopology, {
        spaces: [
          { id: "center", terrain: "forest", numberToken: 6 },
          { id: "center", terrain: "desert", numberToken: 8 },
          { id: "east", terrain: "desert", numberToken: null },
        ] satisfies readonly IslandSpaceView[],
      }),
    ).toThrow(/duplicate overlay for space 'center'/);
  });

  test("throws when an overlay id is not on the board", () => {
    expect(() =>
      createHexBoardView(islandTopology, {
        spaces: [
          { id: "center", terrain: "forest", numberToken: 6 },
          { id: "east", terrain: "desert", numberToken: null },
          // @ts-expect-error -- exercising the runtime guard with an unknown id
          { id: "ghost", terrain: "forest", numberToken: 0 },
        ],
      }),
    ).toThrow(/overlay 'ghost' is not on the board/);
  });

  test("preserves tile.view typing through HexGrid renderTile", () => {
    const view = createHexBoardView(islandTopology, {
      spaces: [
        { id: "center", terrain: "forest", numberToken: 6 },
        { id: "east", terrain: "desert", numberToken: null },
      ] satisfies readonly IslandSpaceView[],
    });

    const seenTerrains: string[] = [];
    const seenTokens: Array<number | null> = [];
    const seenProduction: Array<1 | 2 | undefined> = [];

    const props = {
      board: view,
      hexSize: 30,
      enablePanZoom: false,
      renderTile: (tile) => {
        // Statically typed: tile.view is IslandSpaceView, not unknown.
        seenTerrains.push(tile.view.terrain);
        seenTokens.push(tile.view.numberToken);
        seenProduction.push(tile.properties?.production);
        return null;
      },
      renderEdge: () => null,
      renderVertex: () => null,
    } satisfies HexGridBoardProps<typeof view>;

    renderToString(<HexGrid {...props} />);

    expect(seenTerrains.sort()).toEqual(["desert", "forest"]);
    expect(seenTokens).toContain(6);
    expect(seenTokens).toContain(null);
    expect(seenProduction.sort()).toEqual([1, 2]);
  });
});
