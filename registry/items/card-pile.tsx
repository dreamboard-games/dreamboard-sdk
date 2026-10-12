import {
  useDragOverlay,
  useZonePresentation,
  type GameCard,
  type ZoneId,
} from "@game";
import type { ComponentProps, ReactNode } from "react";
import { CardBack } from "./card";
import { Pile } from "./pile";
import "./card-pile.css";

export type CardPileProps = Omit<ComponentProps<"div">, "children"> & {
  zoneId: ZoneId;
  hostId: GameCard["hostId"];
  label: string;
  /** Aggregate count for a zone whose card identities are not projected. */
  count?: number;
  /** The authored control, including selection, actions and drag policy. */
  renderCard(card: GameCard, arriving: boolean): ReactNode;
  /** An inert face beneath lifted cards. Do not render another card control. */
  renderFace(card: GameCard): ReactNode;
};

/** A top-first pile that keeps the lifted control alive until its drag settles. */
export function CardPile({
  zoneId,
  hostId,
  label,
  count,
  renderCard,
  renderFace,
  className = "",
  ...props
}: CardPileProps) {
  const presentation = useZonePresentation(zoneId, hostId);
  const { cards, arrivingIds } = presentation;
  const overlay = useDragOverlay();
  const liftedIds = overlay && !overlay.settling ? overlay.cardIds : [];
  const lifted = cards.filter((card) => liftedIds.includes(card.id));
  const next = lifted.length
    ? cards.find((card) => !liftedIds.includes(card.id))
    : undefined;
  const top = cards[0];
  return (
    <div {...props} className={`db-card-pile ${className}`}>
      <Pile count={(count ?? presentation.count) - lifted.length} label={label}>
        {next ? (
          <div aria-hidden className="db-card-pile-underneath">
            {renderFace(next)}
          </div>
        ) : !top ? (
          <CardBack />
        ) : null}
      </Pile>
      {top ? (
        <div key={top.id} className="db-card-pile-control">
          {renderCard(top, arrivingIds.includes(top.id))}
        </div>
      ) : null}
    </div>
  );
}
