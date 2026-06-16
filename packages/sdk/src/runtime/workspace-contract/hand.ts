import type { ReactNode } from "react";
import { createElement, useMemo } from "react";
import { clsx } from "clsx";
import { useIsMobile } from "../../ui.js";
import { useRegisterMobileHand } from "../../ui/components.js";
import { useZoneCards } from "../primitives/index.js";
import {
  HandSurfaceView,
  HandStagingView,
  dropTargetIdFor,
  type HandSelectionSummary,
  type HandSurfaceViewProps,
  type RuntimeDropTarget,
} from "../primitives/hand-surface.js";
import type { AuthoredCardIntent } from "../primitives/hand-intent-adapter.js";
import type {
  CardDropTargetVisualState,
  HandInteractionPolicy,
  HandLayoutKind,
  HandLayoutPolicy,
  InteractionVisualState,
} from "../../ui.js";
import type { ZoneListProps } from "../primitives/zone.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import type {
  WorkspaceContractContext,
  WorkspaceHandComponentOptions,
} from "./types.js";

/**
 * Builds the hand-surface pieces for one workspace contract. Called once per
 * `createWorkspaceUIContract` invocation so `GeneratedHandCards` keeps a
 * single stable component identity per contract (its `useRegisterMobileHand`
 * registration depends on this).
 */
export function createHandPieces<Card>(ctx: WorkspaceContractContext<Card>) {
  const { baseUI } = ctx;

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
          renderCard: (card, state) => children(card as Card, state),
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

  return { createHandCardsComponent, createStagingComponent };
}
