export const cardSets = [
  {
    type: "manual",
    id: "charter-cards",
    name: "Charter Cards",
    defaultHome: { type: "zone", zoneId: "charter-deck" },
    cardSchema: {
      properties: {
        cardType: {
          type: "enum",
          enums: [
            "scout",
            "shortcut",
            "surveyGrant",
            "claimMarker",
            "landmark",
          ],
        },
      },
    },
    cards: [
      {
        type: "scout",
        name: "Scout",
        count: 14,
        properties: { cardType: "scout" },
      },
      {
        type: "shortcut",
        name: "Shortcut",
        count: 2,
        properties: { cardType: "shortcut" },
      },
      {
        type: "surveyGrant",
        name: "Survey Grant",
        count: 2,
        properties: { cardType: "surveyGrant" },
      },
      {
        type: "claimMarker",
        name: "Claim Marker",
        count: 2,
        properties: { cardType: "claimMarker" },
      },
      {
        type: "landmark",
        name: "Landmark",
        count: 5,
        properties: { cardType: "landmark" },
      },
    ],
  },
] as const;

export const zones = [
  // Shared charter card deck
  {
    id: "charter-deck",
    name: "Charter Card Deck",
    scope: "shared",
    allowedCardSetIds: ["charter-cards"],
    visibility: "hidden",
  },
  // Per-player charter card hand (private)
  {
    id: "charter-hand",
    name: "Charter Card Hand",
    scope: "perPlayer",
    allowedCardSetIds: ["charter-cards"],
    visibility: "ownerOnly",
  },
  // Shared played charter cards discard pile (public)
  {
    id: "charter-played",
    name: "Played Charter Cards",
    scope: "shared",
    allowedCardSetIds: ["charter-cards"],
    visibility: "public",
  },
] as const;
