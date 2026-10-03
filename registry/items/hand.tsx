import { fanLayout, liftFanCard } from "@dreamboard-games/sdk";
import {
  useDragOverlay,
  useGame,
  type GameCard as Card,
  type CardId,
  type ZoneId,
} from "@game";
import { motion } from "motion/react";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { backImageOf, cardSpring, useMoving, type CardState } from "./card";
import { CardControl } from "./card-control";
import { CardArrival } from "./card-arrival";
import { useCardMotion, type CardPlacement } from "./card-motion";
import { cardDragScale, cardPickup } from "./card";
import "./tokens.css";
export interface HandProps {
  zoneId: ZoneId;
  label?: string;
  className?: string;
  sort?(left: Card, right: Card): number;
  /**
   * Draws a card in the state the hand gives it. Keep it stable, at module
   * scope or in `useCallback`, so a drag renders only the dragged card. The
   * hand owns the card's `layoutId`.
   */
  renderCard(card: Card, state: CardState): ReactNode;
  getCardLabel?(card: Card): string;
}

const EMPTY: readonly CardId[] = [];
const sameIds = (left: readonly CardId[], right: readonly CardId[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);

/**
 * A fanned hand over the selected seat's zone. A tap opens the card's action
 * menu, or toggles it when its only action picks several cards; a hold or a
 * resting mouse previews it; a card with somewhere to land drags. The hand
 * scrolls sideways when the fan is wider than it, and cards arriving with an
 * origin come from the element marked `data-zone` or `data-player` for it.
 */
export function Hand({
  zoneId,
  label = "Hand",
  className = "",
  sort,
  renderCard,
  getCardLabel,
}: HandProps) {
  const ids = useGame(
    (game) =>
      game.zones
        .find(zoneId)
        ?.getCards({ sort })
        .map((card) => card.id) ?? EMPTY,
    { compare: sameIds },
  );
  // Unplayable cards dim only while another card here is playable.
  const choosing = useGame(
    (game) =>
      game.zones
        .find(zoneId)
        ?.getCards()
        .some((card) => card.getIsEligible()) ?? false,
  );
  const overlay = useDragOverlay();
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const table = useCardMotion();
  const snapshot = useGame((game) => game.snapshot);
  const drawTarget = table.drop?.zone === zoneId;
  const drawOver =
    drawTarget && table.drop?.over && table.drop.snapshot === snapshot;
  const probe = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, card: 0, cardHeight: 0 });
  useLayoutEffect(() => {
    if (!scroller) return;
    const measure = () => {
      const style = getComputedStyle(scroller);
      const next = {
        width:
          scroller.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        card: probe.current?.offsetWidth ?? 0,
        cardHeight: probe.current?.offsetHeight ?? 0,
      };
      setSize((previous) =>
        previous.width === next.width &&
        previous.card === next.card &&
        previous.cardHeight === next.cardHeight
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (probe.current) observer.observe(probe.current);
    return () => observer.disconnect();
  }, [scroller]);

  // Room for a lifted card above the fan and beside its end cards.
  const lift = size.cardHeight * 0.16;
  const fan = fanLayout({
    count: ids.length + (drawOver ? 1 : 0),
    width: size.width - lift,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
  });
  const ready = size.width > 0 && size.card > 0;
  const nextFan = fanLayout({
    count: ids.length + 1,
    width: size.width - lift,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
  });
  // Reserve the same vertical space before pickup, during preview and on arrival.
  const height = size.cardHeight * 1.75 + lift;
  function placement(index: number, layout = fan): CardPlacement {
    const box = scroller!.getBoundingClientRect();
    const style = getComputedStyle(scroller!);
    const card = layout.cards[index];
    return {
      x:
        box.x +
        parseFloat(style.paddingLeft) +
        Math.max(0, (size.width - layout.width - lift) / 2) -
        scroller!.scrollLeft +
        card.x +
        lift / 2,
      y: box.y + parseFloat(style.paddingTop) + card.y + lift,
      width: size.card,
      height: size.cardHeight,
      rotate: card.rotate,
    };
  }
  useLayoutEffect(() => {
    if (!ready) return;
    return table.registerHand(zoneId, () => placement(ids.length, nextFan));
  });

  const dragged = overlay ? ids.indexOf(overlay.cardId) : -1;

  return (
    <>
      <section
        ref={setScroller}
        aria-label={label}
        data-zone={zoneId}
        data-draw-target={drawTarget || undefined}
        data-draw-over={drawOver || undefined}
        className={`db-hand ${className}`}
      >
        <div
          className="db-hand-fan"
          style={{ width: fan.width + lift, height }}
        >
          <div
            ref={probe}
            className="db-card"
            aria-hidden
            style={{ position: "absolute", visibility: "hidden" }}
          />
          {ready &&
            ids.map((id, index) => (
              <HandCard
                key={id}
                cardId={id}
                zoneId={zoneId}
                index={index}
                x={fan.cards[index].x + lift / 2}
                y={fan.cards[index].y + lift}
                rotate={fan.cards[index].rotate}
                lift={lift}
                choosing={choosing}
                renderCard={renderCard}
                getCardLabel={getCardLabel}
                destination={() => placement(index)}
              />
            ))}
          {ready && drawOver && (
            <div
              className="db-draw-insertion"
              aria-hidden
              style={{
                width: size.card,
                height: size.cardHeight,
                transform: `translate(${fan.cards[ids.length].x + lift / 2}px, ${fan.cards[ids.length].y + lift}px) rotate(${fan.cards[ids.length].rotate}deg)`,
              }}
            />
          )}
        </div>
        {ids.length === 0 && <p className="db-hand-empty">No cards</p>}
      </section>
      {overlay &&
        dragged >= 0 &&
        createPortal(
          <div ref={overlay.ref} className="db-drag-overlay">
            <DragCopy
              cardId={overlay.cardId}
              rotate={fan.cards[dragged]?.rotate ?? 0}
              renderCard={renderCard}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/** A card arriving from elsewhere starts there, turning face up if it was hidden. */
function entryFrom(
  card: Card | undefined,
  zoneId: ZoneId,
  table: ReturnType<typeof useCardMotion>,
): {
  box: CardPlacement | null;
  hidden: boolean;
  destination?: CardPlacement;
} | null {
  const origin = card?.getOrigin();
  if (!origin) return null;
  if ("zone" in origin && origin.zone === zoneId)
    return origin.hidden ? { box: null, hidden: true } : null;
  const released =
    "zone" in origin ? table.getDrawOrigin(origin.zone, zoneId) : null;
  if (released)
    return {
      box: released.from,
      destination: released.to,
      hidden: origin.hidden,
    };
  const from = document.querySelector(
    "zone" in origin
      ? `[data-zone="${CSS.escape(origin.zone)}"]`
      : `[data-player="${CSS.escape(origin.player)}"]`,
  );
  if (from) {
    const { x, y, width, height } = from.getBoundingClientRect();
    return { box: { x, y, width, height, rotate: 0 }, hidden: origin.hidden };
  }
  return origin.hidden ? { box: null, hidden: true } : null;
}

interface HandCardProps {
  cardId: CardId;
  zoneId: ZoneId;
  index: number;
  x: number;
  y: number;
  rotate: number;
  lift: number;
  choosing: boolean;
  renderCard: HandProps["renderCard"];
  getCardLabel: HandProps["getCardLabel"];
  destination(): CardPlacement;
}
const HandCard = memo(function HandCard({
  cardId,
  zoneId,
  index,
  x,
  y,
  rotate,
  lift,
  choosing,
  renderCard,
  getCardLabel,
  destination,
}: HandCardProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const table = useCardMotion();
  const [arrival, setArrival] = useState(() => entryFrom(card, zoneId, table));
  const finishArrival = useCallback(() => setArrival(null), []);
  const moving = useMoving();
  if (!card) return null;
  return (
    <CardControl
      cardId={cardId}
      drag={{}}
      choosing={choosing}
      disabled={!!arrival}
      style={{ visibility: arrival ? "hidden" : undefined }}
      renderCard={renderCard}
      getCardLabel={getCardLabel}
    >
      {({ raised, anchor, control }) => {
        const place = raised
          ? liftFanCard({ x, y, rotate }, lift)
          : { x, y, rotate };
        return (
          <motion.div
            layoutId={arrival ? undefined : cardId}
            className="db-hand-slot"
            initial={false}
            animate={{ ...place, scale: 1, rotateY: 0 }}
            transition={cardSpring}
            {...moving}
            style={{ zIndex: index, transformPerspective: 600 }}
          >
            {control}
            {arrival && anchor && (
              <CardArrival
                origin={arrival.box}
                hidden={arrival.hidden}
                target={anchor}
                destination={arrival.destination ?? destination()}
                rotate={rotate}
                back={backImageOf(card)}
                onComplete={finishArrival}
              >
                {renderCard(card, "idle")}
              </CardArrival>
            )}
          </motion.div>
        );
      }}
    </CardControl>
  );
});

/** The dragged card under the pointer; it shares the card's `layoutId`, so Motion carries it out of the fan and back. */
function DragCopy({
  cardId,
  rotate,
  renderCard,
}: {
  cardId: CardId;
  rotate: number;
  renderCard: HandProps["renderCard"];
}) {
  const card = useGame((game) => game.cards.find(cardId));
  return card ? (
    <motion.div
      layoutId={cardId}
      initial={{ rotate }}
      animate={{ rotate: 0, scale: cardDragScale }}
      transition={cardPickup}
    >
      {renderCard(card, "selected")}
    </motion.div>
  ) : null;
}
