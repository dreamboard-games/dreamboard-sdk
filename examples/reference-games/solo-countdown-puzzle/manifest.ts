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
      name: "Coastal Beacons",
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
      name: "Standard watch",
      description: "One keeper begins a seeded eight-turn lighthouse watch.",
      guidance: {
        summary:
          "Charge, repair, or reinforce once per turn; then weather and countdown resolve automatically.",
        steps: [
          {
            id: "keeper-action",
            label: "Choose one keeper action",
            description:
              "Gain two energy, spend one to repair a beacon stage, or spend two to store one reinforcement.",
          },
          {
            id: "weather",
            label: "Resolve weather",
            description:
              "Reveal the next seeded card; reinforcement prevents one entire Gale or Squall.",
          },
          {
            id: "countdown",
            label: "Advance countdown",
            description:
              "If the storm has not reached six, dawn advances by one turn.",
          },
        ],
      },
    },
  ],
});
