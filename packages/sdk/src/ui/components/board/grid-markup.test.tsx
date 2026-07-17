/**
 * Characterization snapshots of HexGrid and SquareGrid SVG output.
 *
 * These act as a behavioral regression oracle for refactoring the grid
 * implementations: the rendered markup must stay byte-identical while the
 * internals are restructured. Cases deliberately cover both the custom
 * render-prop paths and the default interactive fallback paths, plus the
 * known behavioral divergences between the two grids (browser-attribute
 * spreading, select dispatch, pan/zoom gating).
 */
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { HexGrid } from "./HexGrid.js";
import { SquareGrid } from "./SquareGrid.js";
import type {
  HexEdgeState,
  HexTileState,
  HexVertexState,
  SquareCellState,
  SquareEdgeState,
  SquarePieceState,
  SquareVertexState,
} from "../../types/player-state.js";

const hexTiles: HexTileState[] = [
  { id: "center", q: 0, r: 0, label: "Center" },
  { id: "east", q: 1, r: -1 },
  { id: "north", q: 0, r: -1 },
  { id: "southeast", q: 1, r: 0 },
];

const hexEdges: HexEdgeState[] = [
  { id: "edge-a", hex1: "center", hex2: "east" },
  { id: "edge-b", hex1: "center", hex2: "north" },
];

const hexVertices: HexVertexState[] = [
  { id: "vertex-a", hexes: ["center", "east", "north"] },
  { id: "vertex-b", hexes: ["center", "east", "southeast"] },
];

test("HexGrid full markup with custom renderers and interactive layers", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      width={640}
      height={480}
      enablePanZoom={false}
      interactiveSpaces={{
        eligible: new Set(["center", "east"]),
        selectTargetId: () => undefined,
      }}
      interactiveEdges={{
        eligible: new Set(["edge-a"]),
        selectTargetId: () => undefined,
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-a"]),
        selectTargetId: () => undefined,
      }}
      renderTile={(tile, geometry) => (
        <polygon points={geometry.points()} data-tile={tile.id} />
      )}
      renderEdge={(edge, position) => (
        <line
          x1={position.x1}
          y1={position.y1}
          x2={position.x2}
          y2={position.y2}
          data-edge={edge.id}
        />
      )}
      renderVertex={(vertex, position) => (
        <circle cx={position.x} cy={position.y} r={6} data-vertex={vertex.id} />
      )}
      renderInteractiveSpace={(space, state) => (
        <polygon
          data-interactive-space={space.id}
          data-state={`${state.isEnabled}:${state.isEligible}:${state.isHovered}`}
        />
      )}
    />,
  );

  expect(html).toMatchSnapshot();
});

test("HexGrid default interactive fallbacks and browser attributes", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      enablePanZoom={false}
      interactiveEdges={{
        eligible: new Set(["edge-a"]),
        selectTargetId: () => undefined,
        targetState: (targetId) =>
          targetId === "edge-a"
            ? {
                browserAttributes: {
                  "data-dreamboard-browser-role": "actuator",
                  "data-dreamboard-browser-intent": "select",
                  "data-dreamboard-candidate-value": '"edge-a"',
                },
              }
            : {},
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-a"]),
        selectTargetId: () => undefined,
      }}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );

  expect(html).toMatchSnapshot();
});

test("HexGrid flat-top orientation without interactive layers", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      orientation="flat-top"
      hexSize={32}
      enablePanZoom={false}
      renderTile={(tile, geometry) => (
        <polygon points={geometry.points({ inset: 4 })} data-tile={tile.id} />
      )}
      renderEdge={(edge, position) => (
        <line
          x1={position.x1}
          y1={position.y1}
          x2={position.x2}
          y2={position.y2}
          data-edge={edge.id}
        />
      )}
      renderVertex={(vertex, position) => (
        <circle cx={position.x} cy={position.y} r={4} data-vertex={vertex.id} />
      )}
    />,
  );

  expect(html).toMatchSnapshot();
});

const squareCells: SquareCellState[] = Array.from({ length: 3 }, (_, row) =>
  Array.from({ length: 3 }, (_, col) => ({
    id: `cell-${row}-${col}`,
    row,
    col,
  })),
).flat();

const squareEdges: SquareEdgeState[] = [
  { id: "edge-a", spaceIds: ["cell-0-0", "cell-0-1"] },
  { id: "edge-b", spaceIds: ["cell-0-0", "cell-1-0"] },
];

const squareVertices: SquareVertexState[] = [
  {
    id: "vertex-a",
    spaceIds: ["cell-0-0", "cell-0-1", "cell-1-0", "cell-1-1"],
  },
  {
    id: "vertex-b",
    spaceIds: ["cell-1-1", "cell-1-2", "cell-2-1", "cell-2-2"],
  },
];

const squarePieces: SquarePieceState[] = [
  {
    id: "piece-a",
    row: 0,
    col: 0,
    typeId: "pawn" as SquarePieceState["typeId"],
  },
  {
    id: "piece-b",
    row: 2,
    col: 2,
    typeId: "rook" as SquarePieceState["typeId"],
  },
];

test("SquareGrid full markup with custom renderers and interactive layers", () => {
  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={squarePieces}
      edges={squareEdges}
      vertices={squareVertices}
      showCoordinates={false}
      interactiveSpaces={{
        eligible: new Set(["cell-0-0", "cell-1-1"]),
        selectTargetId: () => undefined,
      }}
      interactiveEdges={{
        eligible: new Set(["edge-a"]),
        selectTargetId: () => undefined,
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-a"]),
        selectTargetId: () => undefined,
      }}
      renderCell={(cell) => <rect data-cell={cell.id} />}
      renderPiece={(piece) => <circle r={8} data-piece={piece.id} />}
      renderInteractiveSpace={(space, state) => (
        <rect
          data-interactive-space={space.id}
          data-state={`${state.isEnabled}:${state.isEligible}:${state.isHovered}`}
        />
      )}
    />,
  );

  expect(html).toMatchSnapshot();
});

test("SquareGrid default interactive fallbacks with coordinates", () => {
  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={[]}
      edges={squareEdges}
      vertices={squareVertices}
      showCoordinates={true}
      interactiveSpaces={{
        eligible: new Set(["cell-0-0"]),
        selectTargetId: () => undefined,
      }}
      interactiveEdges={{
        eligible: new Set(["edge-a"]),
        selectTargetId: () => undefined,
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-a"]),
        selectTargetId: () => undefined,
      }}
      renderCell={() => null}
      renderPiece={() => null}
    />,
  );

  expect(html).toMatchSnapshot();
});

test("SquareGrid with pan/zoom enabled", () => {
  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={[]}
      showCoordinates={false}
      enablePanZoom={true}
      renderCell={(cell) => <rect data-cell={cell.id} />}
      renderPiece={() => null}
    />,
  );

  expect(html).toMatchSnapshot();
});
