import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const surveySpaces = [
  [2, 5, 8, 11],
  [6, 9, 3, 7],
  [10, 4, 12, 6],
  [7, 11, 5, 9],
].flatMap((rowTargets, row) =>
  rowTargets.map((target, col) => ({
    id: `cell-${row}-${col}`,
    row,
    col,
    typeId: "survey-cell",
    fields: { target },
  })),
);

export default defineTopologyManifest({
  players: {
    minPlayers: 1,
    maxPlayers: 4,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [
    {
      id: "survey-grid-template",
      name: "Survey Grid Template",
      layout: "square",
      spaceFieldsSchema: {
        properties: {
          target: { type: "integer" },
        },
      },
      spaces: surveySpaces,
    },
  ],
  boards: [
    {
      id: "survey-grid",
      name: "Survey Grid",
      layout: "square",
      scope: "perPlayer",
      templateId: "survey-grid-template",
    },
  ],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [
    {
      id: "survey-die",
      name: "Survey Die",
      sides: 6,
    },
  ],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "Standard Cloudline Survey",
      description: "Two-player teaching setup with eight seeded shared rolls.",
      guidance: {
        summary: "Prepare one scorecard per player and the seeded dice list.",
        steps: [
          {
            id: "prepare-scorecards",
            label: "Prepare player scorecards",
            description: "Give each player a private 4 by 4 survey grid.",
          },
          {
            id: "prepare-dice",
            label: "Prepare dice",
            description: "Use the seeded two-die roll list for all rounds.",
          },
        ],
      },
    },
  ],
});
