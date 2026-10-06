import { z } from "zod";
import { defineTopologyManifest } from "../src/reducer/manifest/authoring.js";

defineTopologyManifest({
  players: { minPlayers: 2, maxPlayers: 2, optimalPlayers: 2 },
  cardSets: [
    {
      id: "typed-cards",
      name: "Typed Cards",
      defaultHome: { type: "detached" },
      cardSchema: z.object({
        label: z.string(),
        coins: z.number().int(),
        weight: z.number().optional(),
        enabled: z.boolean().optional(),
        role: z.enum(["treasure", "victory"]),
      }),
      cards: [
        {
          id: "copper",
          cardType: "copper",
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
          id: "estate",
          cardType: "estate",
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
      id: "missing-required-property",
      name: "Missing Required Property",
      defaultHome: { type: "detached" },
      cardSchema: z.object({
        coins: z.number().int(),
        vp: z.number().int(),
        cost: z.number().optional(),
      }),
      cards: [
        {
          id: "copper",
          cardType: "copper",
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
      id: "variant-cards",
      name: "Variant Cards",
      defaultHome: { type: "detached" },
      cardSchema: {
        byCardType: {
          copper: z
            .object({ cost: z.number().int() })
            .extend({ coins: z.number().int() }),
          "ranked-card": z
            .object({ cost: z.number().int() })
            .extend({ vp: z.number().int() }),
        },
      },
      cards: [
        {
          id: "copper",
          cardType: "copper",
          name: "Copper",
          count: 60,
          properties: { coins: 1, cost: 0 },
        },
        {
          id: "estate",
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
      id: "defaulted-card-properties",
      name: "Defaulted Card Properties",
      defaultHome: { type: "detached" },
      cardSchema: {
        byCardType: {
          copper: z
            .object({ cost: z.number().int().optional().default(0) })
            .extend({ coins: z.number().int() }),
        },
      },
      cards: [
        {
          id: "copper",
          cardType: "copper",
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
      id: "variant-missing-required-property",
      name: "Variant Missing Required Property",
      defaultHome: { type: "detached" },
      cardSchema: {
        byCardType: { copper: z.object({ coins: z.number().int() }) },
      },
      cards: [
        {
          id: "copper",
          cardType: "copper",
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
