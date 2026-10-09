import {
  fanLayout,
  handFan,
  handFanPresets,
  handFanTiming,
  liftFanCard,
  type HandFanOptions,
} from "@dreamboard-games/sdk";
import {
  useDragOverlay,
  useActiveCard,
  useCardRow,
  useDropArea,
  useGame,
  useZonePresentation,
  type GameCard as Card,
  type CardId,
  type ZoneId,
} from "@game";
import { motion, useMotionValue, type MotionValue } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  backImageOf,
  CardBack,
  dragCopyScale,
  useSnapTick,
  type CardState,
} from "./card";
import { CardControl } from "./card-control";
import { CardArrival } from "./card-arrival";
import { HandSheet } from "./hand-sheet";
import { cardEntry, useCardMotion, type CardPlacement } from "./card-motion";
import { cardDragScale, cardPickup, cardSettle } from "./card";
import "./tokens.css";
/** Bindings for interactions that take a position, such as a reorder. */
type PositionBinding = Extract<
  Parameters<typeof useDropArea>[0],
  { readonly position: unknown }
>;
export type HandReorder = Pick<PositionBinding, "interaction" | "input">;
export interface HandProps {
  zoneId: ZoneId;
  hostId: Card["hostId"];
  label?: string;
  className?: string;
  /**
   * Draws a card in the state the hand gives it. Keep it stable, at module
   * scope or in `useCallback`, so a drag renders only the dragged card. The
   * hand owns the card's `layoutId`.
   */
  renderCard(card: Card, state: CardState): ReactNode;
  /**
   * Draws the face that a hold or Alt/Option inspects, without table markers.
   * Defaults to the idle card; keep it stable like `renderCard`.
   */
  renderPreview?(card: Card): ReactNode;
  getCardLabel?(card: Card): string;
  /**
   * How the fan rests and focuses a card. Spread a `handFanPresets` entry and
   * override what differs; defaults to `handFanPresets.open`. A `tuck` hides
   * part of each resting card below the hand's bottom edge, so place a tucked
   * hand on the bottom edge of the game.
   */
  options?: HandFanOptions;
  /**
   * An interaction with a card input and a position input on this zone, such
   * as `{ interaction: "play.reorder" }`. Dragging a card along the hand opens
   * a gap where it would land, and dropping there moves it. Name `input` when
   * the interaction has two card inputs. It is off while a sort shows the
   * hand in another order than the zone's own, and while the hand is too
   * crowded to aim at.
   */
  reorder?: HandReorder;
}

const EMPTY: readonly CardId[] = [];
/** The ids with one moved to `to`, as the hand will hold them. */
const moved = (ids: readonly CardId[], from: number, to: number) => {
  const next = ids.filter((_, index) => index !== from);
  next.splice(to, 0, ids[from]);
  return next;
};
/** Below this much of each covered card, in pixels, the hand opens as a sheet. */
const CROWDED_STEP = 16;
const sameIds = (left: readonly CardId[], right: readonly CardId[]) =>
  left.length === right.length &&
  left.every((id, index) => id === right[index]);

/**
 * A fanned hand over one explicitly addressed zone host. A tap opens the card's action
 * menu, or toggles it when its only action picks several cards; a hold or a
 * Alt/Option previews it; a card with somewhere to land drags. A finger
 * sliding along the hand raises the card under it, and lifting there taps it.
 * The fan always fits the hand; once its cards are too thin to aim at, the
 * hand is one button that opens every card in a sheet. Cards arriving with an
 * origin fly from where they were last seen: their released drag copy, their
 * control in the zone marked `data-zone` and `data-zone-host`, or that zone or
 * the seat marked `data-player`.
 */
export function Hand({
  zoneId,
  hostId,
  label = "Hand",
  className = "",
  renderCard,
  renderPreview,
  getCardLabel,
  options = handFanPresets.open,
  reorder,
}: HandProps) {
  const projectedIds = useGame(
    (game) => {
      const zone = game.zones.find(zoneId, hostId);
      return zone ? game.hand.getSortedCardIds(zone) : EMPTY;
    },
    { compare: sameIds },
  );
  const presentation = useZonePresentation(zoneId, hostId, {
    order: projectedIds,
  });
  const ids = presentation.cards.map((card) => card.id);
  // Unplayable cards dim only while another card here is playable.
  const choosing = useGame(
    (game) =>
      game.zones
        .find(zoneId, hostId)
        ?.getCards()
        .some((card) => card.getIsEligible()) ?? false,
  );
  const overlay = useDragOverlay();
  // Positions count the zone's own order, which a sort may not show.
  const zoneOrder = useGame(
    (game) =>
      game.zones
        .find(zoneId, hostId)
        ?.getCards()
        .map((card) => card.id) ?? EMPTY,
    { compare: sameIds },
  );
  // A card dragged along the hand opens the gap where it would land. The gap
  // stays while the move settles, so no card jumps back before the frame.
  const target = overlay?.target;
  const gap =
    !(overlay?.settling && overlay.landing) &&
    reorder &&
    target?.kind === "position" &&
    target.interactionKey === reorder.interaction &&
    target.value.zoneId === zoneId &&
    target.value.hostId === hostId
      ? target.value.index
      : null;
  const from = overlay ? ids.indexOf(overlay.cardId) : -1;
  // A card from this hand moves its own slot to the gap; one from elsewhere
  // opens a slot there.
  const order =
    gap === null || from < 0
      ? ids
      : moved(ids, from, gap > from ? gap - 1 : gap);
  const opening = gap !== null && from < 0 ? gap : -1;
  const activeCardId = useActiveCard();
  const firstCard = useGame((game) =>
    ids.length ? game.cards.find(ids[0]) : undefined,
  );
  const [clip, setClip] = useState<HTMLElement | null>(null);
  const table = useCardMotion();
  const snapshot = useGame((game) => game.snapshot);
  const drawTarget =
    table.drop?.zone.zoneId === zoneId && table.drop.zone.hostId === hostId;
  const drawOver =
    drawTarget && table.drop?.over && table.drop.snapshot === snapshot;
  const probe = useRef<HTMLDivElement>(null);
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const [sheet, setSheet] = useState(false);
  // Another seat never sees the previous seat's open sheet.
  const perspective = useGame((game) => game.snapshot?.me);
  useEffect(() => setSheet(false), [perspective]);
  const [size, setSize] = useState({
    width: 0,
    card: 0,
    cardHeight: 0,
    room: Infinity,
    windowHeight: Infinity,
  });
  useLayoutEffect(() => {
    if (!clip) return;
    const measure = () => {
      const style = getComputedStyle(clip);
      const card = probe.current
        ? parseFloat(getComputedStyle(probe.current).width)
        : 0;
      const cardHeight = probe.current
        ? parseFloat(getComputedStyle(probe.current).height)
        : 0;
      const width =
        clip.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const settings = { ...handFanPresets.open, ...latestOptions.current };
      const band = handFan({
        count: ids.length + (drawOver ? 1 : 0),
        width: width - card * 0.7,
        cardWidth: card || 1,
        cardHeight: cardHeight || 1,
        options: latestOptions.current,
      }).height;
      const bottom =
        clip.getBoundingClientRect().top +
        parseFloat(style.paddingTop) +
        cardHeight * 0.28 +
        band;
      // A focused face may not rise past the window's top edge. Record that
      // limit only while it binds, so ordinary page scrolling re-renders nothing.
      const room = Math.max(0, bottom - 16);
      const tallest = Math.min(
        cardHeight * settings.focusScale,
        innerHeight * settings.focusMaxHeight,
      );
      const next = {
        width,
        card,
        cardHeight,
        room: room < tallest ? room : Infinity,
        windowHeight: innerHeight,
      };
      setSize((previous) =>
        previous.width === next.width &&
        previous.card === next.card &&
        previous.cardHeight === next.cardHeight &&
        previous.room === next.room &&
        previous.windowHeight === next.windowHeight
          ? previous
          : next,
      );
    };
    // Only scrolling something containing the hand moves the fan.
    const scrolled = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(clip))
        measure();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(clip);
    if (probe.current) observer.observe(probe.current);
    addEventListener("resize", measure);
    addEventListener("scroll", scrolled, true);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
      removeEventListener("scroll", scrolled, true);
    };
  }, [clip, ids.length, drawOver]);

  // Room for a lifted card above the fan and beside its end cards.
  const lift = size.cardHeight * 0.28;
  const gutter = size.card * 0.35;
  // The same arc handFan lays, for arrival destinations and reserved height.
  const arc = {
    angle: options.angle,
    maxSpread: options.maxSpread,
    step:
      options.spacing === undefined
        ? undefined
        : options.spacing * (size.card || 1),
  };
  // A draw or a card from elsewhere previews one more slot.
  const extra = drawOver || opening >= 0 ? 1 : 0;
  const fan = fanLayout({
    count: ids.length + extra,
    width: size.width - gutter * 2,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
    ...arc,
  });
  const ready = size.width > 0 && size.card > 0;
  const crowded = ready && ids.length > 1 && fan.step < CROWDED_STEP;
  const nextFan = fanLayout({
    count: ids.length + 1,
    width: size.width - gutter * 2,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
    ...arc,
  });
  // Reserve the same vertical space before pickup, during preview and on
  // arrival. Tucked cards hang below the hand's bottom edge, which clips them.
  const band = (count: number) =>
    handFan({
      count,
      width: size.width - gutter * 2,
      cardWidth: size.card || 1,
      cardHeight: size.cardHeight || 1,
      options,
    }).height;
  const height =
    Math.max(
      options.tuck ? 0 : size.cardHeight * 1.45,
      band(ids.length + extra),
      band(ids.length + 1),
    ) + lift;
  function placement(
    index: number,
    layout: Pick<typeof fan, "cards" | "width"> = fan,
  ): CardPlacement {
    const box = clip!.getBoundingClientRect();
    const style = getComputedStyle(clip!);
    const card = layout.cards[index];
    return {
      x:
        box.x +
        parseFloat(style.paddingLeft) +
        Math.max(0, (size.width - layout.width - gutter * 2) / 2) +
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
  // A stable getter keeps memoized cards from re-rendering on every scroll;
  // an arrival can retarget to its current slot when the hand order changes.
  const latestPlacement = useRef(placement);
  const destination = useCallback(
    (index: number) => latestPlacement.current(index),
    [],
  );
  // A card holds its readable pose while its action menu is open, so the
  // menu stays where it opened when the pointer or focus moves into it.
  const [menuCardId, setMenuCardId] = useState<CardId | null>(null);
  const onMenuChange = useCallback(
    (cardId: CardId, open: boolean) =>
      setMenuCardId((current) =>
        open ? cardId : current === cardId ? null : current,
      ),
    [],
  );
  // A mouse crossing a sliver between moving cards keeps its last card in
  // focus, so a slow sweep never drops the hand; leaving the hand clears it.
  const [lastPointed, setLastPointed] = useState<CardId | null>(null);
  const pointed = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const value = (event.target as Element)
      .closest("[data-card]")
      ?.getAttribute("data-card");
    const id = ids.find((candidate) => candidate === value);
    if (id !== undefined) setLastPointed(id);
  };
  const focusedId =
    (menuCardId !== null && ids.includes(menuCardId) ? menuCardId : null) ??
    activeCardId ??
    lastPointed;
  const active =
    crowded || overlay || focusedId === null ? -1 : ids.indexOf(focusedId);
  // The fan sits centred between its gutters; handFan works in its coordinates.
  const inset = gutter + Math.max(0, (size.width - fan.width - gutter * 2) / 2);
  const focus = handFan({
    count: ids.length + extra,
    width: size.width - gutter * 2,
    cardWidth: size.card || 1,
    cardHeight: size.cardHeight || 1,
    focused: active,
    visible: { left: -inset, width: size.width },
    windowHeight: size.windowHeight,
    room: size.room,
    options,
  });
  latestPlacement.current = (index) => placement(index, focus);
  const places = focus.cards.map((card) => ({
    ...card,
    x: card.x + inset,
    y: card.y + lift,
  }));
  const headroom = focus.headroom;
  // A finger slides by resting places, so each card is one strip's travel
  // from the next however large the raised face is.
  const row = useCardRow((point) => {
    const box = clip!.getBoundingClientRect();
    if (point.y < box.top || point.y > box.bottom) return null;
    const x =
      point.x -
      box.left -
      parseFloat(getComputedStyle(clip!).paddingLeft) -
      inset;
    const last = fan.cards[ids.length - 1];
    if (x < fan.cards[0].x - gutter || x > last.x + size.card + gutter)
      return null;
    // Cards run left to right, so the last one starting before x is under it.
    const before = fan.cards
      .slice(0, ids.length)
      .filter((card) => card.x <= x).length;
    return ids[Math.max(0, before - 1)];
  });
  // The point a drop names is the slot nearest the pointer: one of this
  // hand's own slots for its own card, a new one for a card from elsewhere.
  const positionAt = ({ x }: { readonly x: number }): PositionBinding => {
    const box = clip!.getBoundingClientRect();
    const at = x - box.left - parseFloat(getComputedStyle(clip!).paddingLeft);
    const slots = from >= 0 ? fan : nextFan;
    const offset =
      gutter + Math.max(0, (size.width - slots.width - gutter * 2) / 2);
    const distance = (index: number) =>
      Math.abs(at - (slots.cards[index].x + offset + size.card / 2));
    let nearest = 0;
    for (let index = 1; index < slots.cards.length; index++)
      if (distance(index) < distance(nearest)) nearest = index;
    // A game's own binding types each position by its input's zones, which
    // this hand's zone may not prove; the drag feature admits only the points
    // the interaction offers.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Needed when a game binding types its positions.
    return {
      ...reorder!,
      position: {
        zoneId,
        hostId,
        index: from >= 0 && nearest >= from ? nearest + 1 : nearest,
      },
    } as PositionBinding;
  };
  const area = useDropArea(
    reorder && ready && !crowded && sameIds(ids, zoneOrder) ? positionAt : null,
  );
  const ghost = drawOver
    ? ids.length
    : opening >= 0
      ? opening
      : gap !== null && overlay
        ? order.indexOf(overlay.cardId)
        : -1;

  return (
    <>
      <section
        {...area.props}
        aria-label={label}
        data-zone={zoneId}
        data-zone-host={hostId}
        data-draw-target={drawTarget || undefined}
        data-draw-over={drawOver || undefined}
        className={`db-hand ${className}`}
      >
        <div
          ref={setClip}
          className="db-hand-clip"
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
            <div
              {...row.props}
              className="db-hand-layer"
              style={{ ...row.props.style, top: headroom, height }}
              onPointerMove={pointed}
              onPointerLeave={() => setLastPointed(null)}
            >
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
              {ready &&
                order.map((id, position) => {
                  const index =
                    opening >= 0 && position >= opening
                      ? position + 1
                      : position;
                  return (
                    <HandCard
                      key={id}
                      cardId={id}
                      arriving={presentation.arrivingIds.includes(id)}
                      zoneId={zoneId}
                      hostId={hostId}
                      gameUI={clip?.closest("[data-game-ui]") ?? null}
                      index={index}
                      x={places[index].x}
                      y={places[index].y}
                      rotate={places[index].rotate}
                      scale={places[index].scale}
                      overlay={
                        overlay?.cardId === id &&
                        (!overlay.settling || !overlay.landing)
                          ? overlay
                          : null
                      }
                      baseWidth={size.card}
                      baseHeight={size.cardHeight}
                      lift={lift}
                      focused={index === active}
                      crowded={crowded}
                      choosing={choosing}
                      renderCard={renderCard}
                      renderPreview={renderPreview}
                      getCardLabel={getCardLabel}
                      destination={destination}
                      onMenuChange={onMenuChange}
                    />
                  );
                })}
              {ready && ghost >= 0 && (
                <div
                  className={
                    drawOver ? "db-draw-insertion" : "db-hand-insertion"
                  }
                  // A dragged card takes the size of the gap it would land in.
                  data-drop-landing={drawOver ? undefined : "gap"}
                  aria-hidden
                  style={{
                    width: size.card,
                    height: size.cardHeight,
                    transform: `translate(${fan.cards[ghost].x + inset}px, ${fan.cards[ghost].y + lift}px) rotate(${fan.cards[ghost].rotate}deg)`,
                  }}
                />
              )}
              {crowded && (
                <button
                  type="button"
                  className="db-hand-open"
                  aria-label={`${label}: ${ids.length} cards`}
                  aria-haspopup="dialog"
                  onClick={() => setSheet(true)}
                >
                  <span className="db-hand-count">{ids.length}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {ids.length === 0 && <p className="db-hand-empty">No cards</p>}
      </section>
      <HandSheet
        open={sheet}
        onOpenChange={setSheet}
        ids={ids}
        label={label}
        choosing={choosing}
        renderCard={renderCard}
        renderPreview={renderPreview}
        getCardLabel={getCardLabel}
      />
    </>
  );
}

interface HandCardProps {
  arriving: boolean;
  cardId: CardId;
  zoneId: ZoneId;
  hostId: Card["hostId"];
  gameUI: Element | null;
  index: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  overlay: ReturnType<typeof useDragOverlay>;
  baseWidth: number;
  baseHeight: number;
  lift: number;
  choosing: boolean;
  renderCard: HandProps["renderCard"];
  renderPreview: HandProps["renderPreview"];
  getCardLabel: HandProps["getCardLabel"];
  focused: boolean;
  /** The hand opens as a sheet; its cards show without their own gestures. */
  crowded: boolean;
  destination(index: number): CardPlacement;
  onMenuChange(cardId: CardId, open: boolean): void;
}
const HandCard = memo(function HandCard({
  arriving,
  cardId,
  zoneId,
  hostId,
  gameUI,
  index,
  x,
  y,
  rotate,
  scale,
  overlay,
  baseWidth,
  baseHeight,
  lift,
  choosing,
  renderCard,
  renderPreview,
  getCardLabel,
  focused,
  crowded,
  destination,
  onMenuChange,
}: HandCardProps) {
  const card = useGame((game) => game.cards.find(cardId));
  const table = useCardMotion();
  // A card arriving from elsewhere starts there, turning face up if it was hidden.
  const [arrival, setArrival] = useState(() =>
    arriving && card
      ? cardEntry(card, { zoneId, hostId }, table, gameUI)
      : null,
  );
  const finishArrival = useCallback(() => setArrival(null), []);
  // Keep pose out of shared layout's size/scroll projection. The source owns
  // these values throughout pickup, return and an interrupted regrab.
  const presentedScale = useMotionValue(scale);
  const presentedRotation = useMotionValue(rotate);
  const dragged = overlay?.cardId;
  const pickup = useMemo(() => {
    if (!dragged) return null;
    const scale = Math.max(cardDragScale, presentedScale.get());
    return {
      scale,
      y: matchMedia("(pointer: coarse)").matches
        ? -baseHeight * 0.3 * scale
        : 0,
    };
  }, [dragged, presentedScale, baseHeight]);
  const menuChanged = useCallback(
    (open: boolean) => onMenuChange(cardId, open),
    [onMenuChange, cardId],
  );
  useSnapTick(!!overlay?.fit.snapped);
  if (!card) return null;
  return (
    <>
      <CardControl
        cardId={cardId}
        drag={{}}
        inert={crowded}
        choosing={choosing}
        disabled={!!arrival}
        style={{ visibility: arrival ? "hidden" : undefined }}
        renderCard={renderCard}
        renderPreview={renderPreview}
        getCardLabel={getCardLabel}
        onMenuChange={menuChanged}
      >
        {({ raised, anchor, control }) => {
          const place = focused
            ? { x, y, rotate: 0 }
            : raised
              ? liftFanCard({ x, y, rotate }, lift * 0.5)
              : { x, y, rotate };
          return (
            <motion.div
              className="db-hand-slot"
              // Layout owns horizontal movement independently of the fast lift.
              layout="position"
              initial={false}
              transition={handFanTiming.settle}
              style={{
                zIndex: focused ? 100 : index,
                left: place.x,
                top: 0,
              }}
            >
              {/* One projection owns both focus lift and the shared drag return. */}
              <div
                className="db-hand-vertical"
                style={{ position: "relative", top: place.y }}
              >
                <motion.div
                  layoutId={arrival ? undefined : cardId}
                  layout="position"
                  initial={false}
                  animate={{ y: 0 }}
                  transition={
                    focused ? handFanTiming.focus : handFanTiming.settle
                  }
                >
                  <motion.div
                    className="db-hand-pose"
                    initial={false}
                    animate={{
                      scale:
                        pickup && overlay
                          ? dragCopyScale(overlay.fit, pickup.scale)
                          : scale,
                      rotate: pickup ? 0 : place.rotate,
                    }}
                    transition={
                      pickup
                        ? overlay?.fit.scale
                          ? cardSettle
                          : cardPickup
                        : focused
                          ? handFanTiming.focus
                          : handFanTiming.settle
                    }
                    style={{
                      scale: presentedScale,
                      rotate: presentedRotation,
                    }}
                  >
                    {control}
                  </motion.div>
                </motion.div>
              </div>
              {arrival && anchor && (
                <CardArrival
                  origin={arrival.box}
                  landed={arrival.landed}
                  hidden={arrival.hidden}
                  target={anchor}
                  destination={destination(index)}
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
      {overlay &&
        createPortal(
          <motion.div
            layoutRoot
            layoutScroll
            ref={overlay.ref}
            data-drag-card={cardId}
            className="db-drag-overlay"
            style={
              {
                "--card-w": `${baseWidth}px`,
                "--card-aspect": `${baseWidth / baseHeight}`,
              } as CSSProperties
            }
          >
            <DragCopy
              cardId={cardId}
              scale={presentedScale}
              rotate={presentedRotation}
              // A card in a pile sits on it, not above the finger.
              lift={overlay.fit.snapped ? 0 : pickup!.y}
              concealed={overlay.fit.concealed}
              baseWidth={baseWidth}
              baseHeight={baseHeight}
              renderCard={renderCard}
            />
          </motion.div>,
          document.body,
        )}
    </>
  );
});

/** Motion transports the base face; its source owns the shared visible pose. */
function DragCopy({
  cardId,
  scale,
  rotate,
  lift,
  concealed,
  baseWidth,
  baseHeight,
  renderCard,
}: {
  cardId: CardId;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
  lift: number;
  /** It would land face down where it is. */
  concealed: boolean;
  baseWidth: number;
  baseHeight: number;
  renderCard: HandProps["renderCard"];
}) {
  const card = useGame((game) => game.cards.find(cardId));
  return card ? (
    <motion.div
      layoutId={cardId}
      layout="position"
      initial={{ y: 0 }}
      animate={{ y: lift }}
      transition={cardPickup}
      style={{ width: baseWidth, height: baseHeight }}
    >
      <motion.div className="db-hand-pose" style={{ scale, rotate }}>
        {concealed ? (
          <CardBack image={backImageOf(card)} />
        ) : (
          renderCard(card, "selected")
        )}
      </motion.div>
    </motion.div>
  ) : null;
}
