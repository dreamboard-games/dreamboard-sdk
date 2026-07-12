import { defineTopologyManifest } from "@dreamboard-games/sdk/types";

const MARKET_CARD_SET = "market-cards";
const MARKET_CARD_SETS: Array<typeof MARKET_CARD_SET> = [MARKET_CARD_SET];

export default defineTopologyManifest({
  players: {
    minPlayers: 2,
    maxPlayers: 5,
    optimalPlayers: 4,
  },
  cardSets: [
    {
      type: "manual",
      id: MARKET_CARD_SET,
      name: "Lantern Market Cards",
      defaultHome: { type: "zone", zoneId: "market-deck" },
      cardSchema: {
        shared: {
          family: {
            type: "enum",
            enums: ["lantern", "tea-cup", "festival-banner"],
          },
        },
        variants: {
          lantern: { properties: {} },
          "tea-cup": { properties: {} },
          "festival-banner": { properties: {} },
        },
      },
      cards: [
        {
          type: "lantern",
          name: "Lantern",
          count: 20,
          properties: { family: "lantern" },
        },
        {
          type: "tea-cup",
          name: "Tea Cup",
          count: 20,
          properties: { family: "tea-cup" },
        },
        {
          type: "festival-banner",
          name: "Festival Banner",
          count: 20,
          properties: { family: "festival-banner" },
        },
      ],
    },
  ],
  zones: [
    {
      id: "market-deck",
      name: "Market Deck",
      scope: "shared",
      allowedCardSetIds: MARKET_CARD_SETS,
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: MARKET_CARD_SETS,
      visibility: "ownerOnly",
    },
    {
      id: "stall",
      name: "Festival Stall",
      scope: "perPlayer",
      allowedCardSetIds: MARKET_CARD_SETS,
      visibility: "public",
    },
    {
      id: "scored-history",
      name: "Scored Card History",
      scope: "perPlayer",
      allowedCardSetIds: MARKET_CARD_SETS,
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
      name: "Standard Lantern Market",
      description:
        "Shuffle the sixty-card market deck once and deal two six-pick rounds.",
      guidance: {
        summary:
          "Shuffle the market deck once, then deal six private cards to every stall owner in seat order.",
        steps: [
          {
            id: "shuffle-market-deck",
            label: "Shuffle the market deck",
            description:
              "Use the scenario seed once; the remaining order supplies both rounds.",
          },
          {
            id: "deal-round-one",
            label: "Deal round one",
            description:
              "Deal one card per seat repeatedly until every player has six.",
          },
        ],
      },
    },
  ],
});
