import type {
  BoardCard,
  GameTopologyManifest,
  ManualCardSetDefinition,
  ObjectSchema,
  PresetCardSetDefinition,
  PropertySchema,
} from "@dreamboard-games/sdk-types";

const STANDARD_DECK_ID = "standard_52_deck";

function createEnumPropertySchema(
  enums: string[],
  description: string,
): PropertySchema {
  return {
    type: "enum",
    description,
    enums,
  };
}

function createStringPropertySchema(description: string): PropertySchema {
  return {
    type: "string",
    description,
  };
}

export function createStandard52CardDeck(): ManualCardSetDefinition {
  const suits = ["SPADES", "HEARTS", "CLUBS", "DIAMONDS"];
  const ranks = [
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
    "2",
  ];

  const cards: BoardCard[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({
        type: `${suit}_${rank}`,
        name: `${rank} of ${suit}`,
        imageUrl: `/cards/${suit.toLowerCase()}_${rank.toLowerCase()}.png`,
        text: `A playing card: ${rank} of ${suit}. Value: ${getBigTwoCardValue(rank)}, Suit value: ${getSuitValue(suit)}`,
        count: 1,
        cardType: `${suit}_${rank}`,
        properties: {
          suit,
          rank,
        },
      });
    }
  }

  return {
    id: STANDARD_DECK_ID,
    name: "Standard 52-Card Deck",
    type: "manual",
    cards,
    cardSchema: {
      properties: {
        suit: createEnumPropertySchema(
          ["SPADES", "HEARTS", "CLUBS", "DIAMONDS"],
          "The suit of the card",
        ),
        rank: createStringPropertySchema("The rank of the card"),
      },
    } satisfies ObjectSchema,
  };
}

export function addStandardDecksIfNeeded(
  manifest: GameTopologyManifest,
): GameTopologyManifest {
  return {
    ...manifest,
    cardSets: manifest.cardSets.map((cardSet) =>
      cardSet.type === "preset" && cardSet.presetId === STANDARD_DECK_ID
        ? {
            ...createStandard52CardDeck(),
            id: cardSet.id,
            name: cardSet.name,
          }
        : cardSet,
    ),
  };
}

export function materializePresetCardSet(
  presetCardSet: PresetCardSetDefinition,
): ManualCardSetDefinition {
  if (presetCardSet.presetId !== STANDARD_DECK_ID) {
    throw new Error(`Unsupported preset deck: ${presetCardSet.presetId}`);
  }

  const standardDeck = createStandard52CardDeck();
  return {
    ...standardDeck,
    id: presetCardSet.id,
    name: presetCardSet.name,
  };
}

export function materializeCardSet(
  cardSet: GameTopologyManifest["cardSets"][number],
): ManualCardSetDefinition {
  return cardSet.type === "manual"
    ? cardSet
    : materializePresetCardSet(cardSet);
}

function getBigTwoCardValue(rank: string): number {
  switch (rank) {
    case "3":
      return 3;
    case "4":
      return 4;
    case "5":
      return 5;
    case "6":
      return 6;
    case "7":
      return 7;
    case "8":
      return 8;
    case "9":
      return 9;
    case "10":
      return 10;
    case "J":
      return 11;
    case "Q":
      return 12;
    case "K":
      return 13;
    case "A":
      return 14;
    case "2":
      return 15;
    default:
      return 0;
  }
}

function getSuitValue(suit: string): number {
  switch (suit) {
    case "DIAMONDS":
      return 1;
    case "CLUBS":
      return 2;
    case "HEARTS":
      return 3;
    case "SPADES":
      return 4;
    default:
      return 0;
  }
}
