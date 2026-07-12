import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const CARGO_CARDS = "river-cargo";
const RIVAL_INSTRUCTIONS = "rival-instructions";
const CARGO_SETS: Array<typeof CARGO_CARDS> = [CARGO_CARDS];
const INSTRUCTION_SETS: Array<typeof RIVAL_INSTRUCTIONS> = [RIVAL_INSTRUCTIONS];

const cargoKinds = ["timber", "grain", "ore"] as const;
const cargoRecipe = [
  { value: 1, count: 2 },
  { value: 2, count: 3 },
  { value: 3, count: 3 },
] as const;

const cargoCards = cargoKinds.flatMap((cargoKind) =>
  cargoRecipe.map(({ value, count }) => ({
    type: `${cargoKind}-${value}` as const,
    name: `${cargoKind} ${value}`,
    count,
    properties: { cargoKind, value },
  })),
);

export default defineTopologyManifest({
  players: {
    minPlayers: 1,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [
    {
      type: "manual",
      id: CARGO_CARDS,
      name: "River Cargo",
      defaultHome: { type: "zone", zoneId: "cargo-deck" },
      cardSchema: {
        shared: {
          cargoKind: {
            type: "enum",
            enums: ["timber", "grain", "ore"],
          },
          value: { type: "integer" },
        },
        variants: {
          "timber-1": { properties: {} },
          "timber-2": { properties: {} },
          "timber-3": { properties: {} },
          "grain-1": { properties: {} },
          "grain-2": { properties: {} },
          "grain-3": { properties: {} },
          "ore-1": { properties: {} },
          "ore-2": { properties: {} },
          "ore-3": { properties: {} },
        },
      },
      cards: cargoCards,
    },
    {
      type: "manual",
      id: RIVAL_INSTRUCTIONS,
      name: "Rival Standing Orders",
      defaultHome: { type: "zone", zoneId: "instruction-deck" },
      cardSchema: {
        shared: {
          instructionKind: {
            type: "enum",
            enums: ["claimHighest", "claimKind", "sweepLeft"],
          },
        },
        variants: {
          "claim-highest": { properties: {} },
          "claim-kind-timber": {
            properties: {
              cargoKind: { type: "enum", enums: ["timber"] },
            },
          },
          "claim-kind-grain": {
            properties: {
              cargoKind: { type: "enum", enums: ["grain"] },
            },
          },
          "claim-kind-ore": {
            properties: {
              cargoKind: { type: "enum", enums: ["ore"] },
            },
          },
          "sweep-left": { properties: {} },
        },
      },
      cards: [
        {
          type: "claim-highest",
          name: "Claim Highest",
          count: 2,
          properties: { instructionKind: "claimHighest" },
        },
        {
          type: "claim-kind-timber",
          name: "Claim Timber",
          count: 1,
          properties: {
            instructionKind: "claimKind",
            cargoKind: "timber",
          },
        },
        {
          type: "claim-kind-grain",
          name: "Claim Grain",
          count: 1,
          properties: {
            instructionKind: "claimKind",
            cargoKind: "grain",
          },
        },
        {
          type: "claim-kind-ore",
          name: "Claim Ore",
          count: 1,
          properties: {
            instructionKind: "claimKind",
            cargoKind: "ore",
          },
        },
        {
          type: "sweep-left",
          name: "Sweep Left",
          count: 1,
          properties: { instructionKind: "sweepLeft" },
        },
      ],
    },
  ],
  zones: [
    {
      id: "cargo-deck",
      name: "Cargo Deck",
      scope: "shared",
      allowedCardSetIds: CARGO_SETS,
      visibility: "hidden",
    },
    {
      id: "river",
      name: "River",
      scope: "shared",
      allowedCardSetIds: CARGO_SETS,
      visibility: "public",
    },
    {
      id: "human-cargo",
      name: "Cooperative Warehouse",
      scope: "perPlayer",
      allowedCardSetIds: CARGO_SETS,
      visibility: "public",
    },
    {
      id: "rival-claimed",
      name: "Rival Claimed Cargo",
      scope: "shared",
      allowedCardSetIds: CARGO_SETS,
      visibility: "public",
    },
    {
      id: "rival-discarded",
      name: "Rival Discarded Cargo",
      scope: "shared",
      allowedCardSetIds: CARGO_SETS,
      visibility: "public",
    },
    {
      id: "instruction-deck",
      name: "Rival Instruction Deck",
      scope: "shared",
      allowedCardSetIds: INSTRUCTION_SETS,
      visibility: "hidden",
    },
    {
      id: "instruction-history",
      name: "Revealed Rival Instructions",
      scope: "shared",
      allowedCardSetIds: INSTRUCTION_SETS,
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
      name: "Standard River Guild",
      description:
        "Shuffle both decks, deal four public cargo cards, and start six cooperative rounds.",
      guidance: {
        summary:
          "Shuffle cargo and standing orders independently, then deal the river left to right.",
        steps: [
          {
            id: "shuffle-decks",
            label: "Shuffle both decks",
            description:
              "Trusted seeded entropy fixes the cargo and instruction order for the full game.",
          },
          {
            id: "deal-river",
            label: "Deal four cargo cards",
            description:
              "Place the first four cargo cards left to right in the public river.",
          },
        ],
      },
    },
  ],
});
