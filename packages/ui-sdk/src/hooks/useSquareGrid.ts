/**
 * useSquareGrid hook - Utilities for square grid operations
 *
 * Provides basic grid utilities and neighbor finding.
 * Game-specific logic (pathfinding, movement rules) should be implemented by the parent.
 *
 * @example
 * ```tsx
 * const gridApi = useSquareGrid({ rows: 8, cols: 8, pieces });
 *
 * // Get neighbors
 * const neighbors = gridApi.getNeighbors(3, 4);
 *
 * // Get piece at position
 * const piece = gridApi.getPieceAt(0, 0);
 *
 * // Calculate distance
 * const dist = gridApi.getDistance(0, 0, 7, 7);
 * ```
 */

import { useMemo, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface GridPieceData {
  /** Unique piece identifier */
  id: string;
  /** Row position (0-based) */
  row: number;
  /** Column position (0-based) */
  col: number;
  /** Piece type */
  type: string;
  /** Owner player ID */
  owner?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

export interface CellData {
  /** Row index */
  row: number;
  /** Column index */
  col: number;
  /** Whether the cell is blocked */
  blocked?: boolean;
  /** Cell type */
  type?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

export type DistanceType = "manhattan" | "chebyshev" | "euclidean";
export type NeighborType = "orthogonal" | "diagonal" | "all";

export interface UseSquareGridOptions {
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Pieces on the grid */
  pieces?: GridPieceData[];
  /** Blocked cells */
  blockedCells?: Array<{ row: number; col: number }>;
  /** Neighbor type for movement */
  neighborType?: NeighborType;
}

export interface UseSquareGridReturn {
  /** Get piece at a position */
  getPieceAt: (row: number, col: number) => GridPieceData | undefined;

  /** Get pieces by owner */
  getPiecesByOwner: (owner: string) => GridPieceData[];

  /** Get neighboring cells */
  getNeighbors: (
    row: number,
    col: number,
    type?: NeighborType,
  ) => Array<{ row: number; col: number }>;

  /** Calculate distance between two cells */
  getDistance: (
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    type?: DistanceType,
  ) => number;

  /** Check if a cell is valid (within bounds) */
  isValidCell: (row: number, col: number) => boolean;

  /** Check if a cell is blocked */
  isBlocked: (row: number, col: number) => boolean;

  /** Check if a cell is occupied by a piece */
  isOccupied: (row: number, col: number) => boolean;

  /** Get cells in a rectangle area */
  getCellsInRect: (
    topRow: number,
    leftCol: number,
    bottomRow: number,
    rightCol: number,
  ) => Array<{ row: number; col: number }>;

  /** Convert row/col to algebraic notation */
  toAlgebraic: (row: number, col: number) => string;

  /** Convert algebraic notation to row/col */
  fromAlgebraic: (notation: string) => { row: number; col: number } | null;
}

// ============================================================================
// Direction vectors
// ============================================================================

const ORTHOGONAL_DIRS = [
  { dr: -1, dc: 0 }, // up
  { dr: 1, dc: 0 }, // down
  { dr: 0, dc: -1 }, // left
  { dr: 0, dc: 1 }, // right
];

const DIAGONAL_DIRS = [
  { dr: -1, dc: -1 }, // up-left
  { dr: -1, dc: 1 }, // up-right
  { dr: 1, dc: -1 }, // down-left
  { dr: 1, dc: 1 }, // down-right
];

const ALL_DIRS = [...ORTHOGONAL_DIRS, ...DIAGONAL_DIRS];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSquareGrid(
  options: UseSquareGridOptions,
): UseSquareGridReturn {
  const {
    rows,
    cols,
    pieces = [],
    blockedCells = [],
    neighborType = "orthogonal",
  } = options;

  // Create lookup maps
  const pieceMap = useMemo(() => {
    const map = new Map<string, GridPieceData>();
    pieces.forEach((p) => {
      map.set(`${p.row},${p.col}`, p);
    });
    return map;
  }, [pieces]);

  const blockedSet = useMemo(() => {
    return new Set(blockedCells.map((c) => `${c.row},${c.col}`));
  }, [blockedCells]);

  // Get piece at position
  const getPieceAt = useCallback(
    (row: number, col: number): GridPieceData | undefined => {
      return pieceMap.get(`${row},${col}`);
    },
    [pieceMap],
  );

  // Get pieces by owner
  const getPiecesByOwner = useCallback(
    (owner: string): GridPieceData[] => {
      return pieces.filter((p) => p.owner === owner);
    },
    [pieces],
  );

  // Check if cell is valid
  const isValidCell = useCallback(
    (row: number, col: number): boolean => {
      return row >= 0 && row < rows && col >= 0 && col < cols;
    },
    [rows, cols],
  );

  // Check if cell is blocked
  const isBlocked = useCallback(
    (row: number, col: number): boolean => {
      return blockedSet.has(`${row},${col}`);
    },
    [blockedSet],
  );

  // Check if cell is occupied
  const isOccupied = useCallback(
    (row: number, col: number): boolean => {
      return pieceMap.has(`${row},${col}`);
    },
    [pieceMap],
  );

  // Get neighboring cells
  const getNeighbors = useCallback(
    (
      row: number,
      col: number,
      type: NeighborType = neighborType,
    ): Array<{ row: number; col: number }> => {
      const dirs =
        type === "orthogonal"
          ? ORTHOGONAL_DIRS
          : type === "diagonal"
            ? DIAGONAL_DIRS
            : ALL_DIRS;

      const neighbors: Array<{ row: number; col: number }> = [];
      for (const { dr, dc } of dirs) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidCell(newRow, newCol)) {
          neighbors.push({ row: newRow, col: newCol });
        }
      }
      return neighbors;
    },
    [neighborType, isValidCell],
  );

  // Calculate distance
  const getDistance = useCallback(
    (
      r1: number,
      c1: number,
      r2: number,
      c2: number,
      type: DistanceType = "manhattan",
    ): number => {
      const dr = Math.abs(r2 - r1);
      const dc = Math.abs(c2 - c1);

      switch (type) {
        case "manhattan":
          return dr + dc;
        case "chebyshev":
          return Math.max(dr, dc);
        case "euclidean":
          return Math.sqrt(dr * dr + dc * dc);
        default:
          return dr + dc;
      }
    },
    [],
  );

  // Get cells in rectangle
  const getCellsInRect = useCallback(
    (
      topRow: number,
      leftCol: number,
      bottomRow: number,
      rightCol: number,
    ): Array<{ row: number; col: number }> => {
      const cells: Array<{ row: number; col: number }> = [];

      const minRow = Math.max(0, Math.min(topRow, bottomRow));
      const maxRow = Math.min(rows - 1, Math.max(topRow, bottomRow));
      const minCol = Math.max(0, Math.min(leftCol, rightCol));
      const maxCol = Math.min(cols - 1, Math.max(leftCol, rightCol));

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          cells.push({ row: r, col: c });
        }
      }

      return cells;
    },
    [rows, cols],
  );

  // Convert to algebraic notation
  const toAlgebraic = useCallback(
    (row: number, col: number): string => {
      const file = String.fromCharCode(97 + col);
      const rank = rows - row;
      return `${file}${rank}`;
    },
    [rows],
  );

  // Convert from algebraic notation
  const fromAlgebraic = useCallback(
    (notation: string): { row: number; col: number } | null => {
      if (notation.length < 2) return null;

      const file = notation.charCodeAt(0) - 97;
      const rank = parseInt(notation.slice(1), 10);

      if (isNaN(rank)) return null;

      const row = rows - rank;
      const col = file;

      if (!isValidCell(row, col)) return null;

      return { row, col };
    },
    [rows, isValidCell],
  );

  return {
    getPieceAt,
    getPiecesByOwner,
    getNeighbors,
    getDistance,
    isValidCell,
    isBlocked,
    isOccupied,
    getCellsInRect,
    toAlgebraic,
    fromAlgebraic,
  };
}
