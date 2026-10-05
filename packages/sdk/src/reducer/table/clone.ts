import type { RuntimeBoardState, RuntimeTableRecord } from "../model";

let cloneRuntimeTableCallCount = 0;

export function resetCloneRuntimeTableCallCount(): void {
  cloneRuntimeTableCallCount = 0;
}

export function getCloneRuntimeTableCallCount(): number {
  return cloneRuntimeTableCallCount;
}

function cloneRuntimeBoardState<Board extends RuntimeBoardState>(
  board: Board,
): Board {
  return structuredClone(board);
}

export function cloneRuntimeTable<Table extends RuntimeTableRecord>(
  table: Table,
): Table {
  cloneRuntimeTableCallCount += 1;
  return {
    ...table,
    zones: Object.fromEntries(
      Object.entries(table.zones).map(([zoneId, hosts]) => [
        zoneId,
        Object.fromEntries(
          Object.entries(hosts).map(([hostId, ids]) => [hostId, [...ids]]),
        ),
      ]),
    ),
    tiles: structuredClone(table.tiles),
    pieces: Object.fromEntries(
      Object.entries(table.pieces).map(([pieceId, piece]) => [
        pieceId,
        { ...piece },
      ]),
    ),
    componentLocations: { ...table.componentLocations },
    ownerOfCard: { ...table.ownerOfCard },
    visibility: { ...table.visibility },
    resources: Object.fromEntries(
      table.playerOrder.map((playerId) => [
        playerId,
        { ...table.resources[playerId] },
      ]),
    ),
    boards: {
      ...table.boards,
      byId: Object.fromEntries(
        Object.entries(table.boards.byId).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
      hex: Object.fromEntries(
        Object.entries(table.boards.hex ?? {}).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
      square: Object.fromEntries(
        Object.entries(table.boards.square ?? {}).map(([boardId, board]) => [
          boardId,
          cloneRuntimeBoardState(board),
        ]),
      ),
    },
    dice: Object.fromEntries(
      Object.entries(table.dice).map(([dieId, die]) => [dieId, { ...die }]),
    ),
  };
}
