import { fanLayout, liftFanCard } from "@dreamboard-games/sdk";
import { useCardGesture, useDragOverlay, useGame } from "@game";
import { motion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cardSpring, useMoving, type CardState } from "./card";
import { CardActions, getCardActions } from "./card-actions";
import { CardPreview } from "./card-preview";
import { CardArrival } from "./card-arrival";
import { useCardTable, type CardBox } from "./card-table";
import "./tokens.css";
type Model = Parameters<Parameters<typeof useGame>[0]>[0];
type ZoneId = Parameters<Model["zones"]["get"]>[0];
type CardId = Parameters<Model["cards"]["get"]>[0];
type Card = NonNullable<ReturnType<Model["cards"]["get"]>>;
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
  const table = useCardTable();
  const drawTarget = table.drop?.zone === zoneId;
  const drawOver = drawTarget && table.drop?.over;
  const probe = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, card: 0, cardHeight: 0 });
  const [menu, setMenu] = useState<{
    cardId: CardId;
    anchor: HTMLElement;
    shake: number;
  } | null>(null);

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

  const tap = useCallback(
    (card: Card, anchor: HTMLElement) => {
      const actions = getCardActions(card);
      const pick = actions.length === 1 ? actions[0] : null;
      if (
        pick
          ?.getInputs()
          .some(
            (input) =>
              input.domainType === "cardTarget" &&
              input.selectionMode === "many",
          )
      ) {
        card.select({ interaction: pick.key });
        return;
      }
      // Say why only when the card could matter now; otherwise a tap does nothing.
      if (!actions.length && !card.getInteractions().length && !choosing)
        return;
      setMenu((current) =>
        current?.cardId === card.id && actions.length
          ? null
          : {
              cardId: card.id,
              anchor,
              shake: actions.length ? 0 : (current?.shake ?? 0) + 1,
            },
      );
    },
    [choosing],
  );
  const close = useCallback(() => setMenu(null), []);
  // A drag closes the menu for good, so a cancelled drag does not reopen it.
  const dragging = overlay !== null;
  useEffect(() => {
    if (dragging) setMenu(null);
  }, [dragging]);
  const open = menu && !dragging && ids.includes(menu.cardId) ? menu : null;
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
          style={{ width: fan.width + lift, height: fan.height + lift }}
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
                open={open?.cardId === id}
                shake={menu?.cardId === id ? menu.shake : 0}
                renderCard={renderCard}
                getCardLabel={getCardLabel}
                onTap={tap}
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
        {ids.length === 0 && <p>No cards</p>}
      </section>
      {open && (
        <CardActions
          key={open.cardId}
          cardId={open.cardId}
          anchor={open.anchor}
          onClose={close}
        />
      )}
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
  table: ReturnType<typeof useCardTable>,
): { box: CardBox | null; hidden: boolean } | null {
  const origin = card?.getOrigin();
  if (!origin) return null;
  if ("zone" in origin && origin.zone === zoneId)
    return origin.hidden ? { box: null, hidden: true } : null;
  const released =
    "zone" in origin ? table.getDrawOrigin(origin.zone, zoneId) : null;
  if (released) return { box: released, hidden: origin.hidden };
  const from = document.querySelector(
    "zone" in origin
      ? `[data-zone="${CSS.escape(origin.zone)}"]`
      : `[data-player="${CSS.escape(origin.player)}"]`,
  );
  return from
    ? { box: from.getBoundingClientRect(), hidden: origin.hidden }
    : origin.hidden
      ? { box: null, hidden: true }
      : null;
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
  open: boolean;
  shake: number;
  renderCard: HandProps["renderCard"];
  getCardLabel: HandProps["getCardLabel"];
  onTap(card: Card, anchor: HTMLElement): void;
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
  open,
  shake,
  renderCard,
  getCardLabel,
  onTap,
}: HandCardProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const gesture = useCardGesture(cardId);
  const [control, setControl] = useState<HTMLButtonElement | null>(null);
  const table = useCardTable();
  const [arrival, setArrival] = useState(() => entryFrom(card, zoneId, table));
  const finishArrival = useCallback(() => setArrival(null), []);
  const moving = useMoving();
  if (!card) return null;
  const selected = card.getIsSelected();
  // A dimmed card with its reason open shakes instead of lifting.
  const raised = selected || (open && card.getIsEligible());
  const state: CardState = raised
    ? "selected"
    : card.getIsEligible()
      ? "eligible"
      : choosing
        ? "dimmed"
        : "idle";
  const place = raised ? liftFanCard({ x, y, rotate }, lift) : { x, y, rotate };
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
      <button
        ref={setControl}
        {...card.getProps()}
        {...gesture.props}
        className="db-hand-card"
        // Unplayable cards stay pressable, to inspect them and to say why.
        disabled={!!arrival}
        style={{
          ...gesture.props.style,
          visibility: arrival ? "hidden" : undefined,
        }}
        aria-disabled={!card.getCanSelect() || undefined}
        aria-pressed={selected}
        aria-label={
          getCardLabel?.(card) ??
          (card.hidden ? "Face-down card" : String(card.id))
        }
        data-shake={shake ? (shake % 2 ? "a" : "b") : undefined}
        onClick={(event) => onTap(card, event.currentTarget)}
      >
        {renderCard(card, state)}
      </button>
      {arrival && control && (
        <CardArrival
          origin={arrival.box}
          hidden={arrival.hidden}
          target={control}
          rotate={rotate}
          onComplete={finishArrival}
        >
          {renderCard(card, "idle")}
        </CardArrival>
      )}
      {gesture.inspecting && !card.hidden && (
        <CardPreview via={gesture.inspecting} anchor={control}>
          {renderCard(card, "idle")}
        </CardPreview>
      )}
    </motion.div>
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
      animate={{ rotate: 0, scale: 1.06 }}
      transition={cardSpring}
    >
      {renderCard(card, "selected")}
    </motion.div>
  ) : null;
}
