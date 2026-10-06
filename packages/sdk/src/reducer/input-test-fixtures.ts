import type { RuntimeHexBoardState } from "./model";
import { createTable } from "./lifecycle-test-fixtures";

/** A complete table for collector-domain tests, consumed by real table queries. */
export function createInputTestState() {
  const table = createTable();
  table.zones.hand = { "player-1": ["card-a", "card-b"], "player-2": [] };
  for (const id of ["card-a", "card-b"]) {
    table.cards[id] = {
      id,
      cardSetId: "cards",
      cardType: "card",
      properties: {},
    };
    table.ownerOfCard[id] = "player-1";
    table.visibility[id] = { faceUp: true };
    table.componentLocations[id] = {
      type: "InZone",
      zoneId: "hand",
      hostId: "player-1",
      playedBy: null,
    };
  }
  for (const id of [
    "board",
    "main-board",
    "workshop-mat:player-1",
    "workshop-mat:player-2",
  ]) {
    const playerId = id.split(":")[1];
    const board: RuntimeHexBoardState = {
      id,
      baseId: playerId ? "workshop-mat" : id,
      layout: "hex",
      typeId: "test-board",
      scope: playerId ? "perPlayer" : "shared",
      ...(playerId ? { playerId } : {}),
      orientation: "pointy",
      fields: {},
      spaces: {
        s1: { id: "s1", q: 0, r: 0, typeId: "test-space", fields: {} },
        s2: { id: "s2", q: 1, r: 0, typeId: "test-space", fields: {} },
      },
      relations: [],
      containers: {},
      vertices: ["v1", "v2"].map((id) => ({
        id,
        spaceIds: ["s1", "s2"],
        fields: {},
      })),
      edges: ["e1", "e2"].map((id) => ({
        id,
        spaceIds: ["s1", "s2"],
        fields: {},
      })),
    };
    table.boards.byId[id] = board;
    table.boards.hex[id] = board;
  }
  return { table, flow: { currentPhase: "play" } };
}

export const inputDefinitions = {
  zoneDefinitions: {
    hand: { scope: "perPlayer", visibility: "public", allowedCardSetIds: [] },
  },
} as const;
