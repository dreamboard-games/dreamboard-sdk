import { useGame } from "@game";
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
  const zone = useGame((game) => game.zones.get(zoneId));
  const cards = zone?.getCards({ sort }) ?? [];
  return (
    <section aria-label={label} className={`db-hand ${className}`}>
      {cards.map((card) => (
        <button
          key={card.id}
          {...card.getProps()}
          aria-label={
            getCardLabel?.(card) ??
            (card.hidden ? "Face-down card" : String(card.id))
          }
          aria-pressed={card.getIsSelected()}
        >
          {renderCard(card)}
        </button>
      ))}
      {cards.length === 0 && <p>No cards</p>}
    </section>
  );
}
