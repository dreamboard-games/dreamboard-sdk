import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

export default defineTopologyManifest({
  players: {
    minPlayers: 1,
    maxPlayers: 1,
    optimalPlayers: 1,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [],
  boards: [
    {
      id: "beacon-grid",
      name: "Beacon Grid",
      layout: "square",
      typeId: "beacon-grid",
      scope: "shared",
      spaces: [
        { id: "empty-nw", row: 0, col: 0 },
        {
          id: "beacon-north",
          row: 0,
          col: 1,
          typeId: "beacon",
          label: "North Beacon",
        },
        { id: "empty-ne", row: 0, col: 2 },
        { id: "empty-west", row: 1, col: 0 },
        {
          id: "beacon-harbor",
          row: 1,
          col: 1,
          typeId: "beacon",
          label: "Harbor Beacon",
        },
        { id: "empty-east", row: 1, col: 2 },
        { id: "empty-sw", row: 2, col: 0 },
        {
          id: "beacon-south",
          row: 2,
          col: 1,
          typeId: "beacon",
          label: "South Beacon",
        },
        { id: "empty-se", row: 2, col: 2 },
      ],
    },
  ],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "Standard",
      description: "Solo Last Light setup with deterministic weather.",
      guidance: {
        summary: "Repair all three beacons before storm or countdown defeat.",
        steps: [
          {
            id: "repair",
            label: "Repair a beacon",
            description: "Spend one energy and raise a beacon by one level.",
          },
          {
            id: "weather",
            label: "Resolve weather",
            description: "Reveal the next deterministic weather card.",
          },
          {
            id: "countdown",
            label: "Advance countdown",
            description: "Lose if the countdown reaches zero.",
          },
        ],
      },
    },
  ],
});
