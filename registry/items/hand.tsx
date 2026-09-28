import { useGame, useCardDrag } from "@game";
import type { ReactNode } from "react";
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
/** Native card controls over the selected-seat projection; no hidden card reads. */
export function Hand({
  zoneId,
  label = "Hand",
  className = "",
  renderCard,
  getCardLabel,
  sort,
}: HandProps) {
  const zone = useGame((game) => game.zones.find(zoneId));
  const cards = zone?.getCards({ sort }) ?? [];
  return (
    <section aria-label={label} className={`db-hand ${className}`}>
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
  const drag = useCardDrag(card.id);
  return (
    <div ref={drag.ref} data-dragging={drag.isDragging || undefined}>
      <button
        {...card.getProps()}
        aria-label={label}
        aria-pressed={card.getIsSelected()}
      >
        {children}
      </button>
      {drag.canDrag && (
        <button
          ref={drag.handleRef}
          {...drag.handleProps}
          aria-label={`Drag ${label}`}
        >
          Drag
        </button>
      )}
    </div>
  );
}
