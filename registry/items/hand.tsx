import { fanLayout, liftFanCard } from "@dreamboard-games/sdk";
import {
  useDragOverlay,
  useActiveCard,
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
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { backImageOf, useMoving, type CardState } from "./card";
import { CardControl } from "./card-control";
import { CardArrival } from "./card-arrival";
import {
  useCardMotion,
  type CardPlacement,
  type CardZone,
} from "./card-motion";
import { cardDragScale, cardPickup } from "./card";
import { handFocusLayout, handEnter, handReturn } from "./hand-layout";
import "./tokens.css";
export interface HandProps {
  zoneId: ZoneId;
  hostId: Card["hostId"];
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
 * A fanned hand over one explicitly addressed zone host. A tap opens the card's action
 * menu, or toggles it when its only action picks several cards; a hold or a
 * Alt/Option previews it; a card with somewhere to land drags. The hand
 * scrolls sideways when the fan is wider than it, and cards arriving with an
 * origin come from the element marked `data-zone` and `data-zone-host`,
 * or `data-player`, for it.
 */
export function Hand({
  zoneId,
  hostId,
  label = "Hand",
  className = "",
  sort,
  renderCard,
  getCardLabel,
}: HandProps) {
  const ids = useGame(
    (game) =>
      game.zones
        .find(zoneId, hostId)
        ?.getCards({ sort })
        .map((card) => card.id) ?? EMPTY,
    { compare: sameIds },
  );
  // Unplayable cards dim only while another card here is playable.
  const choosing = useGame(
    (game) =>
      game.zones
        .find(zoneId, hostId)
        ?.getCards()
        .some((card) => card.getIsEligible()) ?? false,
  );
  const overlay = useDragOverlay();
  const activeCardId = useActiveCard();
  const firstCard = useGame((game) =>
    ids.length ? game.cards.find(ids[0]) : undefined,
  );
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const table = useCardMotion();
  const snapshot = useGame((game) => game.snapshot);
  const drawTarget =
    table.drop?.zone.zoneId === zoneId && table.drop.zone.hostId === hostId;
  const drawOver =
    drawTarget && table.drop?.over && table.drop.snapshot === snapshot;
  const probe = useRef<HTMLDivElement>(null);
  const readableProbe = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [size, setSize] = useState({
    width: 0,
    card: 0,
    cardHeight: 0,
    readable: 0,
  });
  useLayoutEffect(() => {
    if (!scroller) return;
    const measure = () => {
      setScrollLeft(scroller.scrollLeft);
      const style = getComputedStyle(scroller);
      const card = probe.current
        ? parseFloat(getComputedStyle(probe.current).width)
        : 0;
      const cardHeight = probe.current
        ? parseFloat(getComputedStyle(probe.current).height)
        : 0;
      const width =
        scroller.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const layout = fanLayout({
        count: ids.length + (drawOver ? 1 : 0),
        width: width - card * 0.7,
        cardWidth: card || 1,
        cardHeight: cardHeight || 1,
      });
      const bottom =
        scroller.getBoundingClientRect().top +
        parseFloat(style.paddingTop) +
        cardHeight * 0.28 +
        layout.height;
      const next = {
        width,
        card,
        cardHeight,
        readable: Math.min(
          readableProbe.current?.offsetWidth ?? 0,
          width,
          (innerHeight * 0.55 * card) / (cardHeight || 1),
          (Math.max(0, bottom - 16) * card) / (cardHeight || 1),
        ),
      };
      setSize((previous) =>
        previous.width === next.width &&
        previous.card === next.card &&
        previous.cardHeight === next.cardHeight &&
        previous.readable === next.readable
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (probe.current) observer.observe(probe.current);
    if (readableProbe.current) observer.observe(readableProbe.current);
    addEventListener("resize", measure);
    addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
      removeEventListener("scroll", measure, true);
    };
  }, [scroller, ids.length, drawOver]);

  // Room for a lifted card above the fan and beside its end cards.
  const lift = size.cardHeight * 0.28;
  const gutter = size.card * 0.35;
  const fan = fanLayout({
    count: ids.length + (drawOver ? 1 : 0),
    width: size.width - gutter * 2,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
  });
  const ready = size.width > 0 && size.card > 0;
  const headroom = size.card
    ? (size.readable * size.cardHeight) / size.card
    : 0;
  const nextFan = fanLayout({
    count: ids.length + 1,
    width: size.width - gutter * 2,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
  });
  // Reserve the same vertical space before pickup, during preview and on arrival.
  const height =
    Math.max(size.cardHeight * 1.45, fan.height, nextFan.height) + lift;
  function placement(index: number, layout = fan): CardPlacement {
    const box = scroller!.getBoundingClientRect();
    const style = getComputedStyle(scroller!);
    const card = layout.cards[index];
    return {
      x:
        box.x +
        parseFloat(style.paddingLeft) +
        Math.max(0, (size.width - layout.width - gutter * 2) / 2) -
        scroller!.scrollLeft +
        card.x +
        gutter,
      y: box.y + parseFloat(style.paddingTop) + card.y + lift,
      width: size.card,
      height: size.cardHeight,
      rotate: card.rotate,
    };
  }
  useLayoutEffect(() => {
    if (!ready) return;
    return table.registerHand({ zoneId, hostId }, () =>
      placement(ids.length, nextFan),
    );
  });

  const dragged = overlay ? ids.indexOf(overlay.cardId) : -1;
  const active =
    overlay || activeCardId === null ? -1 : ids.indexOf(activeCardId);
  const offset = Math.max(0, (size.width - fan.width - gutter * 2) / 2);
  const places = handFocusLayout({
    fan,
    active,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
    readableWidth: Math.min(size.readable, size.width),
    lift,
    gutter: gutter + offset,
    visibleLeft: scrollLeft,
    visibleWidth: size.width,
  });

  return (
    <>
      <section
        aria-label={label}
        data-zone={zoneId}
        data-zone-host={hostId}
        data-draw-target={drawTarget || undefined}
        data-draw-over={drawOver || undefined}
        className={`db-hand ${className}`}
      >
        <div
          ref={setScroller}
          className="db-hand-scroll"
          style={{ paddingTop: headroom, marginTop: -headroom }}
        >
          <div
            className="db-hand-fan"
            style={{
              width: Math.max(size.width, fan.width + gutter * 2),
              height: height + headroom,
              marginTop: -headroom,
            }}
          >
            <div className="db-hand-layer" style={{ top: headroom, height }}>
              <div
                ref={probe}
                aria-hidden
                style={{
                  position: "absolute",
                  visibility: "hidden",
                  width: "max-content",
                }}
              >
                {firstCard ? (
                  renderCard(firstCard, "idle")
                ) : (
                  <div className="db-card" />
                )}
              </div>
              <div
                ref={readableProbe}
                className="db-card db-hand-readable-probe"
                aria-hidden
                style={{ position: "absolute", visibility: "hidden" }}
              />
              {ready &&
                ids.map((id, index) => (
                  <HandCard
                    key={id}
                    cardId={id}
                    zoneId={zoneId}
                    hostId={hostId}
                    gameUI={scroller?.closest("[data-game-ui]") ?? null}
                    index={index}
                    x={places[index].x}
                    y={places[index].y}
                    rotate={places[index].rotate}
                    scale={places[index].scale}
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
                    transform: `translate(${fan.cards[ids.length].x + gutter + offset}px, ${fan.cards[ids.length].y + lift}px) rotate(${fan.cards[ids.length].rotate}deg)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
        {ids.length === 0 && <p className="db-hand-empty">No cards</p>}
      </section>
      {overlay &&
        dragged >= 0 &&
        createPortal(
          <div
            ref={overlay.ref}
            className="db-drag-overlay"
            style={
              {
                "--card-w": `${size.card}px`,
                "--card-aspect": `${size.card / size.cardHeight}`,
              } as CSSProperties
            }
          >
            <DragCopy
              cardId={overlay.cardId}
              scale={Math.max(
                1,
                (size.card * cardDragScale) / overlay.size.width,
              )}
              width={overlay.size.width}
              baseWidth={size.card}
              baseHeight={size.cardHeight}
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
  zone: CardZone,
  table: ReturnType<typeof useCardMotion>,
  gameUI: Element | null,
): {
  box: CardPlacement | null;
  hidden: boolean;
  destination?: CardPlacement;
  landed?: Promise<unknown>;
} | null {
  const origin = card?.getOrigin();
  if (!origin) return null;
  if (
    "zone" in origin &&
    origin.zone === zone.zoneId &&
    origin.hostId === zone.hostId
  )
    return origin.hidden ? { box: null, hidden: true } : null;
  const released =
    "zone" in origin
      ? table.getDrawOrigin(
          { zoneId: origin.zone, hostId: origin.hostId },
          zone,
        )
      : null;
  if (released)
    return {
      box: released.from,
      destination: released.to,
      landed: released.landed,
      hidden: origin.hidden,
    };
  const from = gameUI?.querySelector(
    "zone" in origin
      ? `[data-zone="${CSS.escape(origin.zone)}"][data-zone-host="${CSS.escape(origin.hostId)}"]`
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
  hostId: Card["hostId"];
  gameUI: Element | null;
  index: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  lift: number;
  choosing: boolean;
  renderCard: HandProps["renderCard"];
  getCardLabel: HandProps["getCardLabel"];
  destination(): CardPlacement;
}
const HandCard = memo(function HandCard({
  cardId,
  zoneId,
  hostId,
  gameUI,
  index,
  x,
  y,
  rotate,
  scale,
  lift,
  choosing,
  renderCard,
  getCardLabel,
  destination,
}: HandCardProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const table = useCardMotion();
  const [arrival, setArrival] = useState(() =>
    entryFrom(card, { zoneId, hostId }, table, gameUI),
  );
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
      {({ raised, hovered, anchor, control }) => {
        const place = hovered
          ? { x, y, rotate: 0 }
          : raised
            ? liftFanCard({ x, y, rotate }, lift * 0.5)
            : { x, y, rotate };
        return (
          <motion.div
            className="db-hand-slot"
            initial={false}
            animate={{ ...place, scale }}
            transition={{
              ...handReturn,
              y: hovered ? handEnter : handReturn,
              rotate: hovered ? handEnter : handReturn,
              scale: hovered ? handEnter : handReturn,
            }}
            {...moving}
            style={{
              zIndex: hovered ? 100 : index,
              transformPerspective: 600,
              transformOrigin: "50% 50%",
            }}
          >
            <motion.div layoutId={arrival ? undefined : cardId} initial={false}>
              {control}
            </motion.div>
            {arrival && anchor && (
              <CardArrival
                origin={arrival.box}
                landed={arrival.landed}
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
  scale,
  width,
  baseWidth,
  baseHeight,
  renderCard,
}: {
  cardId: CardId;
  scale: number;
  width: number;
  baseWidth: number;
  baseHeight: number;
  renderCard: HandProps["renderCard"];
}) {
  const card = useGame((game) => game.cards.find(cardId));
  return card ? (
    <motion.div
      layoutId={cardId}
      initial={false}
      animate={{ rotate: 0, scale }}
      transition={cardPickup}
      style={{ width, height: (width * baseHeight) / baseWidth }}
    >
      <div
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${width / baseWidth})`,
          transformOrigin: "0 0",
        }}
      >
        {renderCard(card, "selected")}
      </div>
    </motion.div>
  ) : null;
}
