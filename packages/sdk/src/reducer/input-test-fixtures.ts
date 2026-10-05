import { compileManifest } from "./manifest/compiler";
import { asPlayerId } from "./per-player";
import * as z from "zod";

export const inputDefinitions = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "detached" },
      cards: [
        {
          id: "card-a",
          name: "Card A",
          cardType: "card",
          count: 1,
          properties: {},
        },
        {
          id: "card-b",
          name: "Card B",
          cardType: "card",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [
    { id: "hand", name: "Hand", scope: "perPlayer", visibility: "public" },
  ],
  boards: [
    {
      id: "board",
      name: "Board",
      layout: "hex",
      scope: "shared",
      orientation: "pointy",
    },
    {
      id: "main-board",
      name: "Main board",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "s1" }, { id: "s2" }],
    },
    {
      id: "workshop-mat",
      name: "Workshop mat",
      layout: "generic",
      scope: "perPlayer",
      spaces: [{ id: "s1" }, { id: "s2" }],
    },
  ],
  tileTypes: [
    {
      id: "test-tile",
      name: "Test tile",
      layout: "hex",
      cells: [
        { id: "s1", at: { q: 0, r: 0 } },
        { id: "s2", at: { q: 1, r: 0 } },
      ],
    },
  ],
  tileSeeds: [
    {
      id: "test-tile",
      typeId: "test-tile",
      home: {
        type: "board",
        boardId: "board",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
});

/** A complete table for collector-domain tests, consumed by real table queries. */
export function createInputTestState() {
  const table = inputDefinitions.createInitialTable({
    playerIds: ["player-1", "player-2"],
  });
  table.zones.hand[asPlayerId("player-1")] = ["card-a", "card-b"];
  for (const id of ["card-a", "card-b"] as const) {
    table.ownerOfCard[id] = "player-1";
    table.visibility[id] = { faceUp: true };
    table.componentLocations[id] = {
      type: "InZone",
      zoneId: "hand",
      hostId: "player-1",
      playedBy: null,
    };
  }
  return { table, flow: { currentPhase: "play" } };
}
