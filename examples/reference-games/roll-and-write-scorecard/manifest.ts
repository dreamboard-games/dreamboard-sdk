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
      description:
        "Prepare public survey grids for every crew before the first seeded weather reading.",
      guidance: {
        summary:
          "Prepare one public field notebook per crew and calibrate the shared weather dice.",
        steps: [
          {
            id: "prepare-scorecards",
            label: "Prepare survey grids",
            description: "Give each crew the same public 4 by 4 target layout.",
          },
          {
            id: "prepare-dice",
            label: "Calibrate weather instruments",
            description:
              "Use the seeded random source to roll two six-sided dice in each round.",
          },
        ],
      },
    },
  ],
});
