import type { Card, CoreInstance, IdOf, Zone } from "../model.js";

export interface HandOptions<G> {
  /** Compare projected card data only; hidden cards never expose private fields. */
  readonly sort?: (
    left: Card<G, Record<never, never>>,
    right: Card<G, Record<never, never>>,
  ) => number;
}

/** Optional hand helpers reuse the zone order and the core selection router. */
export function handFeature<G>(
  _game: CoreInstance<G>,
  options: HandOptions<G> = {},
) {
  return {
    zone: {
      getSortedCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly IdOf<G, "cardId">[] {
        return this.getCards({ sort: options.sort }).map((card) => card.id);
      },
      getSelectedCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly IdOf<G, "cardId">[] {
        return this.getCards()
          .filter((card) => card.getIsSelected())
          .map((card) => card.id);
      },
      getSelectableCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly IdOf<G, "cardId">[] {
        return this.getCards()
          .filter((card) => card.getCanSelect())
          .map((card) => card.id);
      },
    },
  };
}
