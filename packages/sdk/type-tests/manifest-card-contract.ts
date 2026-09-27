import type { BoardCard } from "../src/shared/domain/contracts.js";
import { compileManifest } from "../src/reducer/manifest/compiler.js";
import type { z } from "zod";

const oldCard = {
  type: "ace",
  name: "Ace",
  count: 1,
  properties: {},
};

// @ts-expect-error Authored cards require separate definition and category ids.
const typedOldCard: BoardCard = oldCard;

void typedOldCard;

const compiled = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      defaultHome: { type: "detached" },
      cardSchema: { variants: { ranked: { properties: {} } } },
      cards: [
        {
          id: "ace",
          cardType: "ranked",
          name: "Ace",
          count: 2,
          properties: {},
        },
        {
          id: "king",
          cardType: "ranked",
          name: "King",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [],
  boards: [],
});

type CardId = z.infer<typeof compiled.ids.cardId>;
type CardType = z.infer<typeof compiled.ids.cardType>;
const firstCopy: CardId = "ace-1";
const secondCopy: CardId = "ace-2";
const otherDefinition: CardId = "king";
const sharedCategory: CardType = "ranked";
// @ts-expect-error Copies use numbered ids, even with a shared category.
const invalidBaseId: CardId = "ace";
// @ts-expect-error Card ids do not derive from the category.
const invalidCategoryId: CardId = "ranked";
// @ts-expect-error Only authored categories are valid.
const invalidCategory: CardType = "king";

void [
  firstCopy,
  secondCopy,
  otherDefinition,
  sharedCategory,
  invalidBaseId,
  invalidCategoryId,
  invalidCategory,
];
