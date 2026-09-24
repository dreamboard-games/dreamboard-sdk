import { defineTopologyManifest } from "../src/reducer/manifest/authoring.js";

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  cardSets: [
    {
      type: "manual",
      id: "typed-cards",
      name: "Typed Cards",
      defaultHome: { type: "detached" },
      cardSchema: {
        properties: {
          label: { type: "string" },
          coins: { type: "integer" },
          weight: { type: "number", optional: true },
          enabled: { type: "boolean", optional: true },
          role: { type: "enum", enums: ["treasure", "victory"] },
        },
      },
      cards: [
        {
          type: "copper",
          name: "Copper",
          count: 60,
          properties: {
            label: "Copper",
            coins: 1,
            enabled: true,
            role: "treasure",
          },
        },
        {
          type: "estate",
          name: "Estate",
          count: 24,
          properties: {
            label: "Estate",
            coins: 0,
            weight: 0.5,
            role: "victory",
          },
        },
      ],
    },
  ],
  zones: [
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["typed-cards"],
      visibility: "ownerOnly",
    },
  ],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
});

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  // @ts-expect-error -- `vp` is required by the schema and missing from the seed.
  cardSets: [
    {
      type: "manual",
      id: "missing-required-property",
      name: "Missing Required Property",
      defaultHome: { type: "detached" },
      cardSchema: {
        properties: {
          coins: { type: "integer" },
          vp: { type: "integer" },
          cost: { type: "number", optional: true },
        },
      },
      cards: [
        {
          type: "copper",
          name: "Copper",
          count: 60,
          properties: { coins: 1, cost: 0 },
        },
      ],
    },
  ],
  zones: [
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["missing-required-property"],
      visibility: "ownerOnly",
    },
  ],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
});

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  cardSets: [
    {
      type: "manual",
      id: "variant-cards",
      name: "Variant Cards",
      defaultHome: { type: "detached" },
      cardSchema: {
        shared: {
          cost: { type: "integer" },
        },
        variants: {
          copper: {
            properties: {
              coins: { type: "integer" },
            },
          },
          "ranked-card": {
            properties: {
              vp: { type: "integer" },
            },
          },
        },
      },
      cards: [
        {
          type: "copper",
          name: "Copper",
          count: 60,
          properties: { coins: 1, cost: 0 },
        },
        {
          type: "estate",
          cardType: "ranked-card",
          name: "Estate",
          count: 24,
          properties: { vp: 1, cost: 2 },
        },
      ],
    },
  ],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
});

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  cardSets: [
    {
      type: "manual",
      id: "defaulted-card-properties",
      name: "Defaulted Card Properties",
      defaultHome: { type: "detached" },
      cardSchema: {
        shared: {
          cost: { type: "integer", optional: true, default: 0 },
        },
        variants: {
          copper: {
            properties: {
              coins: { type: "integer" },
            },
          },
        },
      },
      cards: [
        {
          type: "copper",
          name: "Copper",
          count: 60,
          properties: { coins: 1 },
        },
      ],
    },
  ],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
});

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  // @ts-expect-error -- `coins` is required for the copper variant.
  cardSets: [
    {
      type: "manual",
      id: "variant-missing-required-property",
      name: "Variant Missing Required Property",
      defaultHome: { type: "detached" },
      cardSchema: {
        variants: {
          copper: {
            properties: {
              coins: { type: "integer" },
            },
          },
        },
      },
      cards: [
        {
          type: "copper",
          name: "Copper",
          count: 60,
          properties: {},
        },
      ],
    },
  ],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
});
