/**
 * useHexGrid hook - Headless logic for hex grid games
 *
 * Provides utilities for:
 * - Coordinate conversion and neighbor finding
 * - Distance calculations
 * - Tile lookups
 *
 * @example
 * ```tsx
 * const { getNeighbors, getDistance, getTile } = useHexGrid(tiles);
 *
 * // Find all adjacent tiles
 * const neighbors = getNeighbors('center');
 *
 * // Check if two tiles are adjacent
 * const isAdjacent = getDistance('tile1', 'tile2') === 1;
 * ```
 */

import { useMemo, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface HexTileData {
  /** Unique tile identifier */
  id: string;
  /** Axial coordinate Q */
  q: number;
  /** Axial coordinate R */
  r: number;
  /** Tile type */
  type?: string;
  /** Additional data */
  data?: Record<string, unknown>;
}

export interface UseHexGridReturn {
  /** Get a tile by ID */
  getTile: (tileId: string) => HexTileData | undefined;
  /** Get a tile by coordinates */
  getTileAt: (q: number, r: number) => HexTileData | undefined;
  /** Get neighboring tiles */
  getNeighbors: (tileId: string) => HexTileData[];
  /** Get distance between two tiles */
  getDistance: (fromId: string, toId: string) => number;
  /** Get all tiles within a range */
  getHexesInRange: (centerId: string, range: number) => HexTileData[];
  /** Convert axial to cube coordinates */
  axialToCube: (q: number, r: number) => { x: number; y: number; z: number };
  /** Convert cube to axial coordinates */
  cubeToAxial: (x: number, y: number, z: number) => { q: number; r: number };
}

// ============================================================================
// Axial direction vectors
// ============================================================================

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHexGrid(tiles: HexTileData[]): UseHexGridReturn {
  // Create lookup maps
  const tileById = useMemo(() => {
    return new Map(tiles.map((t) => [t.id, t]));
  }, [tiles]);

  const tileByCoord = useMemo(() => {
    return new Map(tiles.map((t) => [`${t.q},${t.r}`, t]));
  }, [tiles]);

  // Get tile by ID
  const getTile = useCallback(
    (tileId: string): HexTileData | undefined => {
      return tileById.get(tileId);
    },
    [tileById],
  );

  // Get tile by coordinates
  const getTileAt = useCallback(
    (q: number, r: number): HexTileData | undefined => {
      return tileByCoord.get(`${q},${r}`);
    },
    [tileByCoord],
  );

  // Get neighboring tiles
  const getNeighbors = useCallback(
    (tileId: string): HexTileData[] => {
      const tile = tileById.get(tileId);
      if (!tile) return [];

      const neighbors: HexTileData[] = [];
      for (const dir of AXIAL_DIRECTIONS) {
        const neighbor = tileByCoord.get(`${tile.q + dir.q},${tile.r + dir.r}`);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
      return neighbors;
    },
    [tileById, tileByCoord],
  );

  // Calculate distance between two tiles
  const getDistance = useCallback(
    (fromId: string, toId: string): number => {
      const from = tileById.get(fromId);
      const to = tileById.get(toId);
      if (!from || !to) return Infinity;

      // Hex distance formula using axial coordinates
      return (
        (Math.abs(from.q - to.q) +
          Math.abs(from.q + from.r - to.q - to.r) +
          Math.abs(from.r - to.r)) /
        2
      );
    },
    [tileById],
  );

  // Get all tiles within range
  const getHexesInRange = useCallback(
    (centerId: string, range: number): HexTileData[] => {
      const center = tileById.get(centerId);
      if (!center) return [];

      const results: HexTileData[] = [];

      for (let dq = -range; dq <= range; dq++) {
        const minR = Math.max(-range, -dq - range);
        const maxR = Math.min(range, -dq + range);
        for (let dr = minR; dr <= maxR; dr++) {
          const tile = tileByCoord.get(`${center.q + dq},${center.r + dr}`);
          if (tile) {
            results.push(tile);
          }
        }
      }

      return results;
    },
    [tileById, tileByCoord],
  );

  // Convert axial to cube coordinates
  const axialToCube = useCallback(
    (q: number, r: number): { x: number; y: number; z: number } => {
      return { x: q, z: r, y: -q - r };
    },
    [],
  );

  // Convert cube to axial coordinates
  const cubeToAxial = useCallback(
    (x: number, _y: number, z: number): { q: number; r: number } => {
      return { q: x, r: z };
    },
    [],
  );

  return {
    getTile,
    getTileAt,
    getNeighbors,
    getDistance,
    getHexesInRange,
    axialToCube,
    cubeToAxial,
  };
}
