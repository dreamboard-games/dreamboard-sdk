import type {
  BoardId,
  EdgeTypeId,
  PlayerId,
  SpaceTypeId,
  VertexTypeId,
} from "./player-state.js";
import type {
  HexBoardState,
  HexEdgeState,
  HexTileState,
  HexVertexState,
  SquareBoardState,
  SquareCellState,
  SquareEdgeState,
  SquarePieceState,
  SquareVertexState,
} from "./player-state.js";

type RuntimeFields = Record<string, unknown>;

type NormalizeOptional<T> = Exclude<T, null | undefined> | undefined;

export interface GeneratedTiledEdgeStateLike<
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  Fields = RuntimeFields,
> {
  id: EdgeIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: EdgeTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields?: Fields;
}

export interface GeneratedTiledVertexStateLike<
  SpaceIdValue extends string = string,
  VertexIdValue extends string = string,
  Fields = RuntimeFields,
> {
  id: VertexIdValue;
  spaceIds: readonly SpaceIdValue[];
  typeId?: VertexTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields?: Fields;
}

export interface GeneratedHexSpaceStateLike<
  SpaceIdValue extends string = string,
  Fields = RuntimeFields,
> {
  id: SpaceIdValue;
  q: number;
  r: number;
  typeId?: SpaceTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields?: Fields;
}

export interface GeneratedSquareSpaceStateLike<
  SpaceIdValue extends string = string,
  Fields = RuntimeFields,
> {
  id: SpaceIdValue;
  row: number;
  col: number;
  typeId?: SpaceTypeId | null;
  label?: string | null;
  ownerId?: PlayerId | null;
  fields?: Fields;
}

export interface GeneratedHexBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
> {
  id: BoardIdValue;
  layout?: "hex";
  orientation?: "pointy-top" | "flat-top";
  spaces: Readonly<
    Record<SpaceIdValue, GeneratedHexSpaceStateLike<SpaceIdValue, SpaceFields>>
  >;
  edges: ReadonlyArray<
    | HexEdgeState<BoardIdValue, SpaceIdValue, EdgeIdValue, EdgeFields>
    | GeneratedTiledEdgeStateLike<SpaceIdValue, EdgeIdValue, EdgeFields>
  >;
  vertices: ReadonlyArray<
    | HexVertexState<BoardIdValue, SpaceIdValue, VertexIdValue, VertexFields>
    | GeneratedTiledVertexStateLike<SpaceIdValue, VertexIdValue, VertexFields>
  >;
}

export interface AuthoredHexBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
  SpaceView = unknown,
> {
  id: BoardIdValue;
  layout?: "hex";
  orientation?: "pointy-top" | "flat-top";
  tiles: ReadonlyArray<
    HexTileState<BoardIdValue, SpaceIdValue, SpaceFields, SpaceView>
  >;
  edges: ReadonlyArray<
    | HexEdgeState<BoardIdValue, SpaceIdValue, EdgeIdValue, EdgeFields>
    | GeneratedTiledEdgeStateLike<SpaceIdValue, EdgeIdValue, EdgeFields>
  >;
  vertices: ReadonlyArray<
    | HexVertexState<BoardIdValue, SpaceIdValue, VertexIdValue, VertexFields>
    | GeneratedTiledVertexStateLike<SpaceIdValue, VertexIdValue, VertexFields>
  >;
}

export type HexBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
> =
  | AuthoredHexBoardInput<
      BoardIdValue,
      SpaceIdValue,
      EdgeIdValue,
      VertexIdValue,
      SpaceFields,
      EdgeFields,
      VertexFields
    >
  | GeneratedHexBoardInput<
      BoardIdValue,
      SpaceIdValue,
      EdgeIdValue,
      VertexIdValue,
      SpaceFields,
      EdgeFields,
      VertexFields
    >;

export interface GeneratedSquareBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  PieceIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
  PieceFields = RuntimeFields,
> {
  id: BoardIdValue;
  layout?: "square";
  spaces: Readonly<
    Record<
      SpaceIdValue,
      GeneratedSquareSpaceStateLike<SpaceIdValue, SpaceFields>
    >
  >;
  edges: ReadonlyArray<
    | SquareEdgeState<SpaceIdValue, EdgeIdValue, EdgeFields>
    | GeneratedTiledEdgeStateLike<SpaceIdValue, EdgeIdValue, EdgeFields>
  >;
  vertices: ReadonlyArray<
    | SquareVertexState<SpaceIdValue, VertexIdValue, VertexFields>
    | GeneratedTiledVertexStateLike<SpaceIdValue, VertexIdValue, VertexFields>
  >;
  pieces?: ReadonlyArray<SquarePieceState<PieceIdValue, PieceFields>>;
}

export interface AuthoredSquareBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  PieceIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
  PieceFields = RuntimeFields,
> {
  id: BoardIdValue;
  layout?: "square";
  rows: number;
  cols: number;
  cells: ReadonlyArray<SquareCellState<SpaceIdValue, SpaceFields>>;
  edges: ReadonlyArray<
    | SquareEdgeState<SpaceIdValue, EdgeIdValue, EdgeFields>
    | GeneratedTiledEdgeStateLike<SpaceIdValue, EdgeIdValue, EdgeFields>
  >;
  vertices: ReadonlyArray<
    | SquareVertexState<SpaceIdValue, VertexIdValue, VertexFields>
    | GeneratedTiledVertexStateLike<SpaceIdValue, VertexIdValue, VertexFields>
  >;
  pieces: ReadonlyArray<SquarePieceState<PieceIdValue, PieceFields>>;
}

export type SquareBoardInput<
  BoardIdValue extends string = BoardId,
  SpaceIdValue extends string = string,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  PieceIdValue extends string = string,
  SpaceFields = RuntimeFields,
  EdgeFields = RuntimeFields,
  VertexFields = RuntimeFields,
  PieceFields = RuntimeFields,
> =
  | AuthoredSquareBoardInput<
      BoardIdValue,
      SpaceIdValue,
      EdgeIdValue,
      VertexIdValue,
      PieceIdValue,
      SpaceFields,
      EdgeFields,
      VertexFields,
      PieceFields
    >
  | GeneratedSquareBoardInput<
      BoardIdValue,
      SpaceIdValue,
      EdgeIdValue,
      VertexIdValue,
      PieceIdValue,
      SpaceFields,
      EdgeFields,
      VertexFields,
      PieceFields
    >;

export type AnyHexBoardInput = HexBoardInput<
  string,
  string,
  string,
  string,
  RuntimeFields,
  RuntimeFields,
  RuntimeFields
>;
export type AnySquareBoardInput = SquareBoardInput<
  string,
  string,
  string,
  string,
  string,
  RuntimeFields,
  RuntimeFields,
  RuntimeFields,
  RuntimeFields
>;

export type BoardIdOf<TBoard> = TBoard extends { id: infer Id extends string }
  ? Id
  : string;

type SpaceRecordValueOf<TBoard> = TBoard extends {
  spaces: Readonly<Record<string, infer Space>>;
}
  ? Space
  : never;
type TileValueOf<TBoard> = TBoard extends { tiles: ReadonlyArray<infer Tile> }
  ? Tile
  : never;
type CellValueOf<TBoard> = TBoard extends { cells: ReadonlyArray<infer Cell> }
  ? Cell
  : never;
type EdgeValueOf<TBoard> = TBoard extends { edges: ReadonlyArray<infer Edge> }
  ? Edge
  : never;
type VertexValueOf<TBoard> = TBoard extends {
  vertices: ReadonlyArray<infer Vertex>;
}
  ? Vertex
  : never;
type PieceValueOf<TBoard> = TBoard extends {
  pieces?: ReadonlyArray<infer Piece>;
}
  ? Piece
  : never;

export type BoardSpaceIdOf<TBoard> =
  SpaceRecordValueOf<TBoard> extends { id: infer Id extends string }
    ? Id
    : TileValueOf<TBoard> extends { id: infer Id extends string }
      ? Id
      : CellValueOf<TBoard> extends { id: infer Id extends string }
        ? Id
        : never;

export type BoardEdgeIdOf<TBoard> =
  EdgeValueOf<TBoard> extends {
    id: infer Id extends string;
  }
    ? Id
    : never;

export type BoardVertexIdOf<TBoard> =
  VertexValueOf<TBoard> extends {
    id: infer Id extends string;
  }
    ? Id
    : never;

type HexTilePropertiesOf<TBoard> =
  SpaceRecordValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : TileValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type HexTileViewOf<TBoard> =
  TileValueOf<TBoard> extends { view: infer View }
    ? View
    : TileValueOf<TBoard> extends { view?: infer View }
      ? View | undefined
      : unknown;

type HexEdgePropertiesOf<TBoard> =
  EdgeValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : EdgeValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type HexVertexPropertiesOf<TBoard> =
  VertexValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : VertexValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type SquareCellPropertiesOf<TBoard> =
  SpaceRecordValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : CellValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type SquareEdgePropertiesOf<TBoard> =
  EdgeValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : EdgeValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type SquareVertexPropertiesOf<TBoard> =
  VertexValueOf<TBoard> extends { fields?: infer Fields }
    ? Fields
    : VertexValueOf<TBoard> extends { properties?: infer Properties }
      ? Properties
      : RuntimeFields;

type SquarePiecePropertiesOf<TBoard> =
  PieceValueOf<TBoard> extends {
    properties?: infer Properties;
  }
    ? Properties
    : RuntimeFields;

/**
 * Normalized hex tile shape for a given board input.
 *
 * `view` is always present (required) on the result so consumers can
 * read overlay fields without a null-check. For boards that do not
 * statically declare a `view` shape (the generic case), `view` falls
 * back to `unknown`, which still admits any value.
 *
 * The runtime normalizer injects `view: undefined` for inputs that
 * do not author a `view` field, keeping the runtime contract aligned
 * with this static shape.
 */
export type NormalizedHexTileOf<TBoard extends AnyHexBoardInput> = Omit<
  HexTileState<
    BoardIdOf<TBoard>,
    BoardSpaceIdOf<TBoard>,
    HexTilePropertiesOf<TBoard>,
    HexTileViewOf<TBoard>
  >,
  "view"
> & { view: HexTileViewOf<TBoard> };

export type NormalizedHexEdgeOf<TBoard extends AnyHexBoardInput> = HexEdgeState<
  BoardIdOf<TBoard>,
  BoardSpaceIdOf<TBoard>,
  BoardEdgeIdOf<TBoard>,
  HexEdgePropertiesOf<TBoard>
>;

export type NormalizedHexVertexOf<TBoard extends AnyHexBoardInput> =
  HexVertexState<
    BoardIdOf<TBoard>,
    BoardSpaceIdOf<TBoard>,
    BoardVertexIdOf<TBoard>,
    HexVertexPropertiesOf<TBoard>
  >;

export type NormalizedSquareCellOf<TBoard extends AnySquareBoardInput> =
  SquareCellState<BoardSpaceIdOf<TBoard>, SquareCellPropertiesOf<TBoard>>;

export type NormalizedSquareEdgeOf<TBoard extends AnySquareBoardInput> =
  SquareEdgeState<
    BoardSpaceIdOf<TBoard>,
    BoardEdgeIdOf<TBoard>,
    SquareEdgePropertiesOf<TBoard>
  >;

export type NormalizedSquareVertexOf<TBoard extends AnySquareBoardInput> =
  SquareVertexState<
    BoardSpaceIdOf<TBoard>,
    BoardVertexIdOf<TBoard>,
    SquareVertexPropertiesOf<TBoard>
  >;

export type NormalizedSquarePieceOf<TBoard extends AnySquareBoardInput> =
  SquarePieceState<
    PieceValueOf<TBoard> extends { id: infer PieceIdValue extends string }
      ? PieceIdValue
      : string,
    SquarePiecePropertiesOf<TBoard>
  >;

export type NormalizedHexBoard<TBoard extends AnyHexBoardInput> = Omit<
  Pick<
    HexBoardState<
      BoardIdOf<TBoard>,
      BoardSpaceIdOf<TBoard>,
      BoardEdgeIdOf<TBoard>,
      BoardVertexIdOf<TBoard>,
      HexTilePropertiesOf<TBoard>,
      HexEdgePropertiesOf<TBoard>,
      HexVertexPropertiesOf<TBoard>
    >,
    "id" | "tiles" | "edges" | "vertices"
  >,
  "tiles"
> & {
  tiles: ReadonlyArray<NormalizedHexTileOf<TBoard>>;
  orientation?: "pointy-top" | "flat-top";
};

export type NormalizedSquareBoard<TBoard extends AnySquareBoardInput> = Pick<
  SquareBoardState<
    BoardIdOf<TBoard>,
    BoardSpaceIdOf<TBoard>,
    BoardEdgeIdOf<TBoard>,
    BoardVertexIdOf<TBoard>,
    PieceValueOf<TBoard> extends { id: infer PieceIdValue extends string }
      ? PieceIdValue
      : string,
    SquareCellPropertiesOf<TBoard>,
    SquareEdgePropertiesOf<TBoard>,
    SquareVertexPropertiesOf<TBoard>,
    SquarePiecePropertiesOf<TBoard>
  >,
  "id" | "rows" | "cols" | "cells" | "edges" | "vertices" | "pieces"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstValue(record: Readonly<Record<string, unknown>>): unknown {
  const [first] = Object.values(record);
  return first;
}

function normalizeOptional<T>(
  value: T | null | undefined,
): NormalizeOptional<T> {
  return (value ?? undefined) as NormalizeOptional<T>;
}

export function isGeneratedHexBoardInput<
  TBoard extends AnyHexBoardInput | AnySquareBoardInput,
>(
  board: TBoard,
): board is Extract<TBoard, { spaces: Readonly<Record<string, unknown>> }> {
  if (!isRecord(board) || !("spaces" in board) || !isRecord(board.spaces)) {
    return false;
  }
  if ("tiles" in board || "cells" in board) {
    return false;
  }
  if (board.layout === "hex") {
    return true;
  }
  const firstSpace = firstValue(
    board.spaces as Readonly<Record<string, unknown>>,
  );
  return (
    isRecord(firstSpace) &&
    typeof firstSpace.q === "number" &&
    typeof firstSpace.r === "number"
  );
}

export function isGeneratedSquareBoardInput<
  TBoard extends AnyHexBoardInput | AnySquareBoardInput,
>(
  board: TBoard,
): board is Extract<TBoard, { spaces: Readonly<Record<string, unknown>> }> {
  if (!isRecord(board) || !("spaces" in board) || !isRecord(board.spaces)) {
    return false;
  }
  if ("tiles" in board || "cells" in board) {
    return false;
  }
  if (board.layout === "square") {
    return true;
  }
  const firstSpace = firstValue(
    board.spaces as Readonly<Record<string, unknown>>,
  );
  return (
    isRecord(firstSpace) &&
    typeof firstSpace.row === "number" &&
    typeof firstSpace.col === "number"
  );
}

function normalizeHexTile<TBoard extends AnyHexBoardInput>(
  tile: SpaceRecordValueOf<TBoard>,
): NormalizedHexTileOf<TBoard> {
  return {
    id: tile.id as BoardSpaceIdOf<TBoard>,
    q: tile.q as number,
    r: tile.r as number,
    typeId: normalizeOptional(tile.typeId as SpaceTypeId | null | undefined),
    label: normalizeOptional(tile.label as string | null | undefined),
    owner: normalizeOptional(tile.ownerId as PlayerId | null | undefined),
    properties: (tile.fields ?? undefined) as HexTilePropertiesOf<TBoard>,
    view: undefined,
  } as unknown as NormalizedHexTileOf<TBoard>;
}

function normalizeHexEdge<TBoard extends AnyHexBoardInput>(
  edge: EdgeValueOf<TBoard>,
): NormalizedHexEdgeOf<TBoard> {
  if ("hex1" in edge && "hex2" in edge) {
    return {
      ...edge,
      label: normalizeOptional(edge.label),
      owner: normalizeOptional(edge.owner),
      typeId: normalizeOptional(edge.typeId),
      properties: edge.properties,
    } as NormalizedHexEdgeOf<TBoard>;
  }

  const [hex1 = "", hex2 = ""] = edge.spaceIds;
  return {
    id: edge.id as BoardEdgeIdOf<TBoard>,
    hex1: hex1 as BoardSpaceIdOf<TBoard>,
    hex2: hex2 as BoardSpaceIdOf<TBoard>,
    typeId: normalizeOptional(edge.typeId),
    label: normalizeOptional(edge.label),
    owner: normalizeOptional(edge.ownerId),
    properties: (edge.fields ?? undefined) as HexEdgePropertiesOf<TBoard>,
  };
}

function normalizeHexVertex<TBoard extends AnyHexBoardInput>(
  vertex: VertexValueOf<TBoard>,
): NormalizedHexVertexOf<TBoard> {
  if ("hexes" in vertex) {
    return {
      ...vertex,
      label: normalizeOptional(vertex.label),
      owner: normalizeOptional(vertex.owner),
      typeId: normalizeOptional(vertex.typeId),
      properties: vertex.properties,
    } as NormalizedHexVertexOf<TBoard>;
  }

  return {
    id: vertex.id as BoardVertexIdOf<TBoard>,
    hexes: vertex.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>,
    typeId: normalizeOptional(vertex.typeId),
    label: normalizeOptional(vertex.label),
    owner: normalizeOptional(vertex.ownerId),
    properties: (vertex.fields ?? undefined) as HexVertexPropertiesOf<TBoard>,
  };
}

function normalizeSquareCell<TBoard extends AnySquareBoardInput>(
  cell: SpaceRecordValueOf<TBoard>,
): NormalizedSquareCellOf<TBoard> {
  return {
    id: cell.id as BoardSpaceIdOf<TBoard>,
    row: cell.row as number,
    col: cell.col as number,
    typeId: normalizeOptional(cell.typeId as SpaceTypeId | null | undefined),
    label: normalizeOptional(cell.label as string | null | undefined),
    owner: normalizeOptional(cell.ownerId as PlayerId | null | undefined),
    properties: (cell.fields ?? undefined) as SquareCellPropertiesOf<TBoard>,
  };
}

function normalizeSquareEdge<TBoard extends AnySquareBoardInput>(
  edge: EdgeValueOf<TBoard>,
): NormalizedSquareEdgeOf<TBoard> {
  if ("ownerId" in edge || "fields" in edge) {
    return {
      id: edge.id as BoardEdgeIdOf<TBoard>,
      spaceIds: edge.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>,
      typeId: normalizeOptional(edge.typeId),
      label: normalizeOptional(edge.label),
      owner: normalizeOptional(edge.ownerId),
      properties: (edge.fields ?? undefined) as SquareEdgePropertiesOf<TBoard>,
    };
  }

  return {
    id: edge.id as BoardEdgeIdOf<TBoard>,
    spaceIds: edge.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>,
    typeId: normalizeOptional(edge.typeId),
    label: normalizeOptional(edge.label),
    owner: normalizeOptional(
      (edge as SquareEdgeState<string, string, RuntimeFields>).owner,
    ),
    properties: (edge as SquareEdgeState<string, string, RuntimeFields>)
      .properties as SquareEdgePropertiesOf<TBoard>,
  };
}

function normalizeSquareVertex<TBoard extends AnySquareBoardInput>(
  vertex: VertexValueOf<TBoard>,
): NormalizedSquareVertexOf<TBoard> {
  if ("ownerId" in vertex || "fields" in vertex) {
    return {
      id: vertex.id as BoardVertexIdOf<TBoard>,
      spaceIds: vertex.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>,
      typeId: normalizeOptional(vertex.typeId),
      label: normalizeOptional(vertex.label),
      owner: normalizeOptional(vertex.ownerId),
      properties: (vertex.fields ??
        undefined) as SquareVertexPropertiesOf<TBoard>,
    };
  }

  return {
    id: vertex.id as BoardVertexIdOf<TBoard>,
    spaceIds: vertex.spaceIds as ReadonlyArray<BoardSpaceIdOf<TBoard>>,
    typeId: normalizeOptional(vertex.typeId),
    label: normalizeOptional(vertex.label),
    owner: normalizeOptional(
      (vertex as SquareVertexState<string, string, RuntimeFields>).owner,
    ),
    properties: (vertex as SquareVertexState<string, string, RuntimeFields>)
      .properties as SquareVertexPropertiesOf<TBoard>,
  };
}

function isAuthoredHexBoardInput(
  board: AnyHexBoardInput,
): board is Extract<AnyHexBoardInput, { tiles: readonly unknown[] }> {
  return "tiles" in board;
}

function isAuthoredSquareBoardInput(
  board: AnySquareBoardInput,
): board is Extract<AnySquareBoardInput, { cells: readonly unknown[] }> {
  return "cells" in board;
}

export function normalizeHexBoardInput<TBoard extends AnyHexBoardInput>(
  board: TBoard,
): NormalizedHexBoard<TBoard> {
  if (isGeneratedHexBoardInput(board)) {
    return {
      id: board.id,
      orientation: board.orientation,
      tiles: Object.values(board.spaces).map((tile) =>
        normalizeHexTile<TBoard>(tile as SpaceRecordValueOf<TBoard>),
      ),
      edges: board.edges.map((edge) =>
        normalizeHexEdge<TBoard>(edge as EdgeValueOf<TBoard>),
      ),
      vertices: board.vertices.map((vertex) =>
        normalizeHexVertex<TBoard>(vertex as VertexValueOf<TBoard>),
      ),
    } as unknown as NormalizedHexBoard<TBoard>;
  }

  if (!isAuthoredHexBoardInput(board)) {
    throw new Error("Expected authored hex board input.");
  }
  const authoredBoard = board as Extract<TBoard, { tiles: readonly unknown[] }>;
  return {
    id: authoredBoard.id,
    orientation: authoredBoard.orientation,
    tiles: authoredBoard.tiles.map((tile) => ({
      ...tile,
      label: normalizeOptional(tile.label),
      owner: normalizeOptional(tile.owner),
      typeId: normalizeOptional(tile.typeId),
      properties: tile.properties,
      view: tile.view,
    })),
    edges: authoredBoard.edges.map((edge) =>
      normalizeHexEdge<TBoard>(edge as EdgeValueOf<TBoard>),
    ),
    vertices: authoredBoard.vertices.map((vertex) =>
      normalizeHexVertex<TBoard>(vertex as VertexValueOf<TBoard>),
    ),
  } as unknown as NormalizedHexBoard<TBoard>;
}

export function normalizeSquareBoardInput<TBoard extends AnySquareBoardInput>(
  board: TBoard,
): NormalizedSquareBoard<TBoard> {
  if (isGeneratedSquareBoardInput(board)) {
    const cells = Object.values(board.spaces).map((cell) =>
      normalizeSquareCell<TBoard>(cell as SpaceRecordValueOf<TBoard>),
    );
    const rows =
      cells.length === 0 ? 0 : Math.max(...cells.map((cell) => cell.row)) + 1;
    const cols =
      cells.length === 0 ? 0 : Math.max(...cells.map((cell) => cell.col)) + 1;

    return {
      id: board.id,
      rows,
      cols,
      cells,
      edges: board.edges.map((edge) =>
        normalizeSquareEdge<TBoard>(edge as EdgeValueOf<TBoard>),
      ),
      vertices: board.vertices.map((vertex) =>
        normalizeSquareVertex<TBoard>(vertex as VertexValueOf<TBoard>),
      ),
      pieces: (
        (board.pieces ?? []) as ReadonlyArray<NormalizedSquarePieceOf<TBoard>>
      ).map((piece) => ({
        ...piece,
        owner: normalizeOptional(piece.owner),
        typeId: piece.typeId,
        properties: piece.properties,
      })),
    } as unknown as NormalizedSquareBoard<TBoard>;
  }

  if (!isAuthoredSquareBoardInput(board)) {
    throw new Error("Expected authored square board input.");
  }
  const authoredBoard = board as Extract<TBoard, { cells: readonly unknown[] }>;
  return {
    id: authoredBoard.id,
    rows: authoredBoard.rows,
    cols: authoredBoard.cols,
    cells: authoredBoard.cells.map((cell) => ({
      ...cell,
      label: normalizeOptional(cell.label),
      owner: normalizeOptional(cell.owner),
      typeId: normalizeOptional(cell.typeId),
      properties: cell.properties,
    })),
    edges: authoredBoard.edges.map((edge) =>
      normalizeSquareEdge<TBoard>(edge as EdgeValueOf<TBoard>),
    ),
    vertices: authoredBoard.vertices.map((vertex) =>
      normalizeSquareVertex<TBoard>(vertex as VertexValueOf<TBoard>),
    ),
    pieces: (authoredBoard.pieces ?? []).map((piece) => ({
      ...piece,
      owner: normalizeOptional(piece.owner),
      typeId: piece.typeId,
      properties: piece.properties,
    })),
  } as unknown as NormalizedSquareBoard<TBoard>;
}
