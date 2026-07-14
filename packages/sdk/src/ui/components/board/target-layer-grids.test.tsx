import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { HexGrid, hexUtils, type HexTileGeometry } from "./HexGrid.js";
import {
  SquareGrid,
  type SquareEdgePosition,
  type SquareVertexPosition,
} from "./SquareGrid.js";
import type { InteractiveTargetRenderState } from "./target-layer.js";
import type {
  HexEdgeState,
  HexTileState,
  HexVertexState,
  SquareCellState,
  SquareEdgeState,
  SquareVertexState,
} from "../../types/player-state.js";

const hexTiles: HexTileState[] = [
  { id: "center", q: 0, r: 0 },
  { id: "east", q: 1, r: -1 },
  { id: "north", q: 0, r: -1 },
  { id: "southeast", q: 1, r: 0 },
];

const hexEdges: HexEdgeState[] = [
  { id: "edge-eligible", hex1: "center", hex2: "east" },
  { id: "edge-ineligible", hex1: "center", hex2: "north" },
];

const hexVertices: HexVertexState[] = [
  { id: "vertex-eligible", hexes: ["center", "east", "north"] },
  { id: "vertex-ineligible", hexes: ["center", "east", "southeast"] },
];

test("HexGrid target layers make only eligible targets interactive", () => {
  const spaceStates: InteractiveTargetRenderState[] = [];
  const edgeStates: InteractiveTargetRenderState[] = [];
  const vertexStates: InteractiveTargetRenderState[] = [];

  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      enablePanZoom={false}
      interactiveSpaces={{
        eligible: new Set(["center"]),
        selectTargetId: () => undefined,
      }}
      interactiveEdges={{
        eligible: new Set(["edge-eligible"]),
        selectTargetId: () => undefined,
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-eligible"]),
        selectTargetId: () => undefined,
      }}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
      renderInteractiveSpace={(_space, state) => {
        spaceStates.push(state);
        return (
          <polygon
            data-space-state={`${state.isEnabled}:${state.isEligible}`}
          />
        );
      }}
      renderInteractiveEdge={(_edge, _position, state) => {
        edgeStates.push(state);
        return (
          <line data-edge-state={`${state.isEnabled}:${state.isEligible}`} />
        );
      }}
      renderInteractiveVertex={(_vertex, _position, state) => {
        vertexStates.push(state);
        return (
          <circle
            data-vertex-state={`${state.isEnabled}:${state.isEligible}`}
          />
        );
      }}
    />,
  );

  expect(html).toContain('aria-label="Select space center"');
  expect(html).not.toContain('aria-label="Select space east"');
  expect(html).toContain('aria-label="Select edge edge-eligible"');
  expect(html).not.toContain('aria-label="Select edge edge-ineligible"');
  expect(html).toContain('aria-label="Select vertex vertex-eligible"');
  expect(html).not.toContain('aria-label="Select vertex vertex-ineligible"');
  expect(html.match(/role="button"/g)?.length).toBe(3);
  expect(html.match(/(?:tabIndex|tabindex)="0"/g)?.length).toBe(3);
  expect(spaceStates.map((state) => state.isEligible)).toEqual([
    true,
    false,
    false,
    false,
  ]);
  expect(edgeStates.map((state) => state.isEligible)).toEqual([true, false]);
  expect(vertexStates.map((state) => state.isEligible)).toEqual([true, false]);
  expect(spaceStates.every((state) => state.isEnabled)).toBe(true);
  expect(edgeStates.every((state) => state.isEnabled)).toBe(true);
  expect(vertexStates.every((state) => !state.isHovered)).toBe(true);
});

test("HexGrid target layers render browser interaction attributes", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      enablePanZoom={false}
      interactiveVertices={{
        eligible: new Set(["vertex-eligible"]),
        selectTargetId: () => undefined,
        targetState: (targetId) =>
          targetId === "vertex-eligible"
            ? {
                browserAttributes: {
                  "data-dreamboard-browser-role": "actuator",
                  "data-dreamboard-browser-intent": "select",
                  "data-dreamboard-candidate-value": '"vertex-eligible"',
                },
              }
            : {},
      }}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );

  expect(html).toContain('data-dreamboard-browser-role="actuator"');
  expect(html).toContain('data-dreamboard-browser-intent="select"');
  expect(html).toContain(
    'data-dreamboard-candidate-value="&quot;vertex-eligible&quot;"',
  );
});

test("HexGrid target layers treat missing eligible set as all targets eligible", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      enablePanZoom={false}
      interactiveSpaces={{ selectTargetId: () => undefined }}
      interactiveEdges={{ selectTargetId: () => undefined }}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );

  expect(html).toContain('aria-label="Select space center"');
  expect(html).toContain('aria-label="Select space east"');
  expect(html).toContain('aria-label="Select edge edge-eligible"');
  expect(html).toContain('aria-label="Select edge edge-ineligible"');
});

test("HexGrid disables space targets when layer enabled is false", () => {
  const states: InteractiveTargetRenderState[] = [];
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={hexEdges}
      vertices={hexVertices}
      hexSize={40}
      enablePanZoom={false}
      interactiveSpaces={{
        enabled: false,
        eligible: new Set(["center"]),
        selectTargetId: () => undefined,
      }}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
      renderInteractiveSpace={(_space, state) => {
        states.push(state);
        return <polygon data-enabled={String(state.isEnabled)} />;
      }}
    />,
  );

  expect(html).not.toContain('role="button"');
  expect(/(?:tabIndex|tabindex)="0"/.test(html)).toBe(false);
  expect(html).not.toContain('aria-label="Select space center"');
  expect(states.map((state) => state.isEnabled)).toEqual([
    false,
    false,
    false,
    false,
  ]);
  expect(states.map((state) => state.isEligible)).toEqual([
    true,
    false,
    false,
    false,
  ]);
});

const squareCells: SquareCellState[] = Array.from({ length: 3 }, (_, row) =>
  Array.from({ length: 3 }, (_, col) => ({
    id: `cell-${row}-${col}`,
    row,
    col,
  })),
).flat();

const squareEdges: SquareEdgeState[] = [
  { id: "edge-eligible", spaceIds: ["cell-0-0", "cell-0-1"] },
  { id: "edge-ineligible", spaceIds: ["cell-0-0", "cell-1-0"] },
];

const squareVertices: SquareVertexState[] = [
  {
    id: "vertex-eligible",
    spaceIds: ["cell-0-0", "cell-0-1", "cell-1-0", "cell-1-1"],
  },
  {
    id: "vertex-ineligible",
    spaceIds: ["cell-1-1", "cell-1-2", "cell-2-1", "cell-2-2"],
  },
];

test("SquareGrid target layers make only eligible targets interactive", () => {
  const spaceStates: InteractiveTargetRenderState[] = [];
  const edgeStates: InteractiveTargetRenderState[] = [];
  const vertexStates: InteractiveTargetRenderState[] = [];
  const edgePositions: SquareEdgePosition[] = [];
  const vertexPositions: SquareVertexPosition[] = [];

  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={[]}
      edges={squareEdges}
      vertices={squareVertices}
      showCoordinates={false}
      interactiveSpaces={{
        eligible: new Set(["cell-0-0"]),
        selectTargetId: () => undefined,
      }}
      interactiveEdges={{
        eligible: new Set(["edge-eligible"]),
        selectTargetId: () => undefined,
      }}
      interactiveVertices={{
        eligible: new Set(["vertex-eligible"]),
        selectTargetId: () => undefined,
      }}
      renderCell={() => null}
      renderPiece={() => null}
      renderInteractiveSpace={(_space, state) => {
        spaceStates.push(state);
        return (
          <rect data-space-state={`${state.isEnabled}:${state.isEligible}`} />
        );
      }}
      renderInteractiveEdge={(_edge, position, state) => {
        edgePositions.push(position);
        edgeStates.push(state);
        return (
          <line data-edge-state={`${state.isEnabled}:${state.isEligible}`} />
        );
      }}
      renderInteractiveVertex={(_vertex, position, state) => {
        vertexPositions.push(position);
        vertexStates.push(state);
        return (
          <circle
            data-vertex-state={`${state.isEnabled}:${state.isEligible}`}
          />
        );
      }}
    />,
  );

  expect(html).toContain('aria-label="Select space cell-0-0"');
  expect(html).not.toContain('aria-label="Select space cell-0-1"');
  expect(html).toContain('aria-label="Select edge edge-eligible"');
  expect(html).not.toContain('aria-label="Select edge edge-ineligible"');
  expect(html).toContain('aria-label="Select vertex vertex-eligible"');
  expect(html).not.toContain('aria-label="Select vertex vertex-ineligible"');
  expect(html.match(/role="button"/g)?.length).toBe(3);
  expect(html.match(/(?:tabIndex|tabindex)="0"/g)?.length).toBe(3);
  expect(spaceStates.map((state) => state.isEligible)).toEqual([
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  expect(edgeStates.map((state) => state.isEligible)).toEqual([true, false]);
  expect(vertexStates.map((state) => state.isEligible)).toEqual([true, false]);
  expect(edgePositions).toHaveLength(2);
  expect(vertexPositions).toHaveLength(2);
  expect(edgePositions[0]?.midX).toBeGreaterThan(0);
  expect(vertexPositions[0]?.x).toBeGreaterThan(0);
});

test("SquareGrid target layers treat missing eligible set as all spaces eligible", () => {
  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={[]}
      showCoordinates={false}
      interactiveSpaces={{ selectTargetId: () => undefined }}
      renderCell={() => null}
      renderPiece={() => null}
    />,
  );

  expect(html).toContain('aria-label="Select space cell-0-0"');
  expect(html).toContain('aria-label="Select space cell-2-2"');
});

test("SquareGrid disables space targets when layer enabled is false", () => {
  const states: InteractiveTargetRenderState[] = [];
  const html = renderToString(
    <SquareGrid
      rows={3}
      cols={3}
      cells={squareCells}
      pieces={[]}
      edges={squareEdges}
      showCoordinates={false}
      interactiveSpaces={{
        enabled: false,
        eligible: new Set(["cell-0-0"]),
        selectTargetId: () => undefined,
      }}
      renderCell={() => null}
      renderPiece={() => null}
      renderInteractiveSpace={(_space, state) => {
        states.push(state);
        return <rect data-enabled={String(state.isEnabled)} />;
      }}
    />,
  );

  expect(html).not.toContain('role="button"');
  expect(/(?:tabIndex|tabindex)="0"/.test(html)).toBe(false);
  expect(html).not.toContain('aria-label="Select space cell-0-0"');
  expect(states.map((state) => state.isEnabled)).toEqual([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  expect(states.map((state) => state.isEligible)).toEqual([
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
});

test("HexGrid renderTile receives geometry context with size, orientation, and points", () => {
  const captured: Array<{ tileId: string; geometry: HexTileGeometry }> = [];

  renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={[]}
      vertices={[]}
      hexSize={40}
      enablePanZoom={false}
      renderTile={(tile, geometry) => {
        captured.push({ tileId: tile.id, geometry });
        return <polygon points={geometry.points()} />;
      }}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );

  expect(captured).toHaveLength(hexTiles.length);
  const center = captured.find((entry) => entry.tileId === "center");
  expect(center).toBeDefined();
  if (!center) throw new Error("missing center geometry");
  expect(center.geometry.size).toBe(40);
  expect(center.geometry.orientation).toBe("pointy-top");
  expect(center.geometry.center).toEqual({ x: 0, y: 0 });
  expect(center.geometry.position).toEqual({ x: 0, y: 0 });
  expect(center.geometry.points()).toBe(
    hexUtils.getHexPoints(0, 0, 40, "pointy-top"),
  );
  expect(center.geometry.points({ inset: 6 })).toBe(
    hexUtils.getHexPoints(0, 0, 34, "pointy-top"),
  );
  expect(center.geometry.corners()).toHaveLength(6);
  expect(center.geometry.bounds.width).toBeGreaterThan(0);
  expect(center.geometry.bounds.height).toBeGreaterThan(0);

  const east = captured.find((entry) => entry.tileId === "east");
  expect(east).toBeDefined();
  if (!east) throw new Error("missing east geometry");
  // `east` sits at axial (q=1, r=-1); its absolute board position should
  // not collapse to (0,0) like the centered tile.
  expect(east.geometry.position.x).not.toBe(0);
});

test("HexGrid renderTile remains assignable from zero-arg or one-arg callbacks", () => {
  const html = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={[]}
      vertices={[]}
      hexSize={40}
      enablePanZoom={false}
      renderTile={() => null}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );
  expect(html).toContain("hex-grid");

  const htmlOneArg = renderToString(
    <HexGrid
      tiles={hexTiles}
      edges={[]}
      vertices={[]}
      hexSize={40}
      enablePanZoom={false}
      renderTile={(tile) => <text>{tile.id}</text>}
      renderEdge={() => null}
      renderVertex={() => null}
    />,
  );
  expect(htmlOneArg).toContain("center");
});
