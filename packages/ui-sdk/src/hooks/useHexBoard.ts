import { useCallback, useMemo } from "react";
import type {
  AnyHexBoardInput,
  BoardSpaceIdOf,
  NormalizedHexBoard,
  NormalizedHexTileOf,
} from "../types/tiled-board.js";
import { normalizeHexBoardInput } from "../types/tiled-board.js";
import { useBoardTopology } from "./useBoardTopology.js";

export function useHexBoard<const TBoard extends AnyHexBoardInput>(
  board: TBoard,
) {
  const normalizedBoard = useMemo<NormalizedHexBoard<TBoard>>(
    () => normalizeHexBoardInput(board),
    [board],
  );
  const topology = useBoardTopology(board);

  const tileByCoordinate = useMemo(
    () =>
      new Map(
        normalizedBoard.tiles.map(
          (tile) => [`${tile.q},${tile.r}`, tile] as const,
        ),
      ),
    [normalizedBoard.tiles],
  );

  const getTile = useCallback(
    (tileId: BoardSpaceIdOf<TBoard>) => {
      return topology.getSpace(tileId) as
        | NormalizedHexTileOf<TBoard>
        | undefined;
    },
    [topology],
  );

  const getTileAt = useCallback(
    (q: number, r: number) => {
      return tileByCoordinate.get(`${q},${r}`) as
        | NormalizedHexTileOf<TBoard>
        | undefined;
    },
    [tileByCoordinate],
  );

  const getNeighbors = useCallback(
    (tileId: BoardSpaceIdOf<TBoard>) => {
      return topology.getAdjacentSpaces(tileId) as Array<
        NormalizedHexTileOf<TBoard>
      >;
    },
    [topology],
  );

  const getTilesInRange = useCallback(
    (centerTileId: BoardSpaceIdOf<TBoard>, range: number) => {
      return normalizedBoard.tiles.filter(
        (tile) => topology.getDistance(centerTileId, tile.id) <= range,
      ) as Array<NormalizedHexTileOf<TBoard>>;
    },
    [normalizedBoard.tiles, topology],
  );

  return {
    ...topology,
    board: normalizedBoard,
    getTile,
    getTileAt,
    getNeighbors,
    getTilesInRange,
  };
}
