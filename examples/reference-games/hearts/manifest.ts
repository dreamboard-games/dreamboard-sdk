import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const SUITS = ["clubs", "diamonds", "spades", "hearts"] as const;
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

const cards = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    type: `${suit}-${rank}`,
    name: `${rank} of ${suit}`,
    count: 1,
    properties: { suit, rank },
  })),
);

export default defineTopologyManifest({
  players: {
    minPlayers: 4,
    maxPlayers: 4,
    optimalPlayers: 4,
  },
  cardSets: [
    {
      type: "manual",
      id: "playing-cards",
      name: "Playing Cards",
      defaultHome: { type: "zone", zoneId: "draw-pile" },
      cardSchema: {
        properties: {
          suit: { type: "enum", enums: [...SUITS] },
          rank: { type: "enum", enums: [...RANKS] },
        },
      },
      cards,
    },
  ],
  zones: [
    {
      id: "draw-pile",
      name: "Draw Pile",
      scope: "shared",
      allowedCardSetIds: ["playing-cards"],
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["playing-cards"],
      visibility: "ownerOnly",
    },
    {
      id: "current-trick",
      name: "Current Trick",
      scope: "shared",
      allowedCardSetIds: ["playing-cards"],
      visibility: "public",
    },
    {
      id: "discard",
      name: "Discard",
      scope: "shared",
      allowedCardSetIds: ["playing-cards"],
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
      id: "default",
      name: "Default",
      description: "Standard 4-player Hearts setup.",
    },
  ],
});
