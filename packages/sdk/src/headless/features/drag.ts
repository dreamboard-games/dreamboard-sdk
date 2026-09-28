import type { DropTarget, TargetOptions } from "../targets.js";
export type { DropTarget } from "../targets.js";
import { inputValueKey } from "../../shared/input-domain.js";
import type { CoreInstance, FeatureContext, IdOf } from "../model.js";
export interface DragState<G> {
  readonly cardId: IdOf<G, "cardId">;
  readonly target: DropTarget<G> | null;
}

export interface DragController<G> {
  readonly active: DragState<G> | null;
  getCanDrag(cardId: IdOf<G, "cardId">, options?: TargetOptions<G>): boolean;
  begin(cardId: IdOf<G, "cardId">, options?: TargetOptions<G>): boolean;
  getDropTargets(): readonly DropTarget<G>[];
  setDropTarget(target: DropTarget<G> | null): void;
  drop(): void;
  cancel(): void;
}

/** Semantic card/drop routing. Browser sensors and feedback belong to /react. */
export function dragFeature<G>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
) {
  let active: DragState<G> | null = null;
  let selection: TargetOptions<G> | undefined;
  let source = game.getOptions().source;
  let seat = game.snapshot?.me;
  let disposed = false;
  let version = game.snapshot?.version;
  let lastInteractions = game.interactions;
  let lastCards = game.cards;
  let branch = snapshot();
  function update(next: DragState<G> | null) {
    if (disposed) return;
    active = next === null ? null : Object.freeze(next);
    branch = snapshot();
    context.invalidate();
  }
  function targets(
    cardId = active?.cardId,
    selected = selection,
  ): readonly DropTarget<G>[] {
    if (!cardId || game.connection !== "ready") return [];
    // Runtime projections are validated by the source; public results carry the bound game types.
    const runtime = game as unknown as CoreInstance<unknown>;
    const options = selected as TargetOptions<unknown> | undefined;
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
  function cancel() {
    if (active) update(null);
  }
  function snapshot(): DragController<G> {
    const captured = active;
    const dropTargets = Object.freeze(targets());
    return Object.freeze<DragController<G>>({
      active: captured,
      getCanDrag: (cardId, options) =>
        !disposed && targets(cardId, options).length > 0,
      begin(cardId, options) {
        if (disposed || !targets(cardId, options).length) return false;
        selection = options;
        update({ cardId, target: null });
        return true;
      },
      getDropTargets: () => dropTargets,
      setDropTarget(target: DropTarget<G> | null) {
        if (!active || disposed) return;
        if (
          target &&
          !targets().some((candidate) => sameTarget(candidate, target))
        ) {
          update({ ...active, target: null });
          return;
        }
        update({ ...active, target });
      },
      drop() {
        const finished = active;
        const eligible =
          finished?.target &&
          targets().some((target) => sameTarget(target, finished.target!));
        cancel();
        if (!disposed && finished?.target && eligible)
          context.routeCardDrop(finished.cardId, finished.target);
      },
      cancel,
    });
  }
  const unsubscribe = game.subscribe(() => {
    const nextSource = game.getOptions().source;
    const nextSeat = game.snapshot?.me;
    const nextVersion = game.snapshot?.version;
    if (
      nextSource !== source ||
      nextSeat !== seat ||
      nextVersion !== version ||
      game.connection !== "ready"
    ) {
      source = nextSource;
      seat = nextSeat;
      version = nextVersion;
      cancel();
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
    dispose() {
      unsubscribe();
      cancel();
      disposed = true;
    },
  };
}
