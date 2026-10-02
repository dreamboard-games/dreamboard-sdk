import { useGame, useCardGesture, useDragOverlay } from "@game";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./tokens.css";
type Model = Parameters<Parameters<typeof useGame>[0]>[0];
type ZoneId = Parameters<Model["zones"]["get"]>[0];
type Card = NonNullable<ReturnType<Model["cards"]["get"]>>;
export interface HandProps {
  zoneId: ZoneId;
  label?: string;
  className?: string;
  sort?(left: Card, right: Card): number;
  renderCard(card: Card): ReactNode;
  getCardLabel?(card: Card): string;
}
/**
 * Native card controls over the selected-seat projection; no hidden card reads.
 * Tap selects, holding inspects, and a card with somewhere to land drags.
 */
export function Hand({
  zoneId,
  label = "Hand",
  className = "",
  renderCard,
  getCardLabel,
  sort,
}: HandProps) {
  const zone = useGame((game) => game.zones.find(zoneId));
  const overlay = useDragOverlay();
  const cards = zone?.getCards({ sort }) ?? [];
  const dragged = overlay && cards.find((card) => card.id === overlay.cardId);
  return (
    <section
      aria-label={label}
      className={`db-hand flex items-start gap-2 overflow-x-auto p-2 ${className}`}
    >
      {cards.map((card) => (
        <HandCard
          key={card.id}
          card={card}
          label={
            getCardLabel?.(card) ??
            (card.hidden ? "Face-down card" : String(card.id))
          }
        >
          {renderCard(card)}
        </HandCard>
      ))}
      {cards.length === 0 && <p>No cards</p>}
      {dragged &&
        createPortal(
          <div ref={overlay.ref} className="z-50">
            {renderCard(dragged)}
          </div>,
          document.body,
        )}
    </section>
  );
}

function HandCard({
  card,
  label,
  children,
}: {
  card: Card;
  label: string;
  children: ReactNode;
}) {
  const gesture = useCardGesture(card.id);
  return (
    <button
      className="shrink-0 rounded-lg border-0 bg-transparent p-0 outline-ring outline-offset-2 aria-pressed:outline-3 focus-visible:outline-3 data-dragging:opacity-40"
      {...card.getProps()}
      {...gesture.props}
      aria-label={label}
      aria-pressed={card.getIsSelected()}
    >
      {children}
    </button>
  );
}
