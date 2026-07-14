import type { ViewCard } from "@dreamboard-games/sdk-types";
import type { HexColor } from "./hex-color.js";

export type PlayerId = string;
export type CardId = string;
export type DeckId = string;
export type BoardBaseId = string;
export type BoardId = string;
export type PieceId = string;
export type SpaceId = string;
export type DieId = string;
export type EdgeTypeId = string;
export type VertexTypeId = string;
export type PieceTypeId = string;
export type SpaceTypeId = string;
export type CardProperties = Record<string, unknown>;
export type CardIdsByDeckId = Record<DeckId, readonly CardId[]>;

export interface PerPlayer<Value> {
  readonly __perPlayer: true;
  readonly entries: ReadonlyArray<readonly [PlayerId, Value]>;
}

export interface SharedBoardRef<BaseId extends string = BoardBaseId> {
  readonly baseId: BaseId;
  readonly seat?: undefined;
}

export interface PerPlayerBoardRef<
  BaseId extends string = BoardBaseId,
  Id extends string = PlayerId,
> {
  readonly baseId: BaseId;
  readonly seat: Id;
}

export type BoardRef<
  BaseId extends string = BoardBaseId,
  Id extends string = PlayerId,
> = SharedBoardRef<BaseId> | PerPlayerBoardRef<BaseId, Id>;

/**
 * Hands are keyed by the authored hand id and split per seat. The per-seat
 * entries are populated from the runtime seat list, not the static manifest
 * upper bound, so views always match what the backend actually computed.
 */
type CardIdsByHandId = Record<string, PerPlayer<CardId[]>>;
type StateName = string;
type TilePropertiesByBoardId = Record<BoardId, Record<string, unknown>>;
type EdgePropertiesByBoardId = Record<BoardId, Record<string, unknown>>;
type VertexPropertiesByBoardId = Record<BoardId, Record<string, unknown>>;

export interface Player {
  /** Player ID */
  playerId: PlayerId;
  /** Player display name */
  name: string;
  /** Whether this player is the host */
  isHost?: boolean;
  /** Player's assigned color */
  color?: HexColor;
}

export interface HexTileState<
  B extends string = BoardId,
  SpaceIdValue extends string = SpaceId,
  Properties = B extends keyof TilePropertiesByBoardId
    ? TilePropertiesByBoardId[B]
    : undefined,
  View = unknown,
> {
  /** Unique tile identifier */
  id: SpaceIdValue;
  /** Axial coordinate Q */
  q: number;
  /** Axial coordinate R */
  r: number;
  /** Tile type identifier for rendering */
  typeId?: SpaceTypeId;
  /** Display label on the tile */
  label?: string;
  /** Player ID who owns this tile */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
  /**
   * Optional view-projection overlay merged onto the static topology by
   * component-first board helpers such as `Board.HexView`. Authored boards can
   * also supply this directly when building tiles by hand.
   */
  view?: View;
}

/** State of an edge on a reducer-projected hex board. */
export interface HexEdgeState<
  B extends string = BoardId,
  SpaceIdValue extends string = SpaceId,
  EdgeIdValue extends string = string,
  Properties = B extends keyof EdgePropertiesByBoardId
    ? EdgePropertiesByBoardId[B]
    : undefined,
> {
  /** Unique edge identifier (serialized string, e.g., "tile1-tile2") */
  id: EdgeIdValue;
  /** First hex tile ID this edge borders */
  hex1: SpaceIdValue;
  /** Second hex tile ID this edge borders */
  hex2: SpaceIdValue;
  /** Edge type identifier for rendering */
  typeId?: EdgeTypeId;
  /** Display label for setup or rendering */
  label?: string;
  /** Player ID who owns this edge */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** State of a vertex on a reducer-projected hex board. */
export interface HexVertexState<
  B extends string = BoardId,
  SpaceIdValue extends string = SpaceId,
  VertexIdValue extends string = string,
  Properties = B extends keyof VertexPropertiesByBoardId
    ? VertexPropertiesByBoardId[B]
    : undefined,
> {
  /** Unique vertex identifier (serialized string, e.g., "tile1-tile2-tile3") */
  id: VertexIdValue;
  /** The hex tile IDs this vertex touches */
  hexes: readonly SpaceIdValue[];
  /** Vertex type identifier for rendering */
  typeId?: VertexTypeId;
  /** Display label for setup or rendering */
  label?: string;
  /** Player ID who owns this vertex */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** Complete state of a reducer-projected hex board. */
export interface HexBoardState<
  B extends string = BoardId,
  SpaceIdValue extends string = SpaceId,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  TileProperties = B extends keyof TilePropertiesByBoardId
    ? TilePropertiesByBoardId[B]
    : undefined,
  EdgeProperties = B extends keyof EdgePropertiesByBoardId
    ? EdgePropertiesByBoardId[B]
    : undefined,
  VertexProperties = B extends keyof VertexPropertiesByBoardId
    ? VertexPropertiesByBoardId[B]
    : undefined,
> {
  /** Unique board identifier */
  id: B;
  /** All tiles on the board */
  tiles: ReadonlyArray<HexTileState<B, SpaceIdValue, TileProperties>>;
  /** All edges on the board */
  edges: ReadonlyArray<
    HexEdgeState<B, SpaceIdValue, EdgeIdValue, EdgeProperties>
  >;
  /** All vertices on the board */
  vertices: ReadonlyArray<
    HexVertexState<B, SpaceIdValue, VertexIdValue, VertexProperties>
  >;
}

/** State of a node in a reducer-projected network board. */
export interface NetworkNodeState {
  /** Unique node identifier */
  id: SpaceId;
  /** X coordinate position */
  x: number;
  /** Y coordinate position */
  y: number;
  /** Node type identifier for rendering */
  typeId?: SpaceTypeId;
  /** Display label on the node */
  label?: string;
  /** Player ID who owns this node */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: string;
}

/** State of an edge connecting two nodes in a reducer-projected network board. */
export interface NetworkEdgeState {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  from: SpaceId;
  /** Target node ID */
  to: SpaceId;
  /** Edge type identifier for rendering */
  typeId?: string;
  /** Display label on the edge */
  label?: string;
  /** Player ID who owns this edge */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: string;
}

/** State of a piece placed on a reducer-projected network node. */
export interface NetworkPieceState {
  /** Unique piece identifier */
  id: PieceId;
  /** Node ID where this piece is placed */
  nodeId: SpaceId;
  /** Piece type identifier for rendering */
  typeId?: PieceTypeId;
  /** Player ID who owns this piece */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: string;
}

/** Complete state of a reducer-projected network board. */
export interface NetworkBoardState {
  /** Unique board identifier */
  id: BoardId;
  /** All nodes on the board */
  nodes: NetworkNodeState[];
  /** All edges on the board */
  edges: NetworkEdgeState[];
  /** All pieces on the board */
  pieces: NetworkPieceState[];
}

/** State of a cell on a reducer-projected square grid board. */
export interface SquareCellState<
  SpaceIdValue extends string = SpaceId,
  Properties = Record<string, unknown>,
> {
  /** Unique cell identifier */
  id: SpaceIdValue;
  /** Row index (0-based) */
  row: number;
  /** Column index (0-based) */
  col: number;
  /** Cell type identifier for rendering */
  typeId?: SpaceTypeId;
  /** Display label on the cell */
  label?: string;
  /** Player ID who owns this cell */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** State of an edge on a reducer-projected square grid board. */
export interface SquareEdgeState<
  SpaceIdValue extends string = SpaceId,
  EdgeIdValue extends string = string,
  Properties = Record<string, unknown>,
> {
  /** Unique edge identifier */
  id: EdgeIdValue;
  /** The cell IDs this edge borders */
  spaceIds: readonly SpaceIdValue[];
  /** Edge type identifier for rendering */
  typeId?: EdgeTypeId;
  /** Display label for setup or rendering */
  label?: string;
  /** Player ID who owns this edge */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** State of a vertex on a reducer-projected square grid board. */
export interface SquareVertexState<
  SpaceIdValue extends string = SpaceId,
  VertexIdValue extends string = string,
  Properties = Record<string, unknown>,
> {
  /** Unique vertex identifier */
  id: VertexIdValue;
  /** The cell IDs that touch this corner */
  spaceIds: readonly SpaceIdValue[];
  /** Vertex type identifier for rendering */
  typeId?: VertexTypeId;
  /** Display label for setup or rendering */
  label?: string;
  /** Player ID who owns this vertex */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** State of a piece placed on a reducer-projected square grid cell. */
export interface SquarePieceState<
  PieceIdValue extends string = PieceId,
  Properties = Record<string, unknown>,
> {
  /** Unique piece identifier */
  id: PieceIdValue;
  /** Row index where piece is located */
  row: number;
  /** Column index where piece is located */
  col: number;
  /** Piece type identifier for rendering */
  typeId: PieceTypeId;
  /** Player ID who owns this piece */
  owner?: PlayerId;
  /** JSON-serialized custom properties */
  properties?: Properties;
}

/** Complete state of a reducer-projected square grid board. */
export interface SquareBoardState<
  B extends string = BoardId,
  SpaceIdValue extends string = SpaceId,
  EdgeIdValue extends string = string,
  VertexIdValue extends string = string,
  PieceIdValue extends string = PieceId,
  CellProperties = Record<string, unknown>,
  EdgeProperties = Record<string, unknown>,
  VertexProperties = Record<string, unknown>,
  PieceProperties = Record<string, unknown>,
> {
  /** Unique board identifier */
  id: B;
  /** Number of rows in the grid */
  rows: number;
  /** Number of columns in the grid */
  cols: number;
  /** All authored cells on the board */
  cells: ReadonlyArray<SquareCellState<SpaceIdValue, CellProperties>>;
  /** All edges on the board */
  edges: ReadonlyArray<
    SquareEdgeState<SpaceIdValue, EdgeIdValue, EdgeProperties>
  >;
  /** All vertices on the board */
  vertices: ReadonlyArray<
    SquareVertexState<SpaceIdValue, VertexIdValue, VertexProperties>
  >;
  /** All pieces on the board */
  pieces: ReadonlyArray<SquarePieceState<PieceIdValue, PieceProperties>>;
}

/** State of a space on a reducer-projected track board. */
export interface TrackSpaceState {
  /** Unique space identifier */
  id: SpaceId;
  /** Position index in the track sequence */
  index: number;
  /** X coordinate for rendering */
  x: number;
  /** Y coordinate for rendering */
  y: number;
  /** Display name of the space */
  name?: string;
  /** Space type identifier for rendering */
  typeId?: SpaceTypeId;
  /** Player ID who owns this space */
  owner?: PlayerId;
  /** IDs of spaces that can be reached from here (for branching tracks) */
  nextSpaces?: SpaceId[];
  /** JSON-serialized custom properties */
  properties?: string;
}

/** State of a piece on a reducer-projected track board. */
export interface TrackPieceState {
  /** Unique piece identifier */
  id: PieceId;
  /** ID of the space this piece occupies */
  spaceId: SpaceId;
  /** Player ID who owns this piece */
  owner: PlayerId;
  /** Piece type identifier for rendering */
  typeId?: PieceTypeId;
  /** JSON-serialized custom properties */
  properties?: string;
}

/** Complete state of a reducer-projected track board. */
export interface TrackBoardState {
  /** Unique board identifier */
  id: BoardId;
  /** All spaces on the track */
  spaces: TrackSpaceState[];
  /** All pieces on the track */
  pieces: TrackPieceState[];
}

/** State of a reducer-projected die component. */
export interface DieState {
  /** Unique die identifier */
  id: DieId;
  /** Number of sides on the die (e.g., 6 for standard die) */
  sides: number;
  /** Current face value (1 to sides, undefined if not rolled) */
  currentValue?: number;
  /** Optional color for visual identification */
  color?: string;
}

/**
 * Collection of boards of a particular kind, split into shared boards
 * (indexed by base id, e.g. `"market-board"`) and per-player boards
 * (indexed by base id, then by the runtime seat list via `PerPlayer<T>`).
 *
 * Splitting by the `BoardRef` discriminator keeps the UI types honest about
 * what the runtime actually produced: per-player board state only exists
 * for the seats that are currently playing, never for a static `maxPlayers`
 * upper bound.
 */
export interface BoardKindStates<State> {
  /** Shared boards keyed by base id. */
  shared: Record<BoardBaseId, State>;
  /** Per-player boards keyed by base id, then by seat via `PerPlayer<T>`. */
  perPlayer: Record<BoardBaseId, PerPlayer<State>>;
}

/**
 * Container for all board states organized by kind.
 * This is the strongly-typed board payload authored UIs consume from reducer views.
 */
export interface BoardStates {
  /** Hex boards split into shared vs per-player collections. */
  hex: BoardKindStates<HexBoardState>;
  /** Network boards split into shared vs per-player collections. */
  network: BoardKindStates<NetworkBoardState>;
  /** Square grid boards split into shared vs per-player collections. */
  square: BoardKindStates<SquareBoardState>;
  /** Track boards split into shared vs per-player collections. */
  track: BoardKindStates<TrackBoardState>;
}

/**
 * Container for all dice states.
 * Maps die IDs to their die state.
 */
export type DiceStates = Record<DieId, DieState>;

export interface GameState {
  /** All currently active players (supports MULTIPLE_ACTIVE_PLAYER states) */
  currentPlayerIds: PlayerId[];
  decks: CardIdsByDeckId;
  /**
   * Player-scoped hands keyed by the authored hand id. The inner
   * `PerPlayer<CardId[]>` is keyed by the runtime seat list and only
   * contains entries for players who actually hold the hand.
   */
  hands: CardIdsByHandId;
  /** Map of card IDs to their card info including type and properties */
  cards: Record<CardId, ViewCard<CardId, string, CardProperties>>;
  /**
   * Per-player resource totals keyed by the runtime seat list. The inner
   * record maps resource id → amount for that seat.
   */
  playerResources: PerPlayer<Record<string, number>>;
  currentState: StateName;
  isMyTurn: boolean;
  boards: BoardStates;
  dice: DiceStates;
}
