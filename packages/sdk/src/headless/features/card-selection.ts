import type { CoreInstance, FeatureContext, SeatCardId } from "../model.js";

export interface CardSelectionController<G> {
  readonly cardIds: readonly SeatCardId<G>[];
  set(cardIds: readonly SeatCardId<G>[]): void;
  toggle(cardId: SeatCardId<G>): void;
  clear(): void;
}

/** Local presentation selection, separate from interaction drafts. Authors choose selectable zones. */
export function cardSelectionFeature<G>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
) {
  let ids: readonly SeatCardId<G>[] = Object.freeze([]);
  let source = game.getOptions().source;
  let snapshot = game.snapshot;
  let disposed = false;
  function set(values: readonly SeatCardId<G>[]) {
    if (disposed) return;
    const next = [...new Set(values)].filter((id) => game.cards.find(id));
    if (
      next.length === ids.length &&
      next.every((id, index) => id === ids[index])
    )
      return;
    ids = Object.freeze(next);
    branch = capture();
    context.invalidate();
  }
  function capture(): CardSelectionController<G> {
    return Object.freeze({
      cardIds: ids,
      set,
      toggle(id: SeatCardId<G>) {
        set(
          ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
        );
      },
      clear: () => set([]),
    });
  }
  let branch = capture();
  const unsubscribe = game.subscribe(() => {
    if (source !== game.getOptions().source || snapshot !== game.snapshot) {
      source = game.getOptions().source;
      snapshot = game.snapshot;
      set([]);
    }
  });
  return {
    root: {
      get cardSelection() {
        return branch;
      },
    },
    dispose() {
      disposed = true;
      unsubscribe();
    },
  };
}
