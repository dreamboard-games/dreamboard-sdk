import type { RuntimeBoardState, RuntimeTableRecord } from "../model";

let cloneRuntimeTableCallCount = 0;

export function resetCloneRuntimeTableCallCount(): void {
  cloneRuntimeTableCallCount = 0;
}

export function getCloneRuntimeTableCallCount(): number {
  return cloneRuntimeTableCallCount;
}

function cloneRuntimeBoardState(board: RuntimeBoardState): RuntimeBoardState {
  if (board.layout !== "generic") {
    return {
      ...board,
      fields: { ...board.fields },
      spaces: Object.fromEntries(
        Object.entries(board.spaces).map(([spaceId, space]) => [
          spaceId,
          {
            ...space,
            fields: { ...space.fields },
          },
        ]),
      ),
      relations: board.relations.map((relation) => ({
        ...relation,
        fields: { ...relation.fields },
      })),
      containers: Object.fromEntries(
        Object.entries(board.containers).map(([containerId, container]) => [
          containerId,
          {
            ...container,
            fields: { ...container.fields },
          },
        ]),
      ),
      edges: board.edges.map((edge) => ({
        ...edge,
        spaceIds: [...edge.spaceIds],
        fields: { ...edge.fields },
      })),
      vertices: board.vertices.map((vertex) => ({
        ...vertex,
        spaceIds: [...vertex.spaceIds],
        fields: { ...vertex.fields },
      })),
    };
  }

  return {
    ...board,
    fields: { ...board.fields },
    spaces: Object.fromEntries(
      Object.entries(board.spaces).map(([spaceId, space]) => [
        spaceId,
        {
          ...space,
          fields: { ...space.fields },
        },
      ]),
    ),
    relations: board.relations.map((relation) => ({
      ...relation,
      fields: { ...relation.fields },
    })),
    containers: Object.fromEntries(
      Object.entries(board.containers).map(([containerId, container]) => [
        containerId,
        {
          ...container,
          fields: { ...container.fields },
        },
      ]),
    ),
  };
}

export function cloneRuntimeTable<Table extends RuntimeTableRecord>(
  table: Table,
): Table {
  cloneRuntimeTableCallCount += 1;
  return {
    ...table,
    zones: {
      shared: Object.fromEntries(
        Object.entries(table.zones.shared).map(([zoneId, componentIds]) => [
          zoneId,
          [...componentIds],
        ]),
      ) as Table["zones"]["shared"],
      perPlayer: Object.fromEntries(
        Object.entries(table.zones.perPlayer).map(([zoneId, players]) => [
          zoneId,
          Object.fromEntries(
            table.playerOrder.map((playerId) => [
              playerId,
              [...players[playerId]],
            ]),
          ),
        ]),
      ) as Table["zones"]["perPlayer"],
      visibility: { ...table.zones.visibility },
      cardSetIdsByZoneId: table.zones.cardSetIdsByZoneId
        ? Object.fromEntries(
            Object.entries(table.zones.cardSetIdsByZoneId).map(
              ([zoneId, cardSetIds]) => [zoneId, [...cardSetIds]],
            ),
          )
        : table.zones.cardSetIdsByZoneId,
    } as Table["zones"],
    decks: Object.fromEntries(
      Object.entries(table.decks).map(([deckId, cards]) => [
        deckId,
        [...cards],
      ]),
    ) as Table["decks"],
    hands: Object.fromEntries(
      Object.entries(table.hands).map(([handId, players]) => [
        handId,
        Object.fromEntries(
          table.playerOrder.map((playerId) => [
            playerId,
            [...players[playerId]],
          ]),
        ),
      ]),
    ) as Table["hands"],
    handVisibility: { ...table.handVisibility },
    pieces: Object.fromEntries(
      Object.entries(table.pieces).map(([pieceId, piece]) => [
        pieceId,
        { ...piece },
      ]),
    ) as Table["pieces"],
    componentLocations: { ...table.componentLocations },
    ownerOfCard: { ...table.ownerOfCard },
    visibility: { ...table.visibility },
    resources: Object.fromEntries(
      table.playerOrder.map((playerId) => [
        playerId,
        { ...table.resources[playerId] },
      ]),
    ) as Table["resources"],
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
    } as Table["boards"],
    dice: Object.fromEntries(
      Object.entries(table.dice).map(([dieId, die]) => [dieId, { ...die }]),
    ) as Table["dice"],
  };
}
