import type { DropTarget, TargetOptions } from "../targets.js";
export type { DropTarget } from "../targets.js";
import { inputValueKey } from "../../shared/input-domain.js";
import type { CardBase, CoreInstance, FeatureContext, IdOf } from "../model.js";
import {
  createPointerSession,
  type Point,
  type PointerInput,
} from "./pointer-session.js";

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
  let selection: TargetOptions<G> | undefined;
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
    // Runtime projections are validated by the source; public results carry the bound game types.
    const runtime = game as unknown as CoreInstance<unknown>;
    const options = selection as TargetOptions<unknown> | undefined;
    const resolved = (
      runtime.cards.find(cardId)?.getInteractions() ?? []
    ).flatMap((candidate) => {
      if (
        !candidate.getIsAvailable() ||
        (options?.interaction && candidate.key !== options.interaction)
      )
        return [];
      const inputs = candidate.getInputs();
      const cardInputs = inputs.filter(
        (input) =>
          input.getDomain().type === "cardTarget" &&
          (!options?.input || input.key === options.input) &&
          input.getIsEligible(cardId),
      );
      return cardInputs.flatMap((cardInput) =>
        inputs.flatMap((input): DropTarget<unknown>[] => {
          const domain = input.getDomain();
          if (domain.type !== "boardTarget") return [];
          const route = {
            interactionKey: candidate.key,
            cardInputKey: cardInput.key,
            inputKey: input.key,
          };
          if (domain.valueKind === "player-board-space")
            return domain.eligibleTargets
              .filter((value) => !input.getTargetProps(value).disabled)
              .map((value) =>
                Object.freeze({
                  kind: "space",
                  valueKind: domain.valueKind,
                  value,
                  ...route,
                }),
              );
          return domain.eligibleTargets
            .filter((value) => !input.getTargetProps(value).disabled)
            .map((value) =>
              Object.freeze({
                kind: domain.targetKind,
                valueKind: domain.valueKind,
                value,
                boardId: domain.boardId,
                ...route,
              }),
            );
        }),
      );
    });
    return resolved as unknown as readonly DropTarget<G>[];
  }
  function sameTarget(left: DropTarget<G>, right: DropTarget<G>) {
    return (
      left.kind === right.kind &&
      left.valueKind === right.valueKind &&
      inputValueKey(left.value) === inputValueKey(right.value) &&
      (left.valueKind !== "board-id" ||
        (right.valueKind === "board-id" && left.boardId === right.boardId)) &&
      left.interactionKey === right.interactionKey &&
      left.cardInputKey === right.cardInputKey &&
      left.inputKey === right.inputKey
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
      } else
        context.routeTarget(
          { kind: "card", value: finished.cardId },
          selection,
        );
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
      getDragProps(this: CardBase<G>, options?: TargetOptions<G>) {
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
              game.cards.find(this.id) !== this ||
              !this.getCanSelect()
            )
              return;
            if (!pointer.start(event)) return;
            suppressPointerClick = false;
            dragged = false;
            selection = options;
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
