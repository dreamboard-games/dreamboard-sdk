import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const SUSHI_CARD_SET = "sushi-cards";
const ALL_SETS: Array<typeof SUSHI_CARD_SET> = [SUSHI_CARD_SET];

export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 5,
    optimalPlayers: 4,
  },

  cardSets: [
    {
      type: "manual",
      id: SUSHI_CARD_SET,
      name: "Draft Feast Cards",
      defaultHome: { type: "zone", zoneId: "draw-pile" },
      cardSchema: {
        shared: {
          category: {
            type: "enum",
            enums: [
              "nigiri",
              "wasabi",
              "tempura",
              "sashimi",
              "dumpling",
              "maki",
              "pudding",
              "chopsticks",
            ],
          },
        },
        variants: {
          "nigiri-egg": {
            properties: {
              nigiriPoints: { type: "integer" },
            },
          },
          "nigiri-salmon": {
            properties: {
              nigiriPoints: { type: "integer" },
            },
          },
          "nigiri-squid": {
            properties: {
              nigiriPoints: { type: "integer" },
            },
          },
          wasabi: { properties: {} },
          tempura: { properties: {} },
          sashimi: { properties: {} },
          dumpling: { properties: {} },
          "maki-1": {
            properties: {
              makiIcons: { type: "integer" },
            },
          },
          "maki-2": {
            properties: {
              makiIcons: { type: "integer" },
            },
          },
          "maki-3": {
            properties: {
              makiIcons: { type: "integer" },
            },
          },
          pudding: { properties: {} },
          chopsticks: { properties: {} },
        },
      },
      cards: [
        {
          type: "nigiri-egg",
          name: "Egg Nigiri",
          count: 6,
          properties: { category: "nigiri", nigiriPoints: 1 },
        },
        {
          type: "nigiri-salmon",
          name: "Salmon Nigiri",
          count: 10,
          properties: { category: "nigiri", nigiriPoints: 2 },
        },
        {
          type: "nigiri-squid",
          name: "Squid Nigiri",
          count: 5,
          properties: { category: "nigiri", nigiriPoints: 3 },
        },
        {
          type: "wasabi",
          name: "Wasabi",
          count: 6,
          properties: { category: "wasabi" },
        },
        {
          type: "tempura",
          name: "Tempura",
          count: 14,
          properties: { category: "tempura" },
        },
        {
          type: "sashimi",
          name: "Sashimi",
          count: 14,
          properties: { category: "sashimi" },
        },
        {
          type: "dumpling",
          name: "Dumpling",
          count: 14,
          properties: { category: "dumpling" },
        },
        {
          type: "maki-1",
          name: "Maki Roll (1)",
          count: 6,
          properties: { category: "maki", makiIcons: 1 },
        },
        {
          type: "maki-2",
          name: "Maki Roll (2)",
          count: 6,
          properties: { category: "maki", makiIcons: 2 },
        },
        {
          type: "maki-3",
          name: "Maki Roll (3)",
          count: 6,
          properties: { category: "maki", makiIcons: 3 },
        },
        {
          type: "pudding",
          name: "Pudding",
          count: 10,
          properties: { category: "pudding" },
        },
        {
          type: "chopsticks",
          name: "Chopsticks",
          count: 4,
          properties: { category: "chopsticks" },
        },
      ],
    },
  ],

  zones: [
    {
      id: "draw-pile",
      name: "Draw Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "ownerOnly",
    },
    {
      id: "played",
      name: "Played",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "pudding",
      name: "Pudding",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "round-discard",
      name: "Round Discard",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
  ],

  boardTemplates: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [
    {
      id: "default-game",
      name: "Standard game",
      description: "Full drafting deck with three scoring rounds.",
      choices: [{ id: "default-game", label: "Standard game" }],
    },
  ],
  setupProfiles: [
    {
      id: "default-setup",
      name: "Default setup",
      optionValues: { "default-game": "default-game" },
    },
  ],
});
