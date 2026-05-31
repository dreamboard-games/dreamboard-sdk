import type { CardCollection, ViewCard } from "@dreamboard-games/sdk-types";

export function materializeCards<
  CardIdValue extends string,
  CardValue extends ViewCard<CardIdValue>,
>(collection: CardCollection<CardIdValue, CardValue>): CardValue[] {
  const items: CardValue[] = [];

  for (const cardId of collection.cardIds) {
    const card = collection.cardsById[cardId];
    if (!card) {
      continue;
    }

    items.push(card);
  }

  return items;
}
