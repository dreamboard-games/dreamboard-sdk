/**
 * Board Primitives
 *
 * Reusable board visualization components for different game types.
 *
 * Components:
 * - NetworkGraph: For route-building games (Ticket to Ride, Pandemic)
 * - HexGrid: For hex-based games (Catan, wargames)
 * - SquareGrid: For grid-based games (Chess, Go, Checkers)
 * - ZoneMap: For area control games (Risk, Small World)
 * - TrackBoard: For track/racing games (Monopoly, Game of Life)
 * - SlotSystem: For worker placement games (Agricola, Viticulture)
 */

// NetworkGraph - Route building games
export {
  NetworkGraph,
  // Pre-built helper components for easy customization
  DefaultNetworkNode,
  DefaultNetworkEdge,
  DefaultNetworkPiece,
  type NetworkGraphProps,
  type NetworkNode,
  type NetworkEdge,
  type NetworkPiece,
  type DefaultNetworkNodeProps,
  type DefaultNetworkEdgeProps,
  type DefaultNetworkPieceProps,
} from "./NetworkGraph.js";

// HexGrid - Hex-based games (Catan, wargames)
export {
  HexGrid,
  hexUtils,
  // Pre-built helper components for easy customization
  DefaultHexTile,
  DefaultHexEdge,
  DefaultHexVertex,
  type HexGridBoardProps,
  type HexGridProps,
  type HexOrientation,
  type HexTileGeometry,
  type InteractiveHexEdge,
  type InteractiveHexSpace,
  type InteractiveHexVertex,
  type EdgePosition,
  type DefaultHexTileProps,
  type DefaultHexEdgeProps,
  type DefaultHexVertexProps,
} from "./HexGrid.js";

export type {
  InteractiveTargetLayer,
  InteractiveTargetRenderState,
} from "./target-layer.js";

export {
  createHexBoardView,
  type HexBoardView,
  type HexBoardViewTile,
} from "./hex-board-view.js";

// SquareGrid - Grid-based games (Chess, Go, Checkers)
export {
  SquareGrid,
  // Pre-built helper components for easy customization
  DefaultGridCell,
  DefaultGridPiece,
  DefaultChessPiece,
  // Utility functions
  toAlgebraic,
  toNumeric,
  type SquareGridBoardProps,
  type SquareGridProps,
  type InteractiveSquareEdge,
  type InteractiveSquareSpace,
  type InteractiveSquareVertex,
  type SquareEdgePosition,
  type SquareVertexPosition,
  type DefaultGridCellProps,
  type DefaultGridPieceProps,
  type DefaultChessPieceProps,
} from "./SquareGrid.js";

// ZoneMap - Area control games
export {
  ZoneMap,
  // Pre-built helper components for easy customization
  DefaultZone,
  DefaultZonePieces,
  DefaultZonePiece,
  type ZoneMapProps,
  type ZoneDefinition,
  type ZonePiece,
  type ZoneShape,
  type ZoneHighlightType,
  type DefaultZoneProps,
  type DefaultZonePiecesProps,
  type DefaultZonePieceProps,
} from "./ZoneMap.js";

// TrackBoard - Track/racing games
export {
  TrackBoard,
  // Pre-built helper components for easy customization
  DefaultTrackSpace,
  DefaultTrackPiece,
  DefaultTrackConnection,
  DefaultTrackJump,
  type TrackBoardProps,
  type TrackSpace,
  type TrackPiece,
  type DefaultTrackSpaceProps,
  type DefaultTrackPieceProps,
  type DefaultTrackConnectionProps,
  type DefaultTrackJumpProps,
} from "./TrackBoard.js";

// SlotSystem - Worker placement games
export {
  SlotSystem,
  // Pre-built helper components for easy customization
  DefaultSlotItem,
  DefaultSlotOccupant,
  DefaultEmptySlot,
  type SlotSystemProps,
  type SlotDefinition,
  type SlotOccupant,
  type DefaultSlotItemProps,
  type DefaultSlotOccupantProps,
  type DefaultEmptySlotProps,
} from "./SlotSystem.js";

export type {
  HexTileState,
  HexEdgeState,
  HexVertexState,
  SquareCellState,
  SquareEdgeState,
  SquarePieceState,
  SquareVertexState,
} from "../../types/player-state.js";
