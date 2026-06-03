import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { Fragment as ReactFragment, createElement, useMemo } from "react";
import { clsx } from "clsx";
import {
  ClientParamSchemaProvider,
  type ClientParamSchemaMap,
} from "./context/ClientParamSchemaContext.js";
import { usePluginState } from "./context/PluginStateContext.js";
import {
  createResourceCounter,
  type ResourceCounterComponents,
  type ResourceDisplayConfig,
} from "../ui.js";
import { CardFace, type ViewCard } from "../ui.js";
import {
  MobileHandTrayProvider,
  useRegisterMobileHand,
  type HandRole,
} from "../ui/components.js";
import { ToastProvider, useIsMobile } from "../ui.js";
import {
  createDreamboardUI,
  type DreamboardUI,
  type TypedGame,
  type UIContract,
} from "./ui-contract.js";
import {
  useResolvedCardTargetValue,
  useZoneCards,
} from "./primitives/index.js";
import {
  HandSurfaceView,
  HandStagingView,
  dropTargetIdFor,
  type HandSelectionSummary,
  type HandSurfaceViewProps,
  type RuntimeDropTarget,
} from "./primitives/hand-surface.js";
import type { AuthoredCardIntent } from "./primitives/hand-intent-adapter.js";
import type {
  CardDropTargetVisualState,
  HandInteractionPolicy,
  HandLayoutKind,
  HandLayoutPolicy,
  InteractionVisualState,
} from "../ui.js";
import type {
  BoardHexGridProps,
  BoardHexViewProps,
  InteractionDialogProps,
  InteractionFormPrimitiveProps,
  InteractionCardInputRenderState,
  InteractionStateProps,
  InteractionSubmitProps,
  InteractionTriggerProps,
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
  UIRootProps,
  ZoneCardRenderItem,
} from "./primitives/index.js";
import type { BoardSpaceTargetProps } from "./primitives/board.js";
import type { ZoneListProps } from "./primitives/zone.js";
import type { PluginStateSnapshot } from "./types/plugin-state.js";
import { isInteractionAvailable } from "./utils/interaction-status.js";

export type { BoardSpaceTargetProps } from "./primitives/board.js";
export type { HandRole } from "../ui/components.js";

export type WorkspaceInteractionSlotComponent<Props = object> = (
  props: Props extends { children: unknown }
    ? Props
    : Props & { children?: ReactNode },
) => ReactElement | null;

export interface WorkspaceFormInputSlot<Input extends string = string> {
  readonly Field: WorkspaceInteractionSlotComponent;
  readonly Options: WorkspaceInteractionSlotComponent<{
    children?: (option: { value: unknown; label: string }) => ReactNode;
  }>;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
  readonly __input?: Input;
}

export interface WorkspaceCardInputSlot<Card extends string = string> {
  readonly Card: WorkspaceInteractionSlotComponent<
    { value: Card } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "type"
      | "value"
    >
  >;
  readonly Cards: WorkspaceInteractionSlotComponent<{
    children: (card: { id: Card }) => ReactNode;
  }>;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
}

export interface WorkspaceBoardTargetInputSlot<
  Kind extends "space" | "edge" | "vertex" | "tile",
  Target extends string = string,
> {
  readonly Target: WorkspaceInteractionSlotComponent<
    { value: Target } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "type"
      | "value"
    >
  >;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
  readonly __kind?: Kind;
}

export interface WorkspaceBoardSurface<
  Space extends string = string,
  Edge extends string = string,
  Vertex extends string = string,
  Tile extends string = string,
> {
  readonly Root: WorkspaceInteractionSlotComponent;
  readonly Space: <Target extends Space>(
    props: BoardSpaceTargetProps<Target>,
  ) => ReactElement | null;
  readonly slot: {
    readonly space: WorkspaceBoardTargetInputSlot<"space", Space>;
    readonly playerSpace: WorkspaceBoardTargetInputSlot<"space", Space>;
    readonly edge: WorkspaceBoardTargetInputSlot<"edge", Edge>;
    readonly vertex: WorkspaceBoardTargetInputSlot<"vertex", Vertex>;
    readonly tile: WorkspaceBoardTargetInputSlot<"tile", Tile>;
  };
}

export type WorkspaceZoneCardsComponent<Card> =
  WorkspaceInteractionSlotComponent<
    Omit<ZoneListProps, "children" | "empty"> & {
      empty?: ReactNode;
      children: (card: Card) => ReactNode;
    }
  >;

export type WorkspaceZoneCardComponent<Card> =
  WorkspaceInteractionSlotComponent<
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value"> & {
      card: Card;
    }
  >;

export type WorkspaceZoneStagingComponent<Card> =
  WorkspaceInteractionSlotComponent<{
    children: (card: Card) => ReactNode;
    label?: ReactNode;
    renderEmptySlot?: (index: number) => ReactNode;
    cardSize?: "sm" | "md" | "lg";
    ariaLabel?: string;
    className?: string;
  }>;

export interface WorkspaceHandSurface<Zone extends string, Card> {
  readonly Hand: WorkspaceZoneCardsComponent<Card>;
  readonly Card: WorkspaceZoneCardComponent<Card>;
  readonly Staging: WorkspaceZoneStagingComponent<Card>;
  readonly slot: {
    readonly card: WorkspaceCardInputSlot<Zone>;
  };
}

export interface WorkspaceHandOptions<Zone extends string = string> {
  zone: Zone;
  role: HandRole;
  label: string;
  order?: number;
}

interface WorkspaceHandComponentOptions {
  name: string;
  zone: string;
  role: HandRole;
  label: string;
  order?: number;
}

export interface WorkspacePileSurface<Card> {
  readonly Pile: WorkspaceZoneCardsComponent<Card>;
  readonly Card: WorkspaceZoneCardComponent<Card>;
}

export interface WorkspaceCardCollectionSurface<Zone extends string, Card> {
  readonly Collection: WorkspaceZoneCardsComponent<Card>;
  readonly Card: WorkspaceZoneCardComponent<Card>;
  readonly slot: {
    readonly card: WorkspaceCardInputSlot<Zone>;
  };
}

export interface WorkspaceBoardSurfaceDescriptor<
  Board extends string = string,
> {
  readonly kind: "board";
  readonly board: Board;
}

export interface WorkspaceHandSurfaceDescriptor<Zone extends string = string> {
  readonly kind: "hand";
  readonly zone: Zone;
  readonly role: HandRole;
  readonly label: string;
  readonly order?: number;
}

export interface WorkspacePileSurfaceDescriptor<Zone extends string = string> {
  readonly kind: "pile";
  readonly zone: Zone;
}

export interface WorkspacePilesSurfaceDescriptor<
  Zones extends readonly string[] = readonly string[],
> {
  readonly kind: "piles";
  readonly zones: Zones;
}

export interface WorkspaceCardCollectionSurfaceDescriptor<
  Zones extends readonly string[] = readonly string[],
> {
  readonly kind: "cardCollection";
  readonly zones: Zones;
  readonly mode?: "all" | "top-card";
}

export interface WorkspaceInteractionFormsDescriptor<
  Interactions extends Readonly<Record<string, string>> = Readonly<
    Record<string, string>
  >,
> {
  readonly kind: "forms";
  readonly interactions: Interactions;
}

export interface WorkspaceInteractionFormDescriptor<
  Interaction extends string = string,
> {
  readonly kind: "form";
  readonly interaction: Interaction;
}

export type WorkspaceSurfaceDescriptor =
  | WorkspaceBoardSurfaceDescriptor
  | WorkspaceHandSurfaceDescriptor
  | WorkspacePileSurfaceDescriptor
  | WorkspacePilesSurfaceDescriptor
  | WorkspaceCardCollectionSurfaceDescriptor
  | WorkspaceInteractionFormDescriptor
  | WorkspaceInteractionFormsDescriptor;

export interface WorkspaceSurfaceSpec {
  readonly [key: string]: WorkspaceSurfaceDescriptor | WorkspaceSurfaceSpec;
}

type RuntimeInteraction = DreamboardUI["Interaction"] & {
  Root(props: {
    interaction: string;
    children?: ReactNode;
    unavailable?: "render" | "hide";
  }): ReactElement | null;
  CardInput(
    props: Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "type" | "value" | "children"
    > & {
      input: string;
      unsafeCardId?: string;
      children?:
        | ReactNode
        | ((state: InteractionCardInputRenderState) => ReactNode);
    },
  ): ReactElement | null;
  Routes(props: {
    routes: Record<string, { collect: Record<string, unknown> }>;
    fallback?: ReactNode;
    includeUnavailable?: boolean | null;
  }): ReactElement;
};

type RuntimeBoard = DreamboardUI["Board"] & {
  SpaceTarget(props: BoardSpaceTargetProps<string>): ReactElement | null;
  EdgeTarget(
    props: { value: string; children?: ReactNode } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "type"
      | "value"
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "onSelect"
      | "onSelectError"
    >,
  ): ReactElement | null;
  VertexTarget(
    props: { value: string; children?: ReactNode } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "type"
      | "value"
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "onSelect"
      | "onSelectError"
    >,
  ): ReactElement | null;
};

type RuntimeZone<Card> = DreamboardUI["Zone"] & {
  List(
    props: Omit<ZoneListProps, "children" | "empty"> & {
      empty?: ReactNode;
      children: (card: Card) => ReactNode;
    },
  ): ReactElement | null;
};

const DEFAULT_ZONE_CARD_CLASS =
  "group relative border-0 bg-transparent p-0 transition-transform enabled:cursor-pointer enabled:hover:-translate-y-2 data-[selected=true]:-translate-y-3 disabled:cursor-not-allowed data-[eligible=false]:opacity-45 data-[eligible=false]:grayscale data-[eligible=false]:hover:translate-y-0 data-[card-available=false]:opacity-45 data-[card-available=false]:grayscale";

function cardRenderItemToViewCard(card: unknown, cardId: string): ViewCard {
  if (
    card &&
    typeof card === "object" &&
    "hidden" in card &&
    (card as { hidden?: unknown }).hidden === false
  ) {
    return card as unknown as ViewCard;
  }
  return {
    id: cardId,
    cardType: "hidden",
    name: "Hidden card",
    properties: {},
  };
}

export interface WorkspaceContractOptions<
  Contract extends UIContract,
  Resource extends string,
  Card,
  HexBoards extends Record<string, unknown>,
> {
  readonly uiContract: Contract;
  readonly clientParamSchemasByPhase?: ClientParamSchemaMap;
  readonly formInputKeysForInteraction: (
    interaction: string,
  ) => ReadonlySet<string>;
  readonly resourceIds: readonly Resource[];
  readonly resourcePresentationById?: Partial<
    Record<string, { label?: string; icon?: string }>
  >;
  readonly hexStaticBoards: HexBoards;
  readonly cardIdFromZoneCard: (card: Card) => string;
  readonly zoneIdFromZoneCard: (card: Card) => string;
}

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

export function createWorkspaceUIContract<
  WorkspaceUI,
  Contract extends UIContract,
  Resource extends string,
  Card,
  HexBoards extends Record<string, unknown>,
>(
  options: WorkspaceContractOptions<Contract, Resource, Card, HexBoards>,
): WorkspaceUI {
  const baseUI = createDreamboardUI(options.uiContract);
  const runtimeInteraction = baseUI.Interaction as RuntimeInteraction;
  const runtimeBoard = baseUI.Board as RuntimeBoard;
  const runtimeZone = baseUI.Zone as RuntimeZone<Card>;

  const resourceDisplayConfig = options.resourceIds.map((resource) => {
    const presentation = options.resourcePresentationById?.[resource];
    return {
      type: resource,
      label: presentation?.label ?? resource,
      icon: presentation?.icon ?? resource,
    };
  }) satisfies ReadonlyArray<ResourceDisplayConfig<Resource>>;
  const resourceCounter = createResourceCounter<Resource>(
    resourceDisplayConfig,
  );

  function InteractionRoutes({
    routes,
    fallback,
    includeUnavailable,
  }: {
    routes: Record<
      string,
      {
        collect: Record<string, unknown>;
      }
    >;
    fallback?: ReactNode;
    includeUnavailable?: boolean | null;
  }): ReactElement {
    return createElement(runtimeInteraction.Routes, {
      routes,
      fallback,
      includeUnavailable,
    });
  }

  const withInteractionRoot = (interaction: string, children: ReactNode) =>
    createElement(runtimeInteraction.Root, {
      interaction,
      children,
    });

  function createFormInputSlot(
    input: string,
    interaction?: string,
  ): WorkspaceFormInputSlot {
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

  function createCardInputSlot(): WorkspaceCardInputSlot {
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

  function createBoardTargetInputSlot(
    kind: "space" | "edge" | "vertex" | "tile",
  ): WorkspaceBoardTargetInputSlot<typeof kind> {
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

  function useInteractionFormSurface(interaction: string) {
    const validInputs = options.formInputKeysForInteraction(interaction);
    const slot = Object.fromEntries(
      [...validInputs].map((input) => [
        input,
        createFormInputSlot(input, interaction),
      ]),
    );
    return {
      Root: ({ children }: { children?: ReactNode }) =>
        withInteractionRoot(interaction, children),
      Form: (props: InteractionFormPrimitiveProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Form, props),
        ),
      Dialog: (props: InteractionDialogProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Dialog, props),
        ),
      State: (props: InteractionStateProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.State, props),
        ),
      Arm: (props: InteractionTriggerProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Trigger, props),
        ),
      Submit: (props: InteractionSubmitProps) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Submit, props),
        ),
      Field: ({ input, ...props }: { input: string; children?: ReactNode }) =>
        withInteractionRoot(
          interaction,
          createElement(baseUI.Interaction.Field, {
            ...props,
            input: input as never,
          }),
        ),
      slot,
    };
  }

  function useBoardSurface(_name: string) {
    return {
      Root: ({ children }: { children?: ReactNode }) =>
        createElement(baseUI.Board.Root, { children }),
      Space: (props: BoardSpaceTargetProps<string>) =>
        createElement(runtimeBoard.SpaceTarget, props),
      slot: {
        space: createBoardTargetInputSlot("space"),
        playerSpace: createBoardTargetInputSlot("space"),
        edge: createBoardTargetInputSlot("edge"),
        vertex: createBoardTargetInputSlot("vertex"),
        tile: createBoardTargetInputSlot("tile"),
      },
    };
  }

  function createZoneCardsComponent(zones: readonly string[]) {
    return ({
      empty,
      children,
      ...props
    }: {
      empty?: ReactNode;
      children: (card: Card) => ReactNode;
    } & Omit<ZoneListProps, "children" | "empty">) =>
      createElement(
        ReactFragment,
        null,
        ...zones.map((zone) =>
          createElement(baseUI.Zone.Root, {
            key: zone,
            zone: zone as never,
            children: createElement(runtimeZone.List, {
              ...props,
              empty,
              children,
            }),
          }),
        ),
      );
  }

  function createHandCardsComponent(options: WorkspaceHandComponentOptions) {
    return ({
      empty,
      children,
      className,
      layout,
      mobileInteraction,
      cardSize,
      ariaLabel,
      dropTargets,
      renderDropTargets,
      onCardIntent,
      renderSummary,
      renderActions,
      onSelectionSummary,
      ...props
    }: {
      empty?: ReactNode;
      children: (card: Card, state: InteractionVisualState) => ReactNode;
      className?: string;
      layout?: HandLayoutKind | HandLayoutPolicy;
      mobileInteraction?: HandInteractionPolicy;
      cardSize?: "sm" | "md" | "lg";
      ariaLabel?: string;
      dropTargets?: ReadonlyArray<{
        target:
          | { kind: "card"; card: string }
          | { kind: "space"; target: string }
          | { kind: "edge"; target: string }
          | { kind: "vertex"; target: string }
          | { kind: "tile"; target: string };
        label: string;
        render: (state: CardDropTargetVisualState) => ReactNode;
        className?: string;
        role?: string;
        order?: number;
      }>;
      renderDropTargets?: (children: ReactNode) => ReactNode;
      onCardIntent?: (intent: AuthoredCardIntent) => void;
      renderSummary?: (summary: HandSelectionSummary) => ReactNode;
      renderActions?: (summary: HandSelectionSummary) => ReactNode;
      onSelectionSummary?: (summary: HandSelectionSummary) => void;
    } & Omit<ZoneListProps, "children" | "empty">) =>
      createElement(baseUI.Zone.Root, {
        zone: options.zone as never,
        // Fill the author's container instead of shrink-wrapping to the fan's
        // own measured width. Without a definite width here, a centering parent
        // sizes to the cards row, the hand measures that, recomputes a new fan
        // width, and the layout chases itself (a ResizeObserver loop). `w-full`
        // pins the outermost hand element to the available width and breaks the
        // cycle for every author layout.
        className: "w-full min-w-0",
        children: createElement(GeneratedHandCards, {
          ...props,
          hand: options,
          className,
          empty,
          children,
          layout,
          mobileInteraction,
          cardSize,
          ariaLabel,
          dropTargets,
          renderDropTargets,
          onCardIntent,
          renderSummary,
          renderActions,
          onSelectionSummary,
        }),
      });
  }

  function GeneratedHandCards({
    hand,
    empty,
    children,
    className,
    sort,
    layout,
    mobileInteraction,
    cardSize,
    ariaLabel,
    dropTargets,
    renderDropTargets,
    onCardIntent,
    renderSummary,
    renderActions,
    onSelectionSummary,
  }: {
    hand: WorkspaceHandComponentOptions;
    empty?: ReactNode;
    children: (card: Card, state: InteractionVisualState) => ReactNode;
    className?: string;
    layout?: HandLayoutKind | HandLayoutPolicy;
    mobileInteraction?: HandInteractionPolicy;
    cardSize?: "sm" | "md" | "lg";
    ariaLabel?: string;
    dropTargets?: ReadonlyArray<{
      target:
        | { kind: "card"; card: string }
        | { kind: "space"; target: string }
        | { kind: "edge"; target: string }
        | { kind: "vertex"; target: string }
        | { kind: "tile"; target: string };
      label: string;
      render: (state: CardDropTargetVisualState) => ReactNode;
      className?: string;
      role?: string;
      order?: number;
    }>;
    renderDropTargets?: (children: ReactNode) => ReactNode;
    onCardIntent?: (intent: AuthoredCardIntent) => void;
    renderSummary?: (summary: HandSelectionSummary) => ReactNode;
    renderActions?: (summary: HandSelectionSummary) => ReactNode;
    onSelectionSummary?: (summary: HandSelectionSummary) => void;
  } & Omit<ZoneListProps, "children" | "empty">) {
    const isMobile = useIsMobile();
    const { items, count } = useZoneCards({ sort });
    // One predictable presentation for every hand: the projected surface
    // (fan on desktop, tray on mobile by default). Authors choose other shapes
    // explicitly with `layout` (e.g. layout="strip"). We no longer fall back to
    // a bare scroll strip when no interaction props are passed, so the layout —
    // and the eligible/selected projection — stays consistent across phases.
    const handClassName = clsx("min-h-[112px]", className);
    const resolvedDropTargets = useMemo<RuntimeDropTarget[] | undefined>(() => {
      if (!dropTargets || dropTargets.length === 0) return undefined;
      return dropTargets.map((dt) => {
        const value =
          dt.target.kind === "card" ? dt.target.card : dt.target.target;
        return {
          targetId: dropTargetIdFor(dt.target.kind, value),
          label: dt.label,
          render: dt.render,
          className: dt.className,
          role: dt.role,
          order: dt.order,
        };
      });
    }, [dropTargets]);
    const content = useMemo(
      () =>
        createElement(HandSurfaceView, {
          zone: hand.zone,
          cards: items,
          renderCard: (card, state, _index) => children(card as Card, state),
          layout,
          mobileInteraction,
          dropTargets: resolvedDropTargets,
          renderDropTargets,
          cardSize,
          renderEmpty: empty !== undefined ? () => empty : undefined,
          ariaLabel,
          onIntentRouted: onCardIntent
            ? (intent) => onCardIntent(intent)
            : undefined,
          renderSummary,
          renderActions,
          onSelectionSummary,
          className: handClassName,
        } satisfies HandSurfaceViewProps<(typeof items)[number]>),
      [
        ariaLabel,
        cardSize,
        children,
        empty,
        hand.zone,
        handClassName,
        items,
        layout,
        mobileInteraction,
        onCardIntent,
        onSelectionSummary,
        renderActions,
        renderDropTargets,
        renderSummary,
        resolvedDropTargets,
      ],
    );
    const active = items.some(
      (item) =>
        !item.hidden &&
        item.interactions.some((descriptor) =>
          isInteractionAvailable(descriptor),
        ),
    );
    const autoOpen = items.some(
      (item) =>
        !item.hidden &&
        item.interactions.some(
          (descriptor) =>
            isInteractionAvailable(descriptor) &&
            descriptor.inputs.some(
              (input) =>
                input.domain.type === "cardTarget" &&
                input.domain.selection?.mode === "many",
            ),
        ),
    );
    const version = items
      .map((item) =>
        item.hidden
          ? `${item.id}:hidden`
          : `${item.id}:${item.cardType}:${JSON.stringify(item.properties)}`,
      )
      .join("|");
    const registration = useMemo(
      () => ({
        id: `${hand.name}:${hand.zone}`,
        zone: hand.zone,
        label: hand.label,
        role: hand.role,
        order: hand.order,
        version,
        count,
        active,
        autoOpen,
        content: createElement(baseUI.Zone.Root, {
          zone: hand.zone as never,
          children: content,
        }),
      }),
      [
        active,
        autoOpen,
        content,
        count,
        hand.label,
        hand.name,
        hand.order,
        hand.role,
        hand.zone,
        version,
      ],
    );
    useRegisterMobileHand(registration);

    return isMobile ? null : content;
  }

  function createZoneCardComponent() {
    return ({
      card,
      children,
      className,
      ...props
    }: {
      card: Card;
      children?: ReactNode;
    } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value">) => {
      const cardId = options.cardIdFromZoneCard(card);
      const zone = options.zoneIdFromZoneCard(card);
      const viewCard = cardRenderItemToViewCard(card, cardId);
      const faceDown =
        !!card &&
        typeof card === "object" &&
        "hidden" in card &&
        (card as { hidden?: unknown }).hidden === true;
      const renderCardFace = (state: InteractionCardInputRenderState) =>
        createElement(CardFace, {
          card: viewCard,
          selected: state.selected,
          disabled: state.disabled || !state.eligible,
          faceDown,
          size: "sm",
          children,
        });
      const match = usePluginState((state: PluginStateSnapshot) => {
        const candidates =
          state.gameplay.zones[zone]?.playableByCardId[cardId] ?? [];
        for (const descriptor of candidates) {
          const input = descriptor.inputs.find(
            (candidateInput) =>
              candidateInput.domain.type === "cardTarget" &&
              candidateInput.domain.projection === "resolved" &&
              candidateInput.domain.eligibleTargets.includes(cardId),
          );
          if (input) return { descriptor, input };
        }
        return null;
      });
      if (!match) {
        return createElement(
          "div",
          {
            ...props,
            className: clsx("relative inline-flex", className),
            "data-dreamboard-zone-card": "",
            "data-card-id": cardId,
            "data-zone": zone,
            "data-interactive": false,
          },
          createElement(CardFace, {
            card: viewCard,
            faceDown,
            size: "sm",
            children,
          }),
        );
      }
      return createElement(baseUI.Zone.Root, {
        zone: zone as never,
        children: createElement(runtimeInteraction.Root, {
          interaction: match.descriptor.interactionKey,
          children: createElement(runtimeInteraction.CardInput, {
            ...props,
            className: clsx(DEFAULT_ZONE_CARD_CLASS, className),
            input: match.input.key,
            unsafeCardId: cardId,
            children: renderCardFace,
          }),
        }),
      });
    };
  }

  const Board = {
    surface<Board extends string>(
      board: Board,
    ): WorkspaceBoardSurfaceDescriptor<Board> {
      return { kind: "board", board };
    },
    useSurface: useBoardSurface,
    HexView({ board: boardId, ...props }: { board: string }) {
      return createElement(
        baseUI.Board.HexView as never,
        {
          ...props,
          board: options.hexStaticBoards[boardId],
        } as BoardHexViewProps<never, never>,
      ) as ReactElement;
    },
    HexGrid({ board: boardId, ...props }: { board: string }) {
      return createElement(
        baseUI.Board.HexGrid as never,
        {
          ...props,
          board: options.hexStaticBoards[boardId],
        } as BoardHexGridProps<never, never>,
      ) as ReactElement;
    },
  };

  function createStagingComponent(options: WorkspaceHandComponentOptions) {
    return ({
      children,
      label,
      renderEmptySlot,
      cardSize,
      ariaLabel,
      className,
    }: {
      children: (card: Card) => ReactNode;
      label?: ReactNode;
      renderEmptySlot?: (index: number) => ReactNode;
      cardSize?: "sm" | "md" | "lg";
      ariaLabel?: string;
      className?: string;
    }) =>
      createElement(HandStagingView, {
        zone: options.zone,
        renderCard: (card) => children(card as Card),
        renderEmptySlot,
        label,
        cardSize,
        ariaLabel,
        className,
      });
  }

  const Zone = {
    hand<Zone extends string>(
      zone: Zone,
      options: Omit<WorkspaceHandSurfaceDescriptor<Zone>, "kind" | "zone">,
    ): WorkspaceHandSurfaceDescriptor<Zone> {
      return { kind: "hand", zone, ...options };
    },
    pile<Zone extends string>(
      zone: Zone,
    ): WorkspacePileSurfaceDescriptor<Zone> {
      return { kind: "pile", zone };
    },
    piles<const Zones extends readonly string[]>(
      zones: Zones,
    ): WorkspacePilesSurfaceDescriptor<Zones> {
      return { kind: "piles", zones };
    },
    collection<const Zones extends readonly string[]>(
      zones: Zones,
      options: { mode?: "all" | "top-card" } = {},
    ): WorkspaceCardCollectionSurfaceDescriptor<Zones> {
      return { kind: "cardCollection", zones, mode: options.mode };
    },
    useHand(_name: string, zoneOptions: WorkspaceHandOptions) {
      const handComponentOptions = {
        name: _name,
        zone: zoneOptions.zone,
        role: zoneOptions.role,
        label: zoneOptions.label,
        order: zoneOptions.order,
      };
      return {
        Hand: createHandCardsComponent(handComponentOptions),
        Card: createZoneCardComponent(),
        Staging: createStagingComponent(handComponentOptions),
        slot: { card: createCardInputSlot() },
      };
    },
    usePile(_name: string, zoneOptions: { zone: string }) {
      return {
        Pile: createZoneCardsComponent([zoneOptions.zone]),
        Card: createZoneCardComponent(),
      };
    },
    useCardCollection(
      _name: string,
      zoneOptions: { zones: readonly string[]; mode?: "all" | "top-card" },
    ) {
      void zoneOptions.mode;
      return {
        Collection: createZoneCardsComponent(zoneOptions.zones),
        Card: createZoneCardComponent(),
        slot: { card: createCardInputSlot() },
      };
    },
  };

  const Interaction = {
    State: baseUI.Interaction.State,
    Dialog: baseUI.Interaction.Dialog,
    useForm: useInteractionFormSurface,
    form<const Interaction extends string>(
      interaction: Interaction,
    ): WorkspaceInteractionFormDescriptor<Interaction> {
      return { kind: "form", interaction };
    },
    forms<const Interactions extends Readonly<Record<string, string>>>(
      interactions: Interactions,
    ): WorkspaceInteractionFormsDescriptor<Interactions> {
      return { kind: "forms", interactions };
    },
    Routes: InteractionRoutes,
  };

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isSurfaceDescriptor(
    value: unknown,
  ): value is WorkspaceSurfaceDescriptor {
    return (
      isPlainObject(value) &&
      typeof (value as { kind?: unknown }).kind === "string"
    );
  }

  function resolveSurfaceDescriptor(
    name: string,
    descriptor: WorkspaceSurfaceDescriptor,
  ): unknown {
    switch (descriptor.kind) {
      case "board":
        return Board.useSurface(name);
      case "hand":
        return Zone.useHand(name, {
          zone: descriptor.zone,
          role: descriptor.role,
          label: descriptor.label,
          order: descriptor.order,
        });
      case "pile":
        return Zone.usePile(name, { zone: descriptor.zone });
      case "piles":
        return Object.fromEntries(
          descriptor.zones.map((zone) => [
            zone,
            Zone.usePile(String(zone), { zone }),
          ]),
        );
      case "cardCollection":
        return Zone.useCardCollection(name, {
          zones: descriptor.zones,
          mode: descriptor.mode,
        });
      case "form":
        return useInteractionFormSurface(descriptor.interaction);
      case "forms":
        return Object.fromEntries(
          Object.entries(descriptor.interactions).map(([key, interaction]) => [
            key,
            useInteractionFormSurface(interaction),
          ]),
        );
    }
  }

  function resolveSurfaceSpec(spec: WorkspaceSurfaceSpec): unknown {
    return Object.fromEntries(
      Object.entries(spec).map(([key, value]) => [
        key,
        isSurfaceDescriptor(value)
          ? resolveSurfaceDescriptor(key, value)
          : resolveSurfaceSpec(value as WorkspaceSurfaceSpec),
      ]),
    );
  }

  function defineSurfaces<const Spec extends WorkspaceSurfaceSpec>(spec: Spec) {
    return function useDefinedSurfaces() {
      return resolveSurfaceSpec(spec);
    };
  }

  const UI = {
    ...baseUI,
    Root: ({ children, ...props }: UIRootProps) =>
      createElement(ClientParamSchemaProvider, {
        schemas: options.clientParamSchemasByPhase,
        children: createElement(ToastProvider, {
          children: createElement(MobileHandTrayProvider, {
            children: createElement(baseUI.Root, { ...props, children }),
          }),
        }),
      }),
    defineSurfaces,
    Interaction,
    Board,
    Zone,
    ResourceCounter: resourceCounter,
  };

  return UI as WorkspaceUI;
}

export type {
  BoardHexGridProps,
  BoardHexViewProps,
  ClientParamSchemaMap,
  DreamboardUI,
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
  InteractionDialogProps,
  InteractionFormPrimitiveProps,
  InteractionStateProps,
  InteractionSubmitProps,
  InteractionTriggerProps,
  ResourceCounterComponents,
  TypedGame,
  UIContract,
  UIRootProps,
  ZoneCardRenderItem,
  ZoneListProps,
};
