import { literals } from "../shared/manifest-contract";
import type { CardId, Guild, StormId } from "./game-contract";

export type StallCard = {
  readonly kind: "stall";
  readonly id: CardId;
  readonly guild: Guild;
  readonly prestige: number;
  readonly coins: number;
};

export type StormCard = {
  readonly kind: "storm";
  readonly id: StormId;
};

export type HarborCard = StallCard | StormCard;

export const festivalCardIds = [...literals.cardIds] as readonly CardId[];
export const stormIds = [
  "storm-1",
  "storm-2",
] as const satisfies readonly StormId[];

function parseCard(cardId: CardId): HarborCard {
  if (cardId === "storm-1" || cardId === "storm-2") {
    return { kind: "storm", id: cardId };
  }
  const match = cardId.match(/^(food|craft|music)-p([123])-c([01])-([1-4])$/);
  if (!match) {
    throw new Error(`Unknown Harbor Fair card '${cardId}'.`);
  }
  return {
    kind: "stall",
    id: cardId,
    guild: match[1] as Guild,
    prestige: Number(match[2]),
    coins: Number(match[3]),
  };
}

export const cardById = Object.fromEntries(
  festivalCardIds.map((cardId) => [cardId, parseCard(cardId)]),
) as Record<CardId, HarborCard>;

export const stallCards = festivalCardIds
  .map((cardId) => cardById[cardId])
  .filter((card): card is StallCard => card.kind === "stall");

export function assertFestivalDeckComposition(deck: readonly CardId[]): void {
  if (
    deck.length !== festivalCardIds.length ||
    [...deck].sort().join("|") !== [...festivalCardIds].sort().join("|")
  ) {
    throw new Error("Harbor Fair requires the exact 30-stall, two-storm deck.");
  }
}
