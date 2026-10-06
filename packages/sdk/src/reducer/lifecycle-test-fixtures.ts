import type { RuntimeTableRecord } from "./model";
import { asPlayerId } from "./per-player";

export function createTable(
  playerIds = ["player-1", "player-2"],
): RuntimeTableRecord {
  const ids = playerIds.map((id) => asPlayerId(id));
  return {
    playerOrder: [...playerIds],
    zones: { hand: Object.fromEntries(playerIds.map((id) => [id, []])) },

    cards: {},
    pieces: {},
    componentLocations: { "die-1": { type: "Detached" } },
    ownerOfCard: {},
    visibility: {},
    resources: Object.fromEntries(ids.map((id) => [id, {}])),
    boards: {},
    tiles: {},
    dice: {
      "die-1": {
        id: "die-1",
        dieTypeId: "d6",
        dieName: "Test die",
        sides: 6,
        value: null,
        properties: {},
      },
    },
  };
}
