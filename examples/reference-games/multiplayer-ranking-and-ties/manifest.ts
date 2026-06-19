import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const HARBOR_CARD_SET = "harbor-fair-cards";
const ALL_SETS: Array<typeof HARBOR_CARD_SET> = [HARBOR_CARD_SET];

const guilds = ["food", "craft", "music"] as const;
const cardRecipe = [
  { prestige: 1, coins: 1, count: 2 },
  { prestige: 2, coins: 0, count: 4 },
  { prestige: 2, coins: 1, count: 2 },
  { prestige: 3, coins: 0, count: 2 },
] as const;

const stallCards = guilds.flatMap((guild) =>
  cardRecipe.map(({ prestige, coins, count }) => ({
    type: `${guild}-p${prestige}-c${coins}` as const,
    name: `${guild} stall ${prestige}/${coins}`,
    count,
    properties: { kind: "stall" as const, guild, prestige, coins },
  })),
);

export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 4,
  },
  cardSets: [
    {
      type: "manual",
      id: HARBOR_CARD_SET,
      name: "Harbor Fair Cards",
      defaultHome: { type: "zone", zoneId: "draw-pile" },
      cardSchema: {
        shared: {
          kind: { type: "enum", enums: ["stall", "storm"] },
        },
        variants: {
          "food-p1-c1": {
            properties: {
              guild: { type: "enum", enums: ["food"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "food-p2-c0": {
            properties: {
              guild: { type: "enum", enums: ["food"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "food-p2-c1": {
            properties: {
              guild: { type: "enum", enums: ["food"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "food-p3-c0": {
            properties: {
              guild: { type: "enum", enums: ["food"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "craft-p1-c1": {
            properties: {
              guild: { type: "enum", enums: ["craft"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "craft-p2-c0": {
            properties: {
              guild: { type: "enum", enums: ["craft"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "craft-p2-c1": {
            properties: {
              guild: { type: "enum", enums: ["craft"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "craft-p3-c0": {
            properties: {
              guild: { type: "enum", enums: ["craft"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "music-p1-c1": {
            properties: {
              guild: { type: "enum", enums: ["music"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "music-p2-c0": {
            properties: {
              guild: { type: "enum", enums: ["music"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "music-p2-c1": {
            properties: {
              guild: { type: "enum", enums: ["music"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          "music-p3-c0": {
            properties: {
              guild: { type: "enum", enums: ["music"] },
              prestige: { type: "integer" },
              coins: { type: "integer" },
            },
          },
          storm: { properties: {} },
        },
      },
      cards: [
        ...stallCards,
        {
          type: "storm",
          name: "Storm",
          count: 2,
          properties: { kind: "storm" },
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
      id: "market",
      name: "Market",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "storm-discard",
      name: "Storm Discard",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "festival-row",
      name: "Festival Row",
      scope: "perPlayer",
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
  setupOptions: [],
  setupProfiles: [
    {
      id: "standard",
      name: "Standard Harbor Fair",
      description: "Two to four players draft stalls for six rounds.",
    },
  ],
});
