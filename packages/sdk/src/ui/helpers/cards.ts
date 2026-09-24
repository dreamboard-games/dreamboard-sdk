import type { CardCollection, ViewCard } from "../../shared/domain/cards.js";

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
