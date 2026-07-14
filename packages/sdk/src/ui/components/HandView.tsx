/**
 * Controlled, presentational hand view.
 *
 * `HandView` does not consume any Dreamboard descriptor or runtime state.
 * Callers supply:
 *
 * - the cards to render
 * - a `stateForCard(card)` function returning a controlled
 *   {@link InteractionVisualState}
 * - a `renderCard(card, state)` slot for the visual surface (typically
 *   a {@link CardFace})
 *
 * The component emits generic {@link CardIntent} events. A runtime
 * adapter is responsible for turning an `activate`/`drop` intent into a
 * Dreamboard submission.
 *
 * `mobileInteraction` selects the gesture policy:
 * - `direct-activate` — desktop tap and keyboard Enter/Space emit a single
 *   `activate` intent.
 * - `drag-to-target` — pointer/keyboard lift initiates a drag against a
 *   surrounding `CardDragSurface`. Tap collapses to an `inspecting` state
 *   that does not commit. Drop emits an opaque `drop` intent.
 *
 * Layout, gesture, scroll arbitration and tray presentation are documented in
 * `docs/reference/ui-sdk-mobile-hand-and-card-interactions.md`.
 */

import {
  useCallback,
  useId,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import type {
  CardIntent,
  InteractionVisualState,
} from "../types/visual-state.js";
import type {
  HandPresentationMode,
  FanCardPosition,
} from "./hand-layout-math.js";
import { useHandPresentation } from "../hooks/useHandPresentation.js";
import { useHandCardPointer } from "../hooks/useHandCardPointer.js";
import { useTheme } from "../theme/ThemeProvider.js";
import { useCardDragSurface } from "./card-drag/index.js";
import type { HandInteractionPolicy } from "./hand-pointer-engine.js";

export type HandLayoutKind = HandPresentationMode | "stack";

export interface HandLayoutPolicy {
  desktop?: HandLayoutKind;
  mobile?: HandLayoutKind;
}

export interface HandViewProps<CardData extends ViewCard = ViewCard> {
  cards: readonly CardData[];
  /**
   * Layout policy. Pass a single layout kind to use the same layout in every
   * viewport, or pass `{ desktop, mobile }` for a measured-width decision.
   * Defaults to `{ desktop: "fan", mobile: "tray" }`.
   */
  layout?: HandLayoutKind | HandLayoutPolicy;
  /**
   * Mobile interaction policy. Defaults to `direct-activate`. Use
   * `drag-to-target` together with a surrounding `CardDragSurface` and one
   * or more `CardDropTargetView` children.
   */
  mobileInteraction?: HandInteractionPolicy;
  /** Returns the controlled visual state for a card. */
  stateForCard?: (
    card: CardData,
    index: number,
  ) => InteractionVisualState | undefined;
  /** Visual surface renderer. */
  renderCard: (
    card: CardData,
    state: InteractionVisualState,
    index: number,
  ) => ReactNode;
  /** Generic UI intent callback. */
  onCardIntent?: (intent: CardIntent<CardData["id"] & string>) => void;
  /** Card width hint for fan geometry. */
  cardSize?: "sm" | "md" | "lg";
  /** Slot for the empty state. Defaults to nothing rendered. */
  renderEmpty?: () => ReactNode;
  /** ARIA label for the hand region. */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

const CARD_DIMENSIONS = {
  sm: { width: 80, height: 112 },
  md: { width: 96, height: 144 },
  lg: { width: 128, height: 192 },
} as const;

const EMPTY_STATE: InteractionVisualState = {};

interface ResolvedLayoutPolicy {
  desktop: HandPresentationMode;
  mobile: HandPresentationMode;
  /** What we report on `data-layout` for stories/tests. */
  reported: HandLayoutKind;
}

function resolveLayoutPolicy(
  layout: HandViewProps["layout"],
): ResolvedLayoutPolicy {
  if (!layout) {
    return { desktop: "fan", mobile: "tray", reported: "fan" };
  }
  if (typeof layout === "string") {
    if (layout === "stack") {
      return { desktop: "strip", mobile: "strip", reported: "stack" };
    }
    return { desktop: layout, mobile: layout, reported: layout };
  }
  const desktop =
    layout.desktop === "stack" ? "strip" : (layout.desktop ?? "fan");
  const mobile =
    layout.mobile === "stack" ? "strip" : (layout.mobile ?? "tray");
  return {
    desktop,
    mobile,
    reported: (layout.desktop ?? layout.mobile ?? "fan") as HandLayoutKind,
  };
}

export function HandView<CardData extends ViewCard = ViewCard>({
  cards,
  layout,
  mobileInteraction = "direct-activate",
  stateForCard,
  renderCard,
  onCardIntent,
  cardSize = "md",
  renderEmpty,
  "aria-label": ariaLabel = "Your hand",
  className,
  style,
}: HandViewProps<CardData>) {
  const policy = useMemo(() => resolveLayoutPolicy(layout), [layout]);
  const dims = CARD_DIMENSIONS[cardSize];
  const regionId = useId();
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";

  const presentation = useHandPresentation({
    cardCount: cards.length,
    cardWidth: dims.width,
    cardHeight: dims.height,
    desktop: policy.desktop,
    mobile: policy.mobile,
  });

  const surface = useCardDragSurface();
  const surfaceController = surface?.controller ?? null;

  const emit = useCallback(
    (intent: CardIntent<CardData["id"] & string>) => {
      onCardIntent?.(intent);
    },
    [onCardIntent],
  );

  const items = useMemo(
    () =>
      cards.map((card, index) => {
        const baseState = stateForCard?.(card, index) ?? EMPTY_STATE;
        return { card, index, baseState };
      }),
    [cards, stateForCard],
  );

  const renderLiftedCard = useCallback(
    (cardId: string): ReactNode => {
      const found = items.find((item) => (item.card.id as string) === cardId);
      if (!found) return null;
      return renderCard(found.card, found.baseState, found.index);
    },
    [items, renderCard],
  );

  const resolveCardLabel = useCallback(
    (cardId: string): string | null => {
      const found = items.find((item) => (item.card.id as string) === cardId);
      if (!found) return null;
      const card = found.card as ViewCard;
      return (
        card.name ??
        (card.properties as { title?: string } | undefined)?.title ??
        null
      );
    },
    [items],
  );

  const pointer = useHandCardPointer({
    onIntent: (intent) => emit(intent as CardIntent<CardData["id"] & string>),
    policy: mobileInteraction,
    surface: surfaceController,
    renderLiftedCard,
    resolveCardLabel,
  });

  if (cards.length === 0) {
    return (
      <div
        ref={presentation.containerRef}
        data-dreamboard-hand-view=""
        data-layout={policy.reported}
        data-mode="empty"
        data-empty="true"
        data-mobile-interaction={mobileInteraction}
        role="group"
        aria-label={`${ariaLabel} - empty`}
        className={clsx(
          "relative w-full min-w-0 flex items-end justify-center py-4 sm:py-6",
          className,
        )}
        style={style}
      >
        {renderEmpty ? renderEmpty() : null}
      </div>
    );
  }

  const ariaCount = `${ariaLabel} - ${cards.length} card${cards.length === 1 ? "" : "s"}`;

  const surfacePhase = surfaceController?.phase ?? "idle";
  const surfaceActiveCardId = surfaceController?.activeCardId ?? null;

  const renderItem = (
    {
      card,
      index,
      baseState,
    }: { card: CardData; index: number; baseState: InteractionVisualState },
    extra: { positioned?: FanCardPosition } = {},
  ) => {
    const cardId = card.id as string;
    const isPointerActive = pointer.activeCardId === cardId;
    const isSurfaceActive = surfaceActiveCardId === cardId;
    const previewing =
      isPointerActive && pointer.recognitionState.kind === "preview"
        ? true
        : baseState.previewing;
    const isInspecting = isSurfaceActive && surfacePhase === "inspecting";
    const isDragging = isSurfaceActive && surfacePhase === "dragging";
    const isSettling = isSurfaceActive && surfacePhase === "settling";
    const isReturning = isSurfaceActive && surfacePhase === "returning";
    // Hide the source slot whenever the portal overlay is showing this card
    // (drag, settle, or return). The overlay is the visible card during
    // those phases — leaving the source visible duplicates it.
    const isLifted = isDragging || isSettling || isReturning;
    const state: InteractionVisualState = {
      ...baseState,
      previewing,
    };
    const eligible = state.eligible ?? false;
    const disabled = state.disabled ?? false;
    const bindings = pointer.bindCard({
      cardId,
      eligible,
      disabled,
    });
    const positioned = extra.positioned;
    const transformParts: string[] = [];
    if (positioned) {
      transformParts.push(`translateY(${positioned.translateY}px)`);
      transformParts.push(`rotate(${positioned.rotate}deg)`);
    }
    if (isInspecting && !reducedMotion) {
      transformParts.push("translateY(-12px)", "scale(1.04)");
    }
    const transform = transformParts.length
      ? transformParts.join(" ")
      : undefined;
    const liftVisualOpacity = isLifted ? 0.25 : 1;
    const inspectShadow =
      isInspecting && !reducedMotion
        ? "0 14px 28px rgba(0,0,0,0.18)"
        : undefined;
    return (
      <div
        key={card.id}
        role="gridcell"
        aria-rowindex={1}
        aria-colindex={index + 1}
        id={`${regionId}-${index}`}
        tabIndex={disabled ? -1 : 0}
        data-lifted={isLifted ? "true" : undefined}
        data-returning={isReturning ? "true" : undefined}
        data-inspecting={isInspecting ? "true" : undefined}
        {...bindings}
        style={{
          ...bindings.style,
          opacity: liftVisualOpacity,
          boxShadow: inspectShadow,
          ...(positioned
            ? {
                position: "absolute",
                left: positioned.left,
                bottom: 0,
                zIndex: isInspecting ? 50 : positioned.zIndex,
                transform,
                transformOrigin: "bottom center",
                transition: reducedMotion
                  ? "none"
                  : "transform 180ms ease-out, box-shadow 180ms ease-out",
              }
            : transform
              ? {
                  transform,
                  transformOrigin: "bottom center",
                  transition: reducedMotion
                    ? "none"
                    : "transform 180ms ease-out, box-shadow 180ms ease-out",
                }
              : null),
        }}
      >
        {renderCard(card, state, index)}
      </div>
    );
  };

  if (presentation.mode === "fan" || presentation.mode === "compressed-fan") {
    const totalHeight = dims.height + 24;
    return (
      <div
        ref={presentation.containerRef}
        data-dreamboard-hand-view=""
        data-layout={policy.reported}
        data-mode={presentation.mode}
        data-mobile-interaction={mobileInteraction}
        data-reduced-motion={reducedMotion ? "true" : undefined}
        role="grid"
        aria-label={ariaCount}
        aria-rowcount={1}
        aria-colcount={cards.length}
        className={clsx(
          "relative w-full min-w-0 flex items-end justify-center py-4 sm:py-6 overflow-visible",
          className,
        )}
        style={{
          touchAction: "pan-x",
          ...style,
        }}
      >
        <div
          role="row"
          className="relative"
          style={{
            width: presentation.totalWidth,
            height: totalHeight,
          }}
        >
          {items.map((item, index) =>
            renderItem(item, {
              positioned: presentation.fanPositions[index],
            }),
          )}
        </div>
      </div>
    );
  }

  if (presentation.mode === "tray") {
    return (
      <div
        ref={presentation.containerRef}
        data-dreamboard-hand-view=""
        data-layout={policy.reported}
        data-mode="tray"
        data-mobile-interaction={mobileInteraction}
        data-reduced-motion={reducedMotion ? "true" : undefined}
        role="grid"
        aria-label={ariaCount}
        aria-rowcount={1}
        aria-colcount={cards.length}
        className={clsx("relative w-full min-w-0", className)}
        style={style}
      >
        <div
          role="row"
          tabIndex={0}
          className={clsx(
            "flex items-end gap-3 overflow-x-auto px-4",
            "snap-x scroll-px-4",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
          )}
          style={{
            touchAction: pointer.scrollLocked ? "none" : "pan-x",
            paddingTop: 12,
            paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            scrollBehavior: reducedMotion ? "auto" : "smooth",
          }}
        >
          {items.map((item) => (
            <div
              key={item.card.id}
              className="snap-start shrink-0"
              role="presentation"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // strip / stack — flow-based layout that keeps every card individually
  // touch-usable. Stack layout draws cards with a small horizontal cascade.
  return (
    <div
      ref={presentation.containerRef}
      data-dreamboard-hand-view=""
      data-layout={policy.reported}
      data-mode={presentation.mode}
      data-mobile-interaction={mobileInteraction}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      role="grid"
      aria-label={ariaCount}
      aria-rowcount={1}
      aria-colcount={cards.length}
      className={clsx(
        "relative w-full min-w-0 flex items-end justify-center py-4 sm:py-6",
        className,
      )}
      style={{ touchAction: "pan-x", ...style }}
    >
      <div role="row" className="flex flex-wrap justify-center gap-1">
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  );
}
