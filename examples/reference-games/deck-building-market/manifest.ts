import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const CARD_SET_ID = "sketchbook-cards";
const ALL_CARDS = [CARD_SET_ID] as const;

const cards = [
  {
    type: "doodle",
    name: "Doodle",
    count: 44,
    home: { type: "zone", zoneId: "supply-doodle" },
    properties: { cost: 0, inspiration: 1 },
  },
  {
    type: "sketch",
    name: "Sketch",
    count: 20,
    home: { type: "zone", zoneId: "supply-sketch" },
    properties: { cost: 3, inspiration: 2 },
  },
  {
    type: "inkwork",
    name: "Inkwork",
    count: 12,
    home: { type: "zone", zoneId: "supply-inkwork" },
    properties: { cost: 6, inspiration: 3 },
  },
  {
    type: "idea",
    name: "Idea",
    count: 14,
    home: { type: "zone", zoneId: "supply-idea" },
    properties: { cost: 2, portfolioValue: 1 },
  },
  {
    type: "concept",
    name: "Concept",
    count: 8,
    home: { type: "zone", zoneId: "supply-concept" },
    properties: { cost: 5, portfolioValue: 3 },
  },
  {
    type: "masterpiece",
    name: "Masterpiece",
    count: 8,
    home: { type: "zone", zoneId: "supply-masterpiece" },
    properties: { cost: 8, portfolioValue: 6 },
  },
  {
    type: "brainstorm",
    name: "Brainstorm",
    count: 8,
    home: { type: "zone", zoneId: "supply-brainstorm" },
    properties: { cost: 4 },
  },
  {
    type: "studio",
    name: "Studio",
    count: 8,
    home: { type: "zone", zoneId: "supply-studio" },
    properties: { cost: 3 },
  },
  {
    type: "gallery",
    name: "Gallery",
    count: 8,
    home: { type: "zone", zoneId: "supply-gallery" },
    properties: { cost: 5 },
  },
  {
    type: "eraser",
    name: "Eraser",
    count: 8,
    home: { type: "zone", zoneId: "supply-eraser" },
    properties: { cost: 2 },
  },
  {
    type: "studio-visit",
    name: "Studio Visit",
    count: 8,
    home: { type: "zone", zoneId: "supply-studio-visit" },
    properties: { cost: 4 },
  },
] as const;

const supplyZones = cards.map((card) => ({
  id: card.home.zoneId,
  name: `${card.name} Supply`,
  scope: "shared" as const,
  allowedCardSetIds: ALL_CARDS,
  visibility: "public" as const,
}));

export default defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  cardSets: [
    {
      type: "manual",
      id: CARD_SET_ID,
      name: "Sketchbook Cards",
      defaultHome: { type: "zone", zoneId: "supply-doodle" },
      cardSchema: {
        shared: { cost: { type: "integer" } },
        variants: {
          doodle: { properties: { inspiration: { type: "integer" } } },
          sketch: { properties: { inspiration: { type: "integer" } } },
          inkwork: { properties: { inspiration: { type: "integer" } } },
          idea: { properties: { portfolioValue: { type: "integer" } } },
          concept: { properties: { portfolioValue: { type: "integer" } } },
          masterpiece: {
            properties: { portfolioValue: { type: "integer" } },
          },
          brainstorm: { properties: {} },
          studio: { properties: {} },
          gallery: { properties: {} },
          eraser: { properties: {} },
          "studio-visit": { properties: {} },
        },
      },
      cards,
    },
  ],
  zones: [
    {
      id: "deck",
      name: "Draw Deck",
      scope: "perPlayer",
      allowedCardSetIds: ALL_CARDS,
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ALL_CARDS,
      visibility: "ownerOnly",
    },
    {
      id: "in-play",
      name: "In Play",
      scope: "perPlayer",
      allowedCardSetIds: ALL_CARDS,
      visibility: "public",
    },
    {
      id: "discard",
      name: "Discard",
      scope: "perPlayer",
      allowedCardSetIds: ALL_CARDS,
      visibility: "public",
    },
    ...supplyZones,
    {
      id: "trash",
      name: "Wastebasket",
      scope: "shared",
      allowedCardSetIds: ALL_CARDS,
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
  setupProfiles: [],
});
