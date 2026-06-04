/**
 * Central game board area for active game components (tricks, played
 * cards, zones, etc.).
 *
 * Visual chrome (frame, empty placeholder, card entrance/exit) is
 * sourced from the active {@link useTheme} so the play area re-skins
 * with the rest of the shell.
 */

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { CardFace, type CardFaceProps, type ViewCard } from "./Card.js";
import { useTheme } from "../theme/ThemeProvider.js";
import { chipStyle } from "../theme/derive.js";

export interface PlayAreaProps<CardData extends ViewCard = ViewCard> {
  cards: readonly CardData[];
  filter?: (card: CardData) => boolean;
  cardSize?: CardFaceProps["size"];
  renderCard?: CardFaceProps<CardData>["renderContent"];
  layout?: "grid" | "row";
  interactive?: boolean;
  onCardClick?: (cardId: string) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * @example
 * ```tsx
 * <PlayArea cards={trickCards} layout="row" renderCard={(card) => <PlayingCard card={card} />} />
 * ```
 */
export function PlayArea<CardData extends ViewCard = ViewCard>({
  cards,
  filter,
  cardSize = "md",
  renderCard,
  layout = "row",
  interactive = false,
  onCardClick,
  "aria-label": ariaLabel = "Play area",
  className,
}: PlayAreaProps<CardData>) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const visibleCards = filter ? cards.filter(filter) : cards;

  const layoutClasses = {
    grid: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6",
    row: "flex flex-wrap items-center justify-center gap-3 sm:gap-6",
  };

  return (
    <div
      className={clsx(
        "relative w-full min-h-[200px] sm:min-h-[300px] p-6 sm:p-8",
        className,
      )}
      style={{
        background: theme.semantic.surface.inset,
        border: `2px dashed ${theme.semantic.border.default}`,
        borderRadius: theme.radius.hud,
        fontFamily: theme.typography.fontFamily.body,
        color: theme.semantic.text.primary,
      }}
      role="region"
      aria-label={`${ariaLabel} - ${visibleCards.length} item${visibleCards.length !== 1 ? "s" : ""}`}
    >
      <AnimatePresence mode="popLayout">
        {visibleCards.length === 0 ? (
          <motion.div
            className="flex items-center justify-center h-full absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <div
              style={{
                ...chipStyle(theme, { variant: "warning", size: "md" }),
                fontSize: theme.typography.fontSize.md,
                paddingBlock: theme.space[2],
                paddingInline: theme.space[4],
              }}
            >
              No cards in play
            </div>
          </motion.div>
        ) : (
          <div className={layoutClasses[layout]}>
            {visibleCards.map((card, index) => (
              <motion.div
                key={card.id}
                layout={!reducedMotion}
                initial={
                  reducedMotion
                    ? { opacity: 0, scale: 1 }
                    : { opacity: 0, scale: 0.8 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: reducedMotion ? 0 : index * 0.05,
                }}
              >
                {interactive && onCardClick ? (
                  <button
                    type="button"
                    aria-label={card.name ?? `Card ${card.id}`}
                    onClick={() => onCardClick(card.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onCardClick(card.id);
                      }
                    }}
                    className="border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-none"
                    style={{ all: "unset", cursor: "pointer" }}
                  >
                    <CardFace
                      card={card}
                      size={cardSize}
                      renderContent={renderCard}
                    />
                  </button>
                ) : (
                  <CardFace
                    card={card}
                    size={cardSize}
                    renderContent={renderCard}
                    disabled={!interactive}
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
