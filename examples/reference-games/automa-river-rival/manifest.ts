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
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "River Guild setup",
      description:
        "One human player shares a public river with a deterministic rival deck.",
    },
  ],
});
