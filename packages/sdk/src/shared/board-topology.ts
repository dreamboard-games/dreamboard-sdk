import type { TilePlacement } from "./domain/tile-placement.js";
import { boardEdgeId, boardVertexId } from "./domain/board-element.js";
import type {
  GenericBoardTopology,
  HexBoardTopology,
  SquareBoardTopology,
  BoardRelation,
  BoardTopology,
  BoardEdge,
  BoardVertex,
  HexSpace,
  SquareSpace,
  TopologyFields,
} from "./board-topology-schema.js";
export type {
  BoardRelation,
  BoardTopology,
  BoardEdge,
  BoardVertex,
  BoardSpace,
  TileCellSpace,
  HexSpace,
  SquareSpace,
  GenericBoardTopology,
  HexBoardTopology,
  SquareBoardTopology,
  TiledBoardTopology,
  TopologyFields,
} from "./board-topology-schema.js";
import type { TopologyDefinitions } from "./domain/topology-definitions.js";
import { tileSpaceId } from "./domain/tile-space.js";
import { createHexTopology } from "./hex-board.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";
import { encodeCanonicalPluginRuntimeJson } from "./protocol/json.js";
import { parsePerPlayerInstanceId } from "./domain/per-player-instance.js";

/** A session stores identity and authored relation state, never derived geometry. */
export type BoardInstance = {
  readonly baseId: string;
  readonly relations: readonly BoardRelation[];
};
export type { TilePlacement } from "./domain/tile-placement.js";
export type TopologyTable = {
  readonly boards: Readonly<Record<string, BoardInstance>>;
  readonly tiles: Readonly<
    Record<string, { readonly id: string; readonly tileTypeId: string }>
  >;
  readonly componentLocations: Readonly<
    Record<string, TilePlacement | { readonly type: string }>
  >;
};

/** Expected rejection of an invalid current board graph, distinct from implementation failures. */
export class BoardTopologyError extends Error {
  override readonly name = "BoardTopologyError";
}

function coordinate(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(value) > MAXIMUM_BOARD_COORDINATE
  )
    throw new BoardTopologyError(
      `Board coordinate must be an integer within +/-${MAXIMUM_BOARD_COORDINATE}.`,
    );
  return value === 0 ? 0 : value;
}
/** Positive rotations follow axial side order (east, south-east, south-west). */
export function rotateHex(q: number, r: number, rotation: number) {
  coordinate(q);
  coordinate(r);
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 5)
    throw new BoardTopologyError(
      "Hex rotation must be an integer from 0 through 5.",
    );
  for (let step = 0; step < rotation; step++) [q, r] = [-r, q + r];
  return { q: coordinate(q), r: coordinate(r) };
}
/** Square sides are east, south, west, north; corners are south-east onward. */
export function rotateSquare(col: number, row: number, rotation: number) {
  coordinate(col);
  coordinate(row);
  if (!Number.isInteger(rotation) || rotation < 0 || rotation > 3)
    throw new BoardTopologyError(
      "Square rotation must be an integer from 0 through 3.",
    );
  for (let step = 0; step < rotation; step++) [col, row] = [-row, col];
  return { col: coordinate(col), row: coordinate(row) };
}
function immutable<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (item: unknown): void => {
    if (item && typeof item === "object") {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
  };
  freeze(copy);
  return copy;
}
type Annotation = {
  readonly typeId?: string;
  readonly label?: string;
  readonly fields: TopologyFields;
};
function annotate<T extends BoardEdge | BoardVertex>(
  element: T,
  annotation: Annotation,
): T {
  const merge = (key: "typeId" | "label") => {
    const before = element[key];
    const after = annotation[key];
    if (before !== undefined && after !== undefined && before !== after)
      throw new BoardTopologyError(
        `Conflicting ${key} metadata on '${element.id}'.`,
      );
    return after ?? before;
  };
  const fields = { ...element.fields };
  for (const [key, value] of Object.entries(annotation.fields)) {
    if (
      Object.hasOwn(fields, key) &&
      encodeCanonicalPluginRuntimeJson(fields[key]) !==
        encodeCanonicalPluginRuntimeJson(value)
    )
      throw new BoardTopologyError(
        `Conflicting field '${key}' metadata on '${element.id}'.`,
      );
    Object.defineProperty(fields, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return { ...element, typeId: merge("typeId"), label: merge("label"), fields };
}

/** Derive one board from admitted definitions and the current authoritative placements. */
export function deriveBoardTopology(
  table: TopologyTable,
  definitions: TopologyDefinitions,
  boardId: string,
): BoardTopology {
  if (!Object.hasOwn(table.boards, boardId))
    throw new BoardTopologyError(`Unknown board '${boardId}'.`);
  const instance = table.boards[boardId];
  if (!Object.hasOwn(definitions.boardDefinitions, instance.baseId))
    throw new BoardTopologyError(
      `Unknown board definition '${instance.baseId}'.`,
    );
  const definition = definitions.boardDefinitions[instance.baseId];
  const playerId =
    definition.scope === "perPlayer"
      ? parsePerPlayerInstanceId(boardId)?.playerId
      : undefined;
  const base = {
    id: boardId,
    baseId: instance.baseId,
    name: definition.name,
    scope: definition.scope,
    ...(playerId === undefined ? {} : { playerId }),
    typeId: definition.typeId,
    fields: definition.fields,
    relations: instance.relations,
  };
  if (definition.layout === "generic") {
    for (const tileId of Object.keys(table.tiles)) {
      const location = table.componentLocations[tileId];
      if (
        location?.type === "OnBoard" &&
        "boardId" in location &&
        location.boardId === boardId
      )
        throw new BoardTopologyError(
          `Tile '${tileId}' cannot be placed on generic board '${boardId}'.`,
        );
    }
    const result: GenericBoardTopology = {
      ...base,
      layout: "generic",
      spaces: definition.spaces,
    };
    validateRelations(result);
    return immutable(result);
  }
  const hexSpaces: Record<string, HexSpace> = {};
  const squareSpaces: Record<string, SquareSpace> = {};
  const occupied = new Map<string, string>();
  const placed: {
    tileId: string;
    definition: TopologyDefinitions["tileDefinitions"][string];
    placement: TilePlacement;
  }[] = [];
  for (const [tileId, tile] of Object.entries(table.tiles).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const location = table.componentLocations[tileId];
    if (
      location?.type !== "OnBoard" ||
      !("boardId" in location) ||
      location.boardId !== boardId
    )
      continue;
    if (!Object.hasOwn(definitions.tileDefinitions, tile.tileTypeId))
      throw new BoardTopologyError(`Unknown tile type '${tile.tileTypeId}'.`);
    const tileDefinition = definitions.tileDefinitions[tile.tileTypeId];
    if (
      !("layout" in location) ||
      location.layout !== definition.layout ||
      tileDefinition.layout !== definition.layout
    )
      throw new BoardTopologyError(
        `Tile '${tileId}' layout does not match board '${boardId}'.`,
      );
    // The placement discriminator was admitted by the runtime schema; validate its numbers below too.
    const placement = location;
    placed.push({ tileId, definition: tileDefinition, placement });
    if (tileDefinition.layout === "hex" && placement.layout === "hex") {
      coordinate(placement.q);
      coordinate(placement.r);
      for (const cell of tileDefinition.cells) {
        const rotated = rotateHex(cell.at.q, cell.at.r, placement.rotation);
        const q = coordinate(rotated.q + placement.q),
          r = coordinate(rotated.r + placement.r);
        const key = `${q},${r}`;
        if (occupied.has(key))
          throw new BoardTopologyError(
            `Overlapping tile cells from tiles '${occupied.get(key)}' and '${tileId}' on board '${boardId}' at ${key}.`,
          );
        occupied.set(key, tileId);
        const id = tileSpaceId(tileId, cell.id);
        hexSpaces[id] = {
          id,
          tileId,
          localCellId: cell.id,
          q,
          r,
          name: cell.name,
          typeId: cell.typeId,
          fields: cell.fields,
        };
      }
    } else if (
      tileDefinition.layout === "square" &&
      placement.layout === "square"
    ) {
      coordinate(placement.col);
      coordinate(placement.row);
      for (const cell of tileDefinition.cells) {
        const rotated = rotateSquare(
          cell.at.col,
          cell.at.row,
          placement.rotation,
        );
        const col = coordinate(rotated.col + placement.col),
          row = coordinate(rotated.row + placement.row);
        const key = `${col},${row}`;
        if (occupied.has(key))
          throw new BoardTopologyError(
            `Overlapping tile cells from tiles '${occupied.get(key)}' and '${tileId}' on board '${boardId}' at ${key}.`,
          );
        occupied.set(key, tileId);
        const id = tileSpaceId(tileId, cell.id);
        squareSpaces[id] = {
          id,
          tileId,
          localCellId: cell.id,
          col,
          row,
          name: cell.name,
          typeId: cell.typeId,
          fields: cell.fields,
        };
      }
    }
  }
  if (definition.layout === "hex") {
    const lattice = createHexTopology({
      id: boardId,
      orientation: definition.orientation,
      spaces: Object.values(hexSpaces),
    });
    const edges = new Map<string, BoardEdge>(
      lattice.edges.map((edge) => [edge.id, { ...edge, fields: {} }]),
    );
    const vertices = new Map<string, BoardVertex>(
      lattice.vertices.map((vertex) => [vertex.id, { ...vertex, fields: {} }]),
    );
    for (const tile of placed) {
      if (tile.definition.layout !== "hex" || tile.placement.layout !== "hex")
        continue;
      for (const annotation of tile.definition.edges) {
        const id = lattice.edgeAt(
          tileSpaceId(tile.tileId, annotation.cellId),
          hexSide(annotation.side + tile.placement.rotation),
        );
        edges.set(id, annotate(edges.get(id)!, annotation));
      }
      for (const annotation of tile.definition.vertices) {
        const id = lattice.vertexAt(
          tileSpaceId(tile.tileId, annotation.cellId),
          hexSide(annotation.corner + tile.placement.rotation),
        );
        vertices.set(id, annotate(vertices.get(id)!, annotation));
      }
    }
    const result: HexBoardTopology = {
      ...base,
      layout: "hex",
      orientation: definition.orientation,
      spaces: hexSpaces,
      edges: [...edges.values()].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
      ),
      vertices: [...vertices.values()].sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
      ),
    };
    validateRelations(result);
    return immutable(result);
  }
  const lattice = squareLattice(boardId, Object.values(squareSpaces));
  for (const tile of placed) {
    if (
      tile.definition.layout !== "square" ||
      tile.placement.layout !== "square"
    )
      continue;
    for (const annotation of tile.definition.edges) {
      const id = lattice.edgeAt(
        squareSpaces[tileSpaceId(tile.tileId, annotation.cellId)],
        (annotation.side + tile.placement.rotation) % 4,
      );
      lattice.edges.set(id, annotate(lattice.edges.get(id)!, annotation));
    }
    for (const annotation of tile.definition.vertices) {
      const id = lattice.vertexAt(
        squareSpaces[tileSpaceId(tile.tileId, annotation.cellId)],
        (annotation.corner + tile.placement.rotation) % 4,
      );
      lattice.vertices.set(id, annotate(lattice.vertices.get(id)!, annotation));
    }
  }
  const result: SquareBoardTopology = {
    ...base,
    layout: "square",
    spaces: squareSpaces,
    edges: [...lattice.edges.values()].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
    vertices: [...lattice.vertices.values()].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
  };
  validateRelations(result);
  return immutable(result);
}
function hexSide(value: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const side = value % 6;
  switch (side) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return side;
    default:
      throw new BoardTopologyError("Invalid hex side.");
  }
}
function validateRelations(board: BoardTopology): void {
  const identities = new Set<string>();
  for (const relation of board.relations) {
    if (typeof relation.id !== "string" || relation.id.length === 0)
      throw new BoardTopologyError(
        `Relation identity must be nonempty on board '${board.id}'.`,
      );
    if (identities.has(relation.id))
      throw new BoardTopologyError(
        `Duplicate relation identity '${relation.id}' on board '${board.id}'.`,
      );
    identities.add(relation.id);
    if (
      !Object.hasOwn(board.spaces, relation.fromSpaceId) ||
      !Object.hasOwn(board.spaces, relation.toSpaceId)
    )
      throw new BoardTopologyError(
        `Relation on board '${board.id}' references an absent space.`,
      );
  }
}

function squareLattice(boardId: string, spaces: readonly SquareSpace[]) {
  const edges = new Map<string, BoardEdge>();
  const vertices = new Map<string, BoardVertex>();
  const corners = [
    [1, 1],
    [0, 1],
    [0, 0],
    [1, 0],
  ] as const;
  const vertexAt = (space: SquareSpace, corner: number) => {
    const offset = corners[corner];
    if (!space || !offset)
      throw new BoardTopologyError("Unknown square cell or corner.");
    return boardVertexId(
      "square",
      boardId,
      `${space.col + offset[0]},${space.row + offset[1]}`,
    );
  };
  const edgeAt = (space: SquareSpace, side: number) => {
    if (!space || !Number.isInteger(side) || side < 0 || side > 3)
      throw new BoardTopologyError("Unknown square cell or side.");
    switch (side) {
      case 0:
        return boardEdgeId(
          "square",
          boardId,
          `${space.col + 1},${space.row}:v`,
        );
      case 1:
        return boardEdgeId(
          "square",
          boardId,
          `${space.col},${space.row + 1}:h`,
        );
      case 2:
        return boardEdgeId("square", boardId, `${space.col},${space.row}:v`);
      default:
        return boardEdgeId("square", boardId, `${space.col},${space.row}:h`);
    }
  };
  for (const space of spaces) {
    for (let side = 0; side < 4; side++) {
      const id = edgeAt(space, side);
      const vertexIds: [
        ReturnType<typeof boardVertexId>,
        ReturnType<typeof boardVertexId>,
      ] = [vertexAt(space, (side + 3) % 4), vertexAt(space, side)];
      const before = edges.get(id);
      edges.set(id, {
        id,
        spaceIds: [...(before?.spaceIds ?? []), space.id].sort(),
        vertexIds: vertexIds.sort(),
        fields: {},
      });
      for (const vertexId of vertexIds) {
        const vertex = vertices.get(vertexId);
        vertices.set(vertexId, {
          id: vertexId,
          spaceIds: [
            ...new Set([...(vertex?.spaceIds ?? []), space.id]),
          ].sort(),
          edgeIds: [...new Set([...(vertex?.edgeIds ?? []), id])].sort(),
          fields: {},
        });
      }
    }
  }
  return { edges, vertices, edgeAt, vertexAt };
}

/** A bounded content cache also shares geometry across cloned and restored tables. */
export function createBoardTopologyCache() {
  const entries = new Map<string, { key: string; topology: BoardTopology }>();
  return (
    table: TopologyTable,
    definitions: TopologyDefinitions,
    boardId: string,
  ): BoardTopology => {
    if (!Object.hasOwn(table.boards, boardId))
      throw new BoardTopologyError(`Unknown board '${boardId}'.`);
    const instance = table.boards[boardId];
    const placements = Object.entries(table.tiles)
      .flatMap(([id, tile]) => {
        const location = table.componentLocations[id];
        return location?.type === "OnBoard" &&
          "boardId" in location &&
          location.boardId === boardId
          ? [
              {
                id,
                tileTypeId: tile.tileTypeId,
                location,
                definition: definitions.tileDefinitions[tile.tileTypeId],
              },
            ]
          : [];
      })
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const key = encodeCanonicalPluginRuntimeJson({
      instance,
      definition: definitions.boardDefinitions[instance.baseId],
      placements,
    });
    const previous = entries.get(boardId);
    if (previous?.key === key) return previous.topology;
    const topology = deriveBoardTopology(table, definitions, boardId);
    if (!entries.has(boardId) && entries.size >= 64)
      entries.delete(entries.keys().next().value!);
    entries.set(boardId, { key, topology });
    return topology;
  };
}
