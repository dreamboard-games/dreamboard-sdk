import { useCallback, useMemo } from "react";
import type {
  AnySquareBoardInput,
  BoardSpaceIdOf,
  NormalizedSquareBoard,
  NormalizedSquareCellOf,
} from "../types/tiled-board.js";
import { normalizeSquareBoardInput } from "../types/tiled-board.js";
import { useBoardTopology } from "./useBoardTopology.js";

type NeighborMode = "orthogonal" | "diagonal" | "all";
type DistanceMetric = "manhattan" | "chebyshev";

export function useSquareBoard<const TBoard extends AnySquareBoardInput>(
  board: TBoard,
) {
  const normalizedBoard = useMemo<NormalizedSquareBoard<TBoard>>(
    () => normalizeSquareBoardInput(board),
    [board],
  );
  const topology = useBoardTopology(board);

  const cellByCoordinate = useMemo(
    () =>
      new Map(
        normalizedBoard.cells.map(
          (cell) => [`${cell.row},${cell.col}`, cell] as const,
        ),
      ),
    [normalizedBoard.cells],
  );

  const getCell = useCallback(
    (cellId: BoardSpaceIdOf<TBoard>) => {
      return topology.getSpace(cellId) as
        | NormalizedSquareCellOf<TBoard>
        | undefined;
    },
    [topology],
  );

  const getCellAt = useCallback(
    (row: number, col: number) => {
      return cellByCoordinate.get(`${row},${col}`) as
        | NormalizedSquareCellOf<TBoard>
        | undefined;
    },
    [cellByCoordinate],
  );

  const getNeighbors = useCallback(
    (cellId: BoardSpaceIdOf<TBoard>, mode: NeighborMode = "orthogonal") => {
      const cell = getCell(cellId);
      if (!cell) {
        return [] as Array<NormalizedSquareCellOf<TBoard>>;
      }

      const offsets: ReadonlyArray<readonly [number, number]> =
        mode === "diagonal"
          ? [
              [-1, -1],
              [-1, 1],
              [1, -1],
              [1, 1],
            ]
          : mode === "all"
            ? [
                [-1, 0],
                [0, 1],
                [1, 0],
                [0, -1],
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
              ]
            : [
                [-1, 0],
                [0, 1],
                [1, 0],
                [0, -1],
              ];

      return offsets
        .map(([rowOffset, colOffset]) =>
          getCellAt(cell.row + rowOffset, cell.col + colOffset),
        )
        .filter(
          (candidate): candidate is NormalizedSquareCellOf<TBoard> =>
            candidate !== undefined,
        );
    },
    [getCell, getCellAt],
  );

  const getDistance = useCallback(
    (
      fromCellId: BoardSpaceIdOf<TBoard>,
      toCellId: BoardSpaceIdOf<TBoard>,
      metric: DistanceMetric = "manhattan",
    ) => {
      const fromCell = getCell(fromCellId);
      const toCell = getCell(toCellId);
      if (!fromCell || !toCell) {
        return Number.POSITIVE_INFINITY;
      }
      const rowDistance = Math.abs(fromCell.row - toCell.row);
      const colDistance = Math.abs(fromCell.col - toCell.col);
      return metric === "chebyshev"
        ? Math.max(rowDistance, colDistance)
        : rowDistance + colDistance;
    },
    [getCell],
  );

  return {
    ...topology,
    board: normalizedBoard,
    getCell,
    getCellAt,
    getNeighbors,
    getDistance,
  };
}
