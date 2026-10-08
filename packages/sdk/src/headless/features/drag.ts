import {
  runtimeFeatures,
  type RuntimeFeatureContext,
} from "../runtime-features.js";
import type { RuntimeDropTarget, RuntimeTargetOptions } from "../targets.js";
import type { DropTarget, TargetOptions } from "../targets.js";
export type { DropTarget } from "../targets.js";
import { isSameDropTarget } from "../drop-targets.js";
import { zonePositions } from "../../shared/position-target.js";
import type { CoreInstance, FeatureContext, SeatCardId } from "../model.js";
export interface DragState<G> {
  readonly cardId: SeatCardId<G>;
  readonly target: DropTarget<G> | null;
}

export interface DragController<G> {
  readonly active: DragState<G> | null;
  getCanDrag(cardId: SeatCardId<G>, options?: TargetOptions<G>): boolean;
  begin(cardId: SeatCardId<G>, options?: TargetOptions<G>): boolean;
  getDropTargets(): readonly DropTarget<G>[];
  getIsDropTarget(target: DropTarget<G>): boolean;
  setDropTarget(target: DropTarget<G> | null): void;
  drop(): void;
  cancel(): void;
}

interface RuntimeDragState {
  readonly cardId: string;
  readonly target: RuntimeDropTarget | null;
}
interface RuntimeDragController {
  readonly active: RuntimeDragState | null;
  getCanDrag(cardId: string, options?: RuntimeTargetOptions): boolean;
  begin(cardId: string, options?: RuntimeTargetOptions): boolean;
  getDropTargets(): readonly RuntimeDropTarget[];
  getIsDropTarget(target: RuntimeDropTarget): boolean;
  setDropTarget(target: RuntimeDropTarget | null): void;
  drop(): void;
  cancel(): void;
}
function createRuntimeDragFeature(context: RuntimeFeatureContext) {
  const game = context.game;
  let active: RuntimeDragState | null = null;
  let selection: RuntimeTargetOptions | undefined;
  let source = game.getOptions().source;
  let seat = game.snapshot?.me;
  let disposed = false;
  let version = game.snapshot?.version;
  let lastInteractions = game.interactions;
  let lastCards = game.cards;
  let branch = snapshot();
  function update(next: RuntimeDragState | null) {
    if (disposed) return;
    active = next === null ? null : Object.freeze(next);
    branch = snapshot();
    context.invalidate();
  }
  function targets(
    cardId = active?.cardId,
    selected = selection,
  ): readonly RuntimeDropTarget[] {
    if (!cardId || game.connection !== "ready") return [];
    const options = selected;
    const resolved = (game.cards.find(cardId)?.getInteractions() ?? []).flatMap(
      (candidate) => {
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
        // Each insertion point a position input offers is its own target.
        const positions = cardInputs.flatMap((cardInput) =>
          inputs.flatMap((input): RuntimeDropTarget[] => {
            const domain = input.getDomain();
            return domain.type === "zonePosition"
              ? zonePositions(domain.zones)
                  .filter((value) => !input.getTargetProps(value).disabled)
                  .map((value) =>
                    Object.freeze({
                      kind: "position",
                      interactionKey: candidate.key,
                      cardInputKey: cardInput.key,
                      inputKey: input.key,
                      value,
                    }),
                  )
              : [];
          }),
        );
        // Without a board input, the card lands on an area that runs the interaction.
        if (!inputs.some((input) => input.getDomain().type === "boardTarget"))
          return [
            ...cardInputs.map((cardInput): RuntimeDropTarget =>
              Object.freeze({
                kind: "interaction",
                interactionKey: candidate.key,
                cardInputKey: cardInput.key,
              }),
            ),
            ...positions,
          ];
        const boardTargets = cardInputs.flatMap((cardInput) =>
          inputs.flatMap((input): RuntimeDropTarget[] => {
            const domain = input.getDomain();
            if (domain.type !== "boardTarget") return [];
            const route = {
              interactionKey: candidate.key,
              cardInputKey: cardInput.key,
              inputKey: input.key,
            };
            if (domain.valueKind === "board-space")
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
        return [...boardTargets, ...positions];
      },
    );
    return resolved;
  }
  function isEligible(target: RuntimeDropTarget) {
    if (!active || disposed) return false;
    const route =
      target.kind === "interaction" ? { ...target, params: undefined } : target;
    return (
      targets().some((candidate) => isSameDropTarget(candidate, route)) &&
      context.getCanDropCard(active.cardId, target)
    );
  }
  function cancel() {
    if (active) update(null);
  }
  function snapshot(): RuntimeDragController {
    const captured = active;
    const dropTargets = Object.freeze(targets());
    return Object.freeze<RuntimeDragController>({
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
      getIsDropTarget: isEligible,
      setDropTarget(target: RuntimeDropTarget | null) {
        if (!active || disposed) return;
        if (target && !isEligible(target)) {
          update({ ...active, target: null });
          return;
        }
        update({ ...active, target });
      },
      drop() {
        const finished = active;
        const eligible = finished?.target && isEligible(finished.target);
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

/**
 * Semantic card/drop routing. A card lands on a board destination when its
 * interaction has a board input, otherwise on an area that runs the
 * interaction. Gestures, hit-testing and feedback belong to /react.
 */
export function dragFeature<G>(
  _game: CoreInstance<G>,
  context: FeatureContext<G>,
): { readonly root: { readonly drag: DragController<G> }; dispose(): void } {
  // Game-binding boundary: routes come from this instance's admitted descriptors.
  // The runtime implementation revalidates both inputs atomically on drop.
  return createRuntimeDragFeature(context[runtimeFeatures]) as {
    readonly root: { readonly drag: DragController<G> };
    dispose(): void;
  };
}
