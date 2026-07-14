import type { ReactElement, ReactNode } from "react";
import { Fragment as ReactFragment, createElement } from "react";
import { useResolvedCardTargetValue } from "../primitives/index.js";
import type {
  WorkspaceBoardTargetInputSlot,
  WorkspaceCardInputSlot,
  WorkspaceContractContext,
  WorkspaceFormInputSlot,
} from "./types.js";

/**
 * Render-prop body for the card surface `slot.card.Value`. Surfaces the live
 * draft value for the active interaction's card-target input — the selected
 * card-id array for `selection: "many"` collectors, or the single id for
 * `selection: "one"`. Renders nothing meaningful (`undefined`) outside an
 * `<Interaction.Root>`.
 */
function CardSlotValue({
  children,
}: {
  children: (value: unknown | undefined) => ReactNode;
}): ReactElement {
  const value = useResolvedCardTargetValue();
  return createElement(ReactFragment, null, children(value));
}

export function createFormInputSlot<Card>(
  ctx: WorkspaceContractContext<Card>,
  input: string,
  interaction?: string,
): WorkspaceFormInputSlot {
  const { baseUI, withInteractionRoot } = ctx;
  return {
    Field: (props: { children?: ReactNode }) => {
      const field = createElement(baseUI.Interaction.Field, {
        ...props,
        input: input as never,
      });
      return interaction ? withInteractionRoot(interaction, field) : field;
    },
    Options: () => null,
    Value: ({
      children,
    }: {
      children: (value: unknown | undefined) => ReactNode;
    }) => createElement(ReactFragment, null, children(undefined)),
    Default: ({ children }: { children?: ReactNode }) =>
      createElement(ReactFragment, null, children),
  };
}

export function createCardInputSlot<Card>(
  ctx: WorkspaceContractContext<Card>,
): WorkspaceCardInputSlot {
  const { runtimeInteraction } = ctx;
  return {
    Card: ({ value, ...props }: { value: string; children?: ReactNode }) =>
      createElement(runtimeInteraction.CardInput, {
        ...props,
        input: "cardId",
        unsafeCardId: value,
      }),
    Cards: () => null,
    Value: ({
      children,
    }: {
      children: (value: unknown | undefined) => ReactNode;
    }) => createElement(CardSlotValue, { children }),
    Default: ({ children }: { children?: ReactNode }) =>
      createElement(ReactFragment, null, children),
  };
}

export function createBoardTargetInputSlot<Card>(
  ctx: WorkspaceContractContext<Card>,
  kind: "space" | "edge" | "vertex" | "tile",
): WorkspaceBoardTargetInputSlot<typeof kind> {
  const { runtimeBoard } = ctx;
  const Target = ({
    value,
    ...props
  }: {
    value: string;
    children?: ReactNode;
  }) => {
    if (kind === "edge") {
      return createElement(runtimeBoard.EdgeTarget, { ...props, value });
    }
    if (kind === "vertex") {
      return createElement(runtimeBoard.VertexTarget, { ...props, value });
    }
    return createElement(runtimeBoard.SpaceTarget, { ...props, value });
  };
  return {
    Target,
    Value: ({
      children,
    }: {
      children: (value: unknown | undefined) => ReactNode;
    }) => createElement(ReactFragment, null, children(undefined)),
    Default: ({ children }: { children?: ReactNode }) =>
      createElement(ReactFragment, null, children),
  };
}
