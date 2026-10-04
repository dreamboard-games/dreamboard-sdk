import { z } from "zod";
import { compileManifest } from "../src/reducer/manifest/compiler.js";

const compiled = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      id: "actions",
      name: "Actions",
      defaultHome: { type: "detached" },
      cardSchema: {
        byCardType: {
          attack: z
            .object({
              label: z.string().default("shared"),
              value: z.string().default("shared"),
              status: z.string().nullable().optional(),
            })
            .extend({
              value: z.number().int().default(3),
              damage: z.number().int().default(2),
              status: z.number().int().nullable().default(5),
            }),
          defense: z
            .object({
              label: z.string().default("shared"),
              value: z.string().default("shared"),
              status: z.string().nullable().optional(),
            })
            .extend({ shield: z.boolean().default(true) }),
        },
      },
      cards: [
        {
          id: "strike",
          cardType: "attack",
          name: "Strike",
          count: 2,
          properties: {},
        },
        {
          id: "block",
          cardType: "defense",
          name: "Block",
          count: 1,
          properties: {},
        },
      ],
    },
    {
      id: "spells",
      name: "Spells",
      defaultHome: { type: "detached" },
      cardSchema: {
        byCardType: { attack: z.object({ mana: z.number().int().default(4) }) },
      },
      cards: [
        {
          id: "spark",
          cardType: "attack",
          name: "Spark",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [],
  boards: [],
});

const table = compiled.createInitialTable();
const strike = table.cards["strike-1"];
const secondStrike = table.cards["strike-2"];
const block = table.cards.block;
const spark = table.cards.spark;

const strikeId: "strike-1" = strike.id;
const secondStrikeId: "strike-2" = secondStrike.id;
const actionSet: "actions" = strike.cardSetId;
const attackCategory: "attack" = strike.cardType;
const damage: number = strike.properties.damage;
const overriddenValue: number = strike.properties.value;
const sharedLabel: string = strike.properties.label;
const overriddenStatus: number | null = strike.properties.status;
const defenseCategory: "defense" = block.cardType;
const shield: boolean = block.properties.shield;
const defenseValue: string = block.properties.value;
const optionalDefenseStatus: string | null | undefined =
  block.properties.status;
const spellSet: "spells" = spark.cardSetId;
const spellAttack: "attack" = spark.cardType;
const mana: number = spark.properties.mana;

// @ts-expect-error The attack variant has no shield field.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative compiler proof: The attack variant has no shield field.
const noShield = strike.properties.shield;
// @ts-expect-error The defense variant has no damage field.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative compiler proof: The defense variant has no damage field.
const noDamage = block.properties.damage;
// @ts-expect-error A shared category in another set does not share fields.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative compiler proof: A shared category in another set does not share fields.
const noSpellDamage = spark.properties.damage;
// @ts-expect-error The variant's integer value overrides the shared string.
const wrongOverride: string = strike.properties.value;
// @ts-expect-error The variant's required default replaces the optional shared field.
const missingRequiredStatus: typeof strike.properties = {
  label: "shared",
  value: 3,
  damage: 2,
};
// @ts-expect-error Definition ids with multiple copies are suffixed.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative compiler proof: Definition ids with multiple copies are suffixed.
const unsuffixed = table.cards.strike;

const defenseWithoutStatus: typeof block.properties = {
  label: "shared",
  value: "shared",
  shield: true,
};

for (const card of Object.values(table.cards)) {
  if (card.cardType === "attack") {
    // Both sets use this category, so category alone cannot pick a field schema.
    // @ts-expect-error Spells have no damage field.
    card.properties.damage;
    // @ts-expect-error Actions have no mana field.
    card.properties.mana;
    if (card.cardSetId === "actions") {
      const actionId: "strike-1" | "strike-2" = card.id;
      const actionDamage: number = card.properties.damage;
      const actionStatus: number | null = card.properties.status;
      void [actionId, actionDamage, actionStatus];
    } else {
      const spellId: "spark" = card.id;
      const spellMana: number = card.properties.mana;
      void [spellId, spellMana];
    }
  } else {
    const defenseId: "block" = card.id;
    const defenseSet: "actions" = card.cardSetId;
    const defenseShield: boolean = card.properties.shield;
    void [defenseId, defenseSet, defenseShield];
  }
}

void [
  strikeId,
  secondStrikeId,
  actionSet,
  attackCategory,
  damage,
  overriddenValue,
  sharedLabel,
  overriddenStatus,
  defenseCategory,
  shield,
  defenseValue,
  optionalDefenseStatus,
  spellSet,
  spellAttack,
  mana,
  noShield,
  noDamage,
  noSpellDamage,
  wrongOverride,
  missingRequiredStatus,
  unsuffixed,
  defenseWithoutStatus,
];

// Game-owned playing-card definitions use the same correlated state inference.
const playingCards = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      id: "playing-cards",
      name: "Playing cards",
      defaultHome: { type: "detached" },
      cardSchema: z.object({
        suit: z.enum(["SPADES", "HEARTS"]),
        rank: z.string(),
      }),
      cards: [
        {
          id: "SPADES_A",
          cardType: "SPADES_A",
          name: "Ace of spades",
          count: 1,
          properties: { suit: "SPADES", rank: "A" },
        },
        {
          id: "HEARTS_Q",
          cardType: "HEARTS_Q",
          name: "Queen of hearts",
          count: 1,
          properties: { suit: "HEARTS", rank: "Q" },
        },
      ],
    },
  ],
  zones: [],
  boards: [],
});
const aceCategory: "SPADES_A" =
  playingCards.createInitialTable().cards.SPADES_A.cardType;
// @ts-expect-error Playing-card IDs come only from the authored inventory.
playingCards.createInitialTable().cards.CLUBS_2;
void aceCategory;

// Headless views preserve card inference while exposing only display fields.
import type { CardDataOf, ReadonlyData } from "../src/headless/model.js";
import type { ViewCard } from "../src/shared/domain/cards.js";
import { getCard } from "../src/reducer/table/zone-queries.js";

type Game = { contract: { manifest: typeof compiled } };
declare const strikeView: CardDataOf<Game, "strike-1">;
const visibleId: "strike-1" = strikeView.id;
const visibleType: "attack" = strikeView.cardType;
const visibleDamage: number = strikeView.properties.damage;
const visibleName: string | undefined = strikeView.name;
// @ts-expect-error Card-set membership is table metadata, not display data.
strikeView.cardSetId;
// @ts-expect-error Component type is table metadata, not display data.
strikeView.componentType;
// @ts-expect-error Headless display properties are immutable.
strikeView.properties.damage = 3;

declare const visibleCard: CardDataOf<Game, "strike-1" | "block">;
if (visibleCard.cardType === "attack") {
  const attackId: "strike-1" = visibleCard.id;
  const attackDamage: number = visibleCard.properties.damage;
  // @ts-expect-error Category narrowing excludes defense properties.
  visibleCard.properties.shield;
  void [attackId, attackDamage];
} else {
  const defenseId: "block" = visibleCard.id;
  const defenseShield: boolean = visibleCard.properties.shield;
  void [defenseId, defenseShield];
}

const reducerView = getCard(table, "strike-1");
const reducerDamage: number = reducerView.properties.damage;
// @ts-expect-error Reducer display views also exclude table metadata.
reducerView.cardSetId;

declare const fallbackView: CardDataOf<unknown, "visible">;
const fallbackId: "visible" = fallbackView.id;
const canonical: ReadonlyData<ViewCard> = fallbackView;
// @ts-expect-error The fallback view has the same complete display shape.
fallbackView.componentType;
void [
  visibleId,
  visibleType,
  visibleDamage,
  visibleName,
  reducerDamage,
  fallbackId,
  canonical,
];
