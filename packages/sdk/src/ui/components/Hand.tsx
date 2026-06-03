/**
 * Player hand with adaptive overlap, automatic drawer fallback, and keyboard navigation.
 * For full control, use the `useHandLayout` hook directly.
 */

import { clsx } from "clsx";
import { useCallback, useState } from "react";
import {
  useHandLayout,
  type CardSize,
  type HandLayout,
} from "../hooks/useHandLayout.js";
import { CardFace, type ViewCard } from "./Card.js";
import { HandDock } from "./HandDock.js";
import type { ReactNode } from "react";
import { useTheme } from "../theme/ThemeProvider.js";

export interface HandCardRenderProps<CardData extends ViewCard = ViewCard> {
  card: CardData;
  index: number;
  isHovered: boolean;
  isSelected: boolean;
  x: number;
  y: number;
  zIndex: number;
  cardDimensions: { width: number; height: number };
}

export interface HandDrawerRenderProps<CardData extends ViewCard = ViewCard> {
  cards: readonly CardData[];
  selectedIds: readonly string[];
  cardCount: number;
  selectedCount: number;
  disabled: boolean;
  cardDimensions: { width: number; height: number };
}

export interface HandEmptyRenderProps {
  layout: HandLayout;
}

export interface HandContainerRenderProps {
  totalWidth: number;
  totalHeight: number;
  cardDimensions: { width: number; height: number };
  children: ReactNode;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
}

export interface HandProps<CardData extends ViewCard = ViewCard> {
  cards: readonly CardData[];
  selectedIds?: readonly string[];
  disabled?: boolean;
  cardSize?: CardSize;
  layout?: HandLayout;
  "aria-label"?: string;
  /**
   * Called when a card is clicked. Wired into the default `renderCard`;
   * ignored when the caller supplies a custom `renderCard`.
   */
  onCardClick?: (cardId: string) => void;
  /** Per-card content renderer forwarded to the default `<CardFace>`. */
  renderCardContent?: (card: CardData) => ReactNode;
  /** Defaults to a positioned `<CardFace>` honouring click/selection state. */
  renderCard?: (props: HandCardRenderProps<CardData>) => ReactNode;
  /**
   * Custom drawer fallback for large hands (when `useHandLayout` switches
   * to drawer mode). When omitted, `Hand` renders a `HandDock` bottom drawer
   * automatically.
   */
  renderDrawer?: (props: HandDrawerRenderProps<CardData>) => ReactNode;
  /** Defaults to a subtle "No cards in hand" placeholder. */
  renderEmpty?: (props: HandEmptyRenderProps) => ReactNode;
  renderContainer?: (props: HandContainerRenderProps) => ReactNode;
  className?: string;
}

const EMPTY_SELECTED_IDS: readonly string[] = [];

// DefaultDrawer is intentionally omitted — when no `renderDrawer` prop is
// provided, `Hand` automatically renders a `HandDock` bottom drawer instead
// (see the drawer-mode branch in the `Hand` component below).
// This gives large hands a proper mobile-friendly expandable UI for free.

function DefaultEmpty(): ReactNode {
  const theme = useTheme();
  return (
    <span
      style={{
        fontFamily: theme.typography.fontFamily.body,
        fontSize: theme.typography.fontSize.xs,
        color: theme.semantic.text.disabled,
      }}
    >
      No cards in hand
    </span>
  );
}

interface ClickableCardFaceProps<CardData extends ViewCard = ViewCard> {
  card: CardData;
  selected?: boolean;
  disabled?: boolean;
  size?: CardSize;
  onCardClick?: (cardId: CardData["id"]) => void;
  renderContent?: (card: CardData) => ReactNode;
}

function ClickableCardFace<CardData extends ViewCard = ViewCard>({
  card,
  selected,
  disabled,
  size,
  onCardClick,
  renderContent,
}: ClickableCardFaceProps<CardData>) {
  const interactive = !disabled && Boolean(onCardClick);
  const handleActivate = () => {
    if (!interactive) return;
    onCardClick?.(card.id);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected ? true : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
      className={clsx(
        "border-0 bg-transparent p-0",
        "focus-visible:outline-none",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
      style={{ all: "unset" }}
    >
      <CardFace
        card={card}
        selected={selected}
        disabled={disabled}
        size={size}
        renderContent={renderContent}
      />
    </button>
  );
}

/**
 * Hand component with customizable rendering via render props.
 *
 * `renderCard`, `renderDrawer`, and `renderEmpty` are all optional — the
 * defaults render the built-in `<CardFace>` with the supplied `onCardClick` /
 * `renderCardContent`, a compact drawer fallback on small screens, and a
 * muted empty placeholder. Override any of them when you need a different
 * visual treatment.
 *
 * For complete control over layout and interactions, use the
 * `useHandLayout` hook directly.
 *
 * @example Zero-config
 * ```tsx
 * <Hand cards={cards} onCardClick={(id) => play(id)} />
 * ```
 *
 * @example Custom card content
 * ```tsx
 * <Hand
 *   cards={cards}
 *   onCardClick={(id) => play(id)}
 *   renderCardContent={(card) => <DevCardFace card={card} />}
 * />
 * ```
 */
export function Hand<CardData extends ViewCard = ViewCard>({
  cards,
  selectedIds = EMPTY_SELECTED_IDS,
  disabled = false,
  cardSize = "md",
  layout = "overlap",
  "aria-label": ariaLabel = "Your hand",
  onCardClick,
  renderCardContent,
  renderCard,
  renderDrawer,
  renderEmpty,
  renderContainer,
  className,
}: HandProps<CardData>) {
  const defaultRenderCard = useCallback(
    (props: HandCardRenderProps<CardData>): ReactNode => (
      <div
        key={props.card.id}
        className="absolute bottom-0 transition-all duration-150 ease-out"
        style={{
          left: props.x,
          zIndex: props.zIndex,
          transform: `translateY(${props.y}px)`,
        }}
      >
        <ClickableCardFace
          card={props.card}
          selected={props.isSelected}
          disabled={disabled}
          size={cardSize}
          onCardClick={onCardClick}
          renderContent={renderCardContent}
        />
      </div>
    ),
    [cardSize, disabled, onCardClick, renderCardContent],
  );
  const effectiveRenderCard = renderCard ?? defaultRenderCard;
  const effectiveRenderEmpty = renderEmpty ?? DefaultEmpty;
  const cardCount = cards.length;
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const {
    containerRef,
    cardsContainerRef,
    totalWidth,
    useDrawerMode,
    cardDimensions,
    constants,
    hoveredIndex,
    handleMouseMove,
    handleMouseLeave,
    handleTouchMove,
    handleTouchEnd,
    getCardPosition,
  } = useHandLayout({
    cardCount,
    cardSize,
    layout,
  });

  const selectedCount = cards.filter((c) => selectedIds.includes(c.id)).length;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (cardCount === 0) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((prev) => (prev <= 0 ? cardCount - 1 : prev - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((prev) => (prev >= cardCount - 1 ? 0 : prev + 1));
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(cardCount - 1);
          break;
      }
    },
    [cardCount],
  );

  // Drawer mode — too many cards to show inline.
  // If the caller provides a custom `renderDrawer`, delegate entirely to it.
  // Otherwise render a `HandDock` bottom drawer so the hand is always
  // reachable on mobile without any extra author wiring.
  if (useDrawerMode && layout === "overlap" && cardCount > 0) {
    if (renderDrawer) {
      return (
        <div
          ref={containerRef}
          className={clsx(
            "relative w-full flex items-center justify-center py-4",
            className,
          )}
          role="group"
          aria-label={`${ariaLabel} - ${cardCount} card${cardCount !== 1 ? "s" : ""}`}
        >
          {renderDrawer({
            cards,
            selectedIds,
            cardCount,
            selectedCount,
            disabled,
            cardDimensions,
          })}
        </div>
      );
    }

    // Default: HandDock bottom drawer with the cards in a wrap grid.
    // The outer div is kept for the containerRef measurement; HandDock itself
    // is fixed-position and renders outside normal flow.
    return (
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full flex items-center justify-center",
          className,
        )}
        role="group"
        aria-label={`${ariaLabel} - ${cardCount} card${cardCount !== 1 ? "s" : ""}`}
      >
        <HandDock
          label={ariaLabel}
          count={cardCount}
          presentation={{ mode: "drawer", placement: "bottom-center" }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "4px 0 8px",
              justifyContent: "center",
            }}
          >
            {cards.map((card) => (
              <ClickableCardFace
                key={card.id}
                card={card}
                selected={selectedIds.includes(card.id)}
                disabled={disabled}
                size={cardSize}
                onCardClick={onCardClick}
                renderContent={renderCardContent}
              />
            ))}
          </div>
        </HandDock>
      </div>
    );
  }

  // Empty hand
  if (cardCount === 0) {
    return (
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full flex items-end justify-center py-4 sm:py-6",
          className,
        )}
        role="group"
        aria-label={`${ariaLabel} - empty`}
      >
        {effectiveRenderEmpty({ layout })}
      </div>
    );
  }

  const renderedCards = cards.map((card, index) => {
    const isSelected = selectedIds.includes(card.id);
    const isFocused = focusedIndex === index;
    const isHovered = hoveredIndex === index || isFocused;
    const position = getCardPosition(index, isHovered, isSelected);

    return effectiveRenderCard({
      card,
      index,
      isHovered,
      isSelected,
      x: position.x,
      y: position.y,
      zIndex: position.zIndex,
      cardDimensions,
    });
  });

  if (layout === "spread") {
    return (
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full flex items-end justify-center py-4 sm:py-6",
          className,
        )}
        role="group"
        aria-label={`${ariaLabel} - ${cardCount} card${cardCount !== 1 ? "s" : ""}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={() => setFocusedIndex(-1)}
      >
        <div className="flex gap-1 justify-center flex-wrap">
          {renderedCards}
        </div>
      </div>
    );
  }

  // Overlap/Stack layout
  const totalHeight = cardDimensions.height + constants.hoverLift + 8;

  const containerProps: HandContainerRenderProps = {
    totalWidth,
    totalHeight,
    cardDimensions,
    children: renderedCards,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };

  // Allow custom container rendering
  if (renderContainer) {
    return (
      <div
        ref={containerRef}
        className={clsx(
          "relative w-full flex items-end justify-center py-4 sm:py-6 overflow-visible",
          className,
        )}
        role="group"
        aria-label={`${ariaLabel} - ${cardCount} card${cardCount !== 1 ? "s" : ""}`}
      >
        {renderContainer(containerProps)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full flex items-end justify-center py-4 sm:py-6 overflow-visible",
        className,
      )}
      role="group"
      aria-label={`${ariaLabel} - ${cardCount} card${cardCount !== 1 ? "s" : ""}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onBlur={() => setFocusedIndex(-1)}
    >
      <div
        ref={cardsContainerRef}
        className="relative"
        style={{
          width: layout === "overlap" ? totalWidth : undefined,
          height: totalHeight,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderedCards}
      </div>
    </div>
  );
}

// Re-export types and hook for users who want full control
export { useHandLayout } from "../hooks/useHandLayout.js";
export type {
  UseHandLayoutOptions,
  UseHandLayoutReturn,
  CardPositionProps,
  CardSize,
  HandLayout,
} from "../hooks/useHandLayout.js";
export type { ViewCard } from "./Card.js";
