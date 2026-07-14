/**
 * Controlled staging zone — a fixed row of card slots for a many-select
 * collection (e.g. "the cards you are passing"). Filled slots render a
 * caller-provided card and are tappable to remove it; the remaining slots
 * render a themed empty placeholder so the zone is always visible (and always
 * an obvious target) even before anything is staged.
 *
 * Purely presentational: it does not read or mutate any Dreamboard draft. A
 * runtime adapter feeds it the staged cards plus an `onRemove` that toggles the
 * card back out of the collection. In a later slice this same surface becomes
 * the drop target for drag-to-stage.
 */

import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import { useTheme } from "../theme/ThemeProvider.js";

export interface StagingZoneProps<CardData extends ViewCard = ViewCard> {
  /** Cards currently staged, in order. */
  cards: readonly CardData[];
  /** Total number of slots to render (e.g. the collector's selection max). */
  slotCount: number;
  /** Card size; empty-slot dimensions match the SDK `CardFace` sizes. */
  size?: "sm" | "md" | "lg";
  /** Visual for a staged card (typically a `CardFace`). */
  renderCard: (card: CardData) => ReactNode;
  /** Fires when a staged card is activated — remove it from the collection. */
  onRemove?: (cardId: string) => void;
  /** Custom empty-slot content. Defaults to an empty dashed placeholder. */
  renderEmptySlot?: (index: number) => ReactNode;
  /** Optional heading rendered above the slots. */
  label?: ReactNode;
  /** Accessible label for the region. */
  "aria-label"?: string;
  className?: string;
}

// Match `CardFace`'s `sizeClasses` so empty slots line up with staged cards.
const SLOT_SIZE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "w-16 h-24 sm:w-20 sm:h-28",
  md: "w-20 h-32 sm:w-24 sm:h-36",
  lg: "w-24 h-36 sm:w-32 sm:h-48",
};

export function StagingZone<CardData extends ViewCard = ViewCard>({
  cards,
  slotCount,
  size = "sm",
  renderCard,
  onRemove,
  renderEmptySlot,
  label,
  "aria-label": ariaLabel = "Staged cards",
  className,
}: StagingZoneProps<CardData>) {
  const theme = useTheme();
  const total = Math.max(0, slotCount, cards.length);
  const slotClass = SLOT_SIZE_CLASS[size];
  const interactive = Boolean(onRemove);

  return (
    <div
      data-dreamboard-staging-zone=""
      data-staged-count={cards.length}
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        "flex flex-col items-center gap-2 rounded-2xl px-4 py-3",
        className,
      )}
      style={{
        background: theme.semantic.surface.inset,
        border: `2px solid ${theme.semantic.border.subtle}`,
      }}
    >
      {label != null ? (
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: theme.semantic.text.muted }}
        >
          {label}
        </span>
      ) : null}
      <div className="flex items-end justify-center gap-2">
        {Array.from({ length: total }, (_, index) => {
          const card = cards[index];
          if (!card) {
            return (
              <div
                key={`empty-${index}`}
                data-dreamboard-staging-slot="empty"
                aria-hidden
                className={clsx(
                  "flex shrink-0 items-center justify-center rounded-xl",
                  slotClass,
                )}
                style={{
                  border: `2px dashed ${theme.semantic.border.subtle}`,
                  color: theme.semantic.text.disabled,
                }}
              >
                {renderEmptySlot ? renderEmptySlot(index) : null}
              </div>
            );
          }
          const cardId = card.id as string;
          return (
            <button
              key={cardId}
              type="button"
              data-dreamboard-staging-slot="filled"
              data-card-id={cardId}
              disabled={!interactive}
              aria-label={
                interactive ? `Remove ${card.name ?? cardId}` : undefined
              }
              onClick={interactive ? () => onRemove?.(cardId) : undefined}
              className={clsx(
                "relative shrink-0 appearance-none border-0 bg-transparent p-0 m-0",
                "transition-transform focus-visible:outline-none",
                interactive
                  ? "cursor-pointer hover:-translate-y-1"
                  : "cursor-default",
              )}
            >
              {renderCard(card)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
