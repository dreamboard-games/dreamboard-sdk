import { useId, useLayoutEffect, type ReactNode } from "react";
import {
  DragDropProvider,
  KeyboardSensor,
  PointerSensor,
  useDragDropManager,
  useDraggable,
  useDroppable,
  type UseDroppableInput,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/react";
import {
  Accessibility,
  defaultPreset,
  PointerActivationConstraints,
} from "@dnd-kit/dom";
import { pointerIntersection } from "@dnd-kit/collision";
import type { SeatCardId } from "../headless/model.js";
import type { DragController } from "../headless/features/drag.js";
import type { DropTarget, TargetOptions } from "../headless/targets.js";

/** Browser-only hit testing receives client pixels; SVG renderers invert their screen CTM. */
export interface BoardDropOptions {
  containsPoint?(point: { x: number; y: number }): boolean;
}
export interface DragBinding<G> {
  subscribe(listener: () => void): () => void;
  readonly drag?: DragController<G>;
}
type DragData<G> = { begin?: () => boolean; target?: DropTarget<G> | null };
const sensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
  KeyboardSensor,
];

const plugins = defaultPreset.plugins.map((plugin) =>
  plugin === Accessibility
    ? Accessibility.configure({
        announcements: {
          dragstart: () =>
            "Card picked up. Use arrow keys to move and Space or Enter to drop. Escape cancels.",
          dragover: ({ operation }: DragOverEvent) => {
            const element = operation.target?.element;
            if (!element) return "No drop destination.";
            const label =
              element.getAttribute("aria-label") ?? "board destination";
            const board = element.getAttribute("data-board");
            return `Over ${label}${board ? ` on ${board}` : ""}.`;
          },
          dragend: ({ canceled, operation }: DragEndEvent) =>
            canceled
              ? "Drag cancelled."
              : operation.target
                ? "Card placement selected."
                : "No placement selected.",
        },
      })
    : plugin,
);

function DragLifetime<G>({ game }: { game: DragBinding<G> }) {
  const manager = useDragDropManager();
  useLayoutEffect(
    () =>
      game.subscribe(() => {
        if (
          !game.drag?.active &&
          manager &&
          !manager.dragOperation.status.idle &&
          !manager.dragOperation.status.dropped
        )
          manager.actions.stop({ canceled: true });
      }),
    [game, manager],
  );
  return null;
}
/** Installed by GameProvider when dragFeature is enabled. */
export function GameDragProvider<G>({
  game,
  children,
}: {
  game: DragBinding<G>;
  children?: ReactNode;
}) {
  return (
    <DragDropProvider<DragData<G>>
      sensors={sensors}
      plugins={plugins}
      onBeforeDragStart={(event) => {
        if (!event.operation.source?.data.begin?.()) event.preventDefault();
      }}
      onDragOver={({ operation }) =>
        game.drag?.setDropTarget(operation.target?.data.target ?? null)
      }
      onDragEnd={({ canceled, operation }) => {
        if (canceled) game.drag?.cancel();
        else {
          game.drag?.setDropTarget(operation.target?.data.target ?? null);
          game.drag?.drop();
        }
      }}
    >
      <DragLifetime game={game} />
      {children}
    </DragDropProvider>
  );
}

/** Bound by createGameHook so card and interaction IDs use the authored game. */
export function useCardDraggable<G>(
  game: DragBinding<G>,
  cardId: SeatCardId<G>,
  options?: TargetOptions<G>,
) {
  const id = useId();
  const canDrag = game.drag?.getCanDrag(cardId, options) ?? false;
  const { ref, handleRef, isDragging } = useDraggable<DragData<G>>({
    id,
    disabled: !canDrag,
    data: { begin: () => game.drag?.begin(cardId, options) ?? false },
  });
  return {
    // Disabled draggables must not mark ordinary nested card controls aria-disabled.
    ref: canDrag ? ref : undefined,
    handleRef,
    isDragging,
    canDrag,
    handleProps: {
      type: "button" as const,
      disabled: !canDrag,
      "aria-label": `Drag ${cardId}`,
      "data-drag-card": cardId,
      style: { touchAction: "none" as const },
    },
  };
}

/** Targets retain the exact interaction, card-input and destination-input route. */
export function useBoardDroppable<G>(
  target: DropTarget<G> | null,
  options?: BoardDropOptions,
) {
  const id = useId();
  const collisionDetector: UseDroppableInput["collisionDetector"] = (input) => {
    const collision = pointerIntersection(input);
    if (!collision) return null;
    return !options?.containsPoint ||
      options.containsPoint(input.dragOperation.position.current)
      ? collision
      : null;
  };
  const { ref, isDropTarget } = useDroppable<DragData<G>>({
    id,
    disabled: target === null,
    data: { target },
    collisionDetector,
  });
  return { ref, isDropTarget };
}
