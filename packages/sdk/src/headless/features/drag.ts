import type {
  CardBase,
  CoreInstance,
  FeatureContext,
  IdOf,
  InteractionKey,
} from "../model.js";
import {
  createPointerSession,
  type Point,
  type PointerInput,
} from "./pointer-session.js";

export interface DropTarget<G> {
  readonly kind: "space" | "edge" | "vertex" | "tile";
  readonly id: string;
  readonly boardId: IdOf<G, "boardId">;
  readonly interaction: InteractionKey<G>;
}
export interface DragState<G> {
  readonly cardId: IdOf<G, "cardId">;
  readonly offset: Point;
  readonly target: DropTarget<G> | null;
}

/** Card drag state and native props. The core router owns atomic card/drop writes. */
export function dragFeature<G>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
) {
  let active: DragState<G> | null = null;
  let interaction: InteractionKey<G> | undefined;
  let source = game.getOptions().source;
  let seat = game.snapshot?.me;
  let disposed = false;
  let suppressPointerClick = false;
  let dragged = false;
  let lastInteractions = game.interactions;
  let lastCards = game.cards;
  let branch = snapshot();
  function update(next: DragState<G> | null) {
    if (disposed) return;
    active =
      next === null
        ? null
        : Object.freeze({ ...next, offset: Object.freeze(next.offset) });
    branch = snapshot();
    context.invalidate();
  }
  function targets(): readonly DropTarget<G>[] {
    if (!active) return [];
    const cardId = active.cardId;
    return (game.cards.get(cardId)?.getInteractions() ?? [])
      .filter(
        (candidate) =>
          candidate.getIsAvailable() &&
          (!interaction || candidate.key === interaction) &&
          candidate
            .getInputs()
            .some(
              (input) =>
                input.getDomain().type === "cardTarget" &&
                input.getIsEligible(cardId),
            ),
      )
      .flatMap((candidate) =>
        candidate.getInputs().flatMap((input): DropTarget<G>[] => {
          const domain = input.getDomain();
          if (
            domain.type !== "boardTarget" ||
            !["space", "edge", "vertex", "tile"].includes(
              String(domain.targetKind),
            )
          )
            return [];
          return input
            .getEligibleTargets()
            .filter(
              (id): id is string =>
                typeof id === "string" && !input.getTargetProps(id).disabled,
            )
            .map((id) =>
              Object.freeze({
                kind: domain.targetKind as DropTarget<G>["kind"],
                id,
                boardId: String(domain.boardId) as IdOf<G, "boardId">,
                interaction: candidate.key,
              }),
            );
        }),
      );
  }
  function sameTarget(left: DropTarget<G>, right: DropTarget<G>) {
    return (
      left.kind === right.kind &&
      left.id === right.id &&
      left.boardId === right.boardId &&
      left.interaction === right.interaction
    );
  }
  const pointer = createPointerSession({
    move: ({ delta }) => {
      if (Math.hypot(delta.x, delta.y) >= 5) dragged = true;
      if (active) update({ ...active, offset: delta });
    },
    end({ delta }) {
      if (Math.hypot(delta.x, delta.y) >= 5) dragged = true;
      suppressPointerClick = true;
      const finished = active;
      update(null);
      if (!finished) return;
      if (dragged) {
        if (finished.target)
          context.routeCardDrop(finished.cardId, finished.target);
      } else context.routeTarget("card", finished.cardId, { interaction });
    },
    cancel: () => {
      suppressPointerClick = true;
      update(null);
    },
  });
  function snapshot() {
    const captured = active;
    const dropTargets = Object.freeze(targets());
    return Object.freeze({
      active: captured,
      getDropTargets: () => dropTargets,
      setDropTarget(target: DropTarget<G> | null) {
        if (!active || disposed) return;
        if (
          target &&
          !targets().some((candidate) => sameTarget(candidate, target))
        )
          return;
        update({ ...active, target });
      },
      cancel: () => pointer.cancel(),
    });
  }
  const unsubscribe = game.subscribe(() => {
    const nextSource = game.getOptions().source;
    const nextSeat = game.snapshot?.me;
    if (nextSource !== source || nextSeat !== seat) {
      source = nextSource;
      seat = nextSeat;
      pointer.cancel();
    }
  });
  return {
    root: {
      get drag() {
        if (
          lastInteractions !== game.interactions ||
          lastCards !== game.cards
        ) {
          lastInteractions = game.interactions;
          lastCards = game.cards;
          branch = snapshot();
        }
        return branch;
      },
    },
    card: {
      getDragProps(
        this: CardBase<G>,
        options?: { interaction?: InteractionKey<G> },
      ) {
        return {
          style: {
            touchAction: "none" as const,
            transform:
              active?.cardId === this.id
                ? `translate(${active.offset.x}px, ${active.offset.y}px)`
                : undefined,
          },
          "data-drag-card": this.id,
          onPointerDown: (event: PointerInput) => {
            if (
              disposed ||
              game.cards.get(this.id) !== this ||
              !this.getCanSelect()
            )
              return;
            if (!pointer.start(event)) return;
            suppressPointerClick = false;
            dragged = false;
            interaction = options?.interaction;
            update({ cardId: this.id, offset: { x: 0, y: 0 }, target: null });
          },
          onClick: (event: { detail: number; preventDefault(): void }) => {
            if (disposed) return;
            if (event.detail !== 0 && suppressPointerClick) {
              suppressPointerClick = false;
              event.preventDefault();
              return;
            }
            this.select(options);
          },
          onPointerMove: pointer.move,
          onPointerUp: pointer.end,
          onPointerCancel: pointer.cancel,
          onLostPointerCapture: pointer.cancel,
        };
      },
    },
    dispose() {
      unsubscribe();
      pointer.dispose();
      disposed = true;
    },
  };
}
