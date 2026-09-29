import type { Card, CoreInstance, SeatCardId, Zone } from "../model.js";

export interface HandOptions<G> {
  /** Compare projected card data only; hidden cards never expose private fields. */
  readonly sort?: (
    left: Card<G, Record<never, never>>,
    right: Card<G, Record<never, never>>,
  ) => number;
}

// Generic G defers the card visibility union, so ids widen to string here.
const seatCardId = <G>(card: { readonly id: string }) =>
  card.id as SeatCardId<G>;

/** Optional hand helpers reuse the zone order and the core selection router. */
export function handFeature<G>(
  _game: CoreInstance<G>,
  options: HandOptions<G> = {},
) {
  return {
    zone: {
      getSortedCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly SeatCardId<G>[] {
        return this.getCards({ sort: options.sort }).map(seatCardId<G>);
      },
      getSelectedCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly SeatCardId<G>[] {
        return this.getCards()
          .filter((card) => card.getIsSelected())
          .map(seatCardId<G>);
      },
      getSelectableCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly SeatCardId<G>[] {
        return this.getCards()
          .filter((card) => card.getCanSelect())
          .map(seatCardId<G>);
      },
    },
  };
}
