import {
  createHexBoardGeometry,
  hexShapeCoordinates,
  spiral,
} from "../../shared/hex-board";
import { Hex } from "honeycomb-grid";
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

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHexGrid(tiles: HexTileData[]): UseHexGridReturn {
  const geometry = useMemo(
    () => createHexBoardGeometry({ id: "__hex-grid__", spaces: tiles }),
    [tiles],
  );
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

      return geometry.neighbors(tileId).map((id) => tileById.get(id)!);
    },
    [geometry, tileById],
  );

  // Calculate distance between two tiles
  const getDistance = useCallback(
    (fromId: string, toId: string): number => {
      const from = tileById.get(fromId);
      const to = tileById.get(toId);
      if (!from || !to) return Infinity;

      return geometry.distance(fromId, toId);
    },
    [geometry, tileById],
  );

  // Get all tiles within range
  const getHexesInRange = useCallback(
    (centerId: string, range: number): HexTileData[] => {
      const center = tileById.get(centerId);
      if (!center) return [];

      return hexShapeCoordinates(spiral({ center, radius: range })).flatMap(
        ({ q, r }) => {
          const tile = tileByCoord.get(`${q},${r}`);
          return tile ? [tile] : [];
        },
      );
    },
    [tileById, tileByCoord],
  );

  // Convert axial to cube coordinates
  const axialToCube = useCallback(
    (q: number, r: number): { x: number; y: number; z: number } => {
      return { x: q, z: r, y: new Hex({ q, r }).s };
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
