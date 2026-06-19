import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const SKETCHBOOK_CARD_SET = "sketchbook-cards";
const ALL_SETS: Array<typeof SKETCHBOOK_CARD_SET> = [SKETCHBOOK_CARD_SET];

// Sketchbook uses one cardSet with per-card-type property schemas. Each card
// type declares its supply pile as its authored `home`, while all player zones
// accept the shared cardSet so gained cards can move freely through decks,
// hands, in-play, and discard.
export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },

  cardSets: [
    {
      type: "manual",
      id: SKETCHBOOK_CARD_SET,
      name: "Sketchbook Cards",
      defaultHome: { type: "zone", zoneId: "supply-doodle" },
      cardSchema: {
        shared: {
          cost: { type: "integer" },
        },
        variants: {
          doodle: {
            properties: {
              coins: { type: "integer" },
            },
          },
          sketch: {
            properties: {
              coins: { type: "integer" },
            },
          },
          inkwork: {
            properties: {
              coins: { type: "integer" },
            },
          },
          idea: {
            properties: {
              vp: { type: "integer" },
            },
          },
          concept: {
            properties: {
              vp: { type: "integer" },
            },
          },
          masterpiece: {
            properties: {
              vp: { type: "integer" },
            },
          },
          smudge: {
            properties: {
              vp: { type: "integer" },
            },
          },
          brainstorm: { properties: {} },
          studio: { properties: {} },
          gallery: { properties: {} },
          "open-mic": { properties: {} },
          critic: { properties: {} },
          eraser: { properties: {} },
          sketchpad: { properties: {} },
          "studio-visit": { properties: {} },
        },
      },
      cards: [
        {
          type: "doodle",
          name: "Doodle",
          count: 60,
          home: { type: "zone", zoneId: "supply-doodle" },
          properties: { coins: 1, cost: 0 },
        },
        {
          type: "sketch",
          name: "Sketch",
          count: 40,
          home: { type: "zone", zoneId: "supply-sketch" },
          properties: { coins: 2, cost: 3 },
        },
        {
          type: "inkwork",
          name: "Inkwork",
          count: 30,
          home: { type: "zone", zoneId: "supply-inkwork" },
          properties: { coins: 3, cost: 6 },
        },
        {
          type: "idea",
          name: "Idea",
          count: 8,
          home: { type: "zone", zoneId: "supply-idea" },
          properties: { vp: 1, cost: 2 },
        },
        {
          type: "concept",
          name: "Concept",
          count: 8,
          home: { type: "zone", zoneId: "supply-concept" },
          properties: { vp: 3, cost: 5 },
        },
        {
          type: "masterpiece",
          name: "Masterpiece",
          count: 8,
          home: { type: "zone", zoneId: "supply-masterpiece" },
          properties: { vp: 6, cost: 8 },
        },
        {
          type: "smudge",
          name: "Smudge",
          count: 10,
          home: { type: "zone", zoneId: "supply-smudge" },
          properties: { vp: -1, cost: 0 },
        },
        {
          type: "brainstorm",
          name: "Brainstorm",
          count: 7,
          home: { type: "zone", zoneId: "supply-brainstorm" },
          properties: { cost: 4 },
        },
        {
          type: "studio",
          name: "Studio",
          count: 7,
          home: { type: "zone", zoneId: "supply-studio" },
          properties: { cost: 3 },
        },
        {
          type: "gallery",
          name: "Gallery",
          count: 7,
          home: { type: "zone", zoneId: "supply-gallery" },
          properties: { cost: 5 },
        },
        {
          type: "open-mic",
          name: "Open Mic",
          count: 7,
          home: { type: "zone", zoneId: "supply-open-mic" },
          properties: { cost: 5 },
        },
        {
          type: "critic",
          name: "Critic",
          count: 7,
          home: { type: "zone", zoneId: "supply-critic" },
          properties: { cost: 5 },
        },
        {
          type: "eraser",
          name: "Eraser",
          count: 7,
          home: { type: "zone", zoneId: "supply-eraser" },
          properties: { cost: 2 },
        },
        {
          type: "sketchpad",
          name: "Sketchpad",
          count: 7,
          home: { type: "zone", zoneId: "supply-sketchpad" },
          properties: { cost: 2 },
        },
        {
          type: "studio-visit",
          name: "Studio Visit",
          count: 7,
          home: { type: "zone", zoneId: "supply-studio-visit" },
          properties: { cost: 3 },
        },
      ],
    },
  ],

  zones: [
    // ── Per-player zones ──
    // Each accepts every cardSet so gained cards from any pile can land
    // here.
    {
      id: "deck",
      name: "Deck",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "ownerOnly",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "ownerOnly",
    },
    {
      id: "in-play",
      name: "In Play",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "discard",
      name: "Discard Pile",
      scope: "perPlayer",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },

    // ── Shared supply piles ──
    // Each pile accepts the shared cardSet; individual cards are seeded
    // to their pile by the card's authored `home`.
    {
      id: "supply-doodle",
      name: "Doodle Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-sketch",
      name: "Sketch Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-inkwork",
      name: "Inkwork Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-idea",
      name: "Idea Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-concept",
      name: "Concept Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-masterpiece",
      name: "Masterpiece Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-smudge",
      name: "Smudge Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-brainstorm",
      name: "Brainstorm Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-studio",
      name: "Studio Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-gallery",
      name: "Gallery Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-open-mic",
      name: "Open Mic Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-critic",
      name: "Critic Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-eraser",
      name: "Eraser Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-sketchpad",
      name: "Sketchpad Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },
    {
      id: "supply-studio-visit",
      name: "Studio Visit Pile",
      scope: "shared",
      allowedCardSetIds: ALL_SETS,
      visibility: "public",
    },

    {
      id: "trash",
      name: "Wastebasket",
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
      name: "Default game",
      description: "Two-player Sketchbook with the standard kingdom.",
      choices: [{ id: "default-game", label: "Default game" }],
    },
  ],
  setupProfiles: [
    {
      id: "default-setup",
      name: "Default setup",
      optionValues: { "default-game": "default-game" },
    },
    {
      id: "empty-masterpiece-regression",
      name: "Empty Masterpiece regression",
      description:
        "Reducer-test profile that starts with the Masterpiece pile depleted before the next end-turn boundary.",
      optionValues: { "default-game": "default-game" },
    },
  ],
});
