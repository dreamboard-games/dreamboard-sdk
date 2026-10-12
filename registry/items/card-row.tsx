import {
  useCardRow,
  useDragOverlay,
  useDropArea,
  useGame,
  useZonePresentation,
  type GameCard,
  type ZoneId,
} from "@game";
import {
  Fragment,
  useImperativeHandle,
  useLayoutEffect,
  useState,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { CardBrowser, useCardBrowsing } from "./card-browsing";
import "./tokens.css";
import "./card-row.css";

type PositionBinding = Extract<
  Parameters<typeof useDropArea>[0],
  { readonly position: unknown }
>;
export type CardRowProps = Omit<ComponentProps<"div">, "children"> & {
  zoneId: ZoneId;
  hostId: GameCard["hostId"];
  label?: string;
  /** The authored card/position interaction. Omit for a display-only row. */
  reorder?: Pick<PositionBinding, "interaction" | "input">;
  /** Render the card control, including the game's selection and drag policy. */
  renderCard(card: GameCard, arriving: boolean): ReactNode;
};

/**
 * An ordered row with position-aware drop previews. Cards overlap to fit its
 * width; a row too crowded to target exposes its cards through Browse.
 */
export function CardRow({
  zoneId,
  hostId,
  label = "Cards",
  reorder,
  renderCard,
  className = "",
  ref,
  ...props
}: CardRowProps) {
  const row = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => row.current!, []);
  const { cards, arrivingIds } = useZonePresentation(zoneId, hostId);
  const overlay = useDragOverlay();
  const browsing = useCardBrowsing();
  const [crowded, setCrowded] = useState(false);
  const [needsBrowse, setNeedsBrowse] = useState(false);
  const sliding = useCardRow(({ x, y }) => {
    const element = row.current!;
    const box = element.getBoundingClientRect();
    if (
      crowded ||
      x < box.left ||
      x > box.right ||
      y < box.top ||
      y > box.bottom
    )
      return null;
    const slots = [
      ...element.querySelectorAll<HTMLElement>(
        ".db-card-row-card[data-row-card]",
      ),
    ];
    const index =
      slots.filter((slot) => slot.getBoundingClientRect().left <= x).length - 1;
    return cards[Math.max(0, index)]?.id ?? null;
  });
  const eligible = useGame(
    (game) =>
      !!reorder &&
      game.drag
        .getDropTargets()
        .some(
          (target) =>
            target.kind === "position" &&
            target.interactionKey === reorder.interaction &&
            (!reorder.input || target.cardInputKey === reorder.input) &&
            target.value.zoneId === zoneId &&
            target.value.hostId === hostId,
        ),
  );
  const target = overlay?.target;
  const gap =
    reorder &&
    !(overlay?.settling && overlay.landing) &&
    target?.kind === "position" &&
    target.interactionKey === reorder.interaction &&
    (!reorder.input || target.cardInputKey === reorder.input) &&
    target.value.zoneId === zoneId &&
    target.value.hostId === hostId
      ? target.value.index
      : null;
  const from = cards.findIndex((card) => card.id === overlay?.cardId);
  const ghost = gap === null ? -1 : from >= 0 && gap > from ? gap - 1 : gap;
  const slotCount = cards.length + (gap !== null && from < 0 ? 1 : 0);
  useLayoutEffect(() => {
    const element = row.current!;
    const measure = () => {
      const style = getComputedStyle(element);
      const slot = element.querySelector<HTMLElement>(".db-card-row-card");
      const minimum = parseFloat(getComputedStyle(probe.current!).minWidth);
      const needed =
        probe.current!.offsetWidth +
        Math.max(0, slotCount - 1) * (minimum + parseFloat(style.columnGap)) +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);
      setCrowded(!!slot && needed > element.clientWidth);
      const fullWidth =
        cards.length * probe.current!.offsetWidth +
        Math.max(0, cards.length - 1) * parseFloat(style.columnGap) +
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);
      setNeedsBrowse(cards.length > 1 && fullWidth > element.clientWidth + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(probe.current!);
    measure();
    return () => observer.disconnect();
  }, [slotCount, cards.length]);
  const order = [...cards];
  if (gap !== null && from >= 0) {
    order.splice(ghost, 0, ...order.splice(from, 1));
  }
  const area = useDropArea(
    eligible && reorder
      ? ({ x }) => {
          // Use resting slots: the preview must never move its own hit targets.
          const element = row.current!;
          const width = probe.current!.offsetWidth;
          const style = getComputedStyle(element);
          const spacing = parseFloat(style.columnGap);
          const padding = parseFloat(style.paddingLeft);
          const count = cards.length + (from < 0 ? 1 : 0);
          // The slot pitch card-row.css settles on: whole cards when they fit,
          // otherwise an even overlap, never below a slot's min-width.
          const slot = element.querySelector(".db-card-row-card");
          const fewest = slot ? parseFloat(getComputedStyle(slot).minWidth) : 0;
          const room = element.clientWidth - padding * 2;
          const step =
            count > 1
              ? Math.max(
                  fewest + spacing,
                  Math.min(width + spacing, (room - width) / (count - 1)),
                )
              : width + spacing;
          const total = width + Math.max(0, count - 1) * step;
          const inset = Math.max(padding, (element.clientWidth - total) / 2);
          const at =
            x - element.getBoundingClientRect().left + element.scrollLeft;
          const nearest = Math.max(
            0,
            Math.min(count - 1, Math.round((at - inset - width / 2) / step)),
          );
          return {
            ...reorder,
            position: {
              zoneId,
              hostId,
              index: from >= 0 && nearest >= from ? nearest + 1 : nearest,
            },
          };
        }
      : null,
  );
  return (
    <div className="db-card-row-group">
      <CardBrowser
        session={browsing.session}
        count={cards.length}
        needed={needsBrowse}
        label={label}
        renderCards={() =>
          cards.map((card) => (
            <Fragment key={card.id}>
              {renderCard(card, arrivingIds.includes(card.id))}
            </Fragment>
          ))
        }
      >
        <div
          {...props}
          {...sliding.props}
          data-card-browsing={browsing.props["data-card-browsing"]}
          onPointerDownCapture={(event) => {
            props.onPointerDownCapture?.(event);
            browsing.props.onPointerDownCapture(event);
          }}
          style={{ ...props.style, ...sliding.props.style }}
          {...(eligible ? area.props : {})}
          ref={row}
          data-crowded={crowded || undefined}
          className={`db-card-row ${className}`}
          data-zone={zoneId}
          data-zone-host={hostId}
        >
          <span ref={probe} className="db-card-row-probe" aria-hidden />
          {order.map((card, index) => (
            <Fragment key={card.id}>
              {from < 0 && ghost === index ? (
                <div className="db-card-row-card" aria-hidden>
                  <div className="db-card-row-insertion" />
                </div>
              ) : null}
              <div
                className="db-card-row-card"
                data-row-card={card.id}
                inert={crowded}
              >
                {renderCard(card, arrivingIds.includes(card.id))}
                {from >= 0 && ghost === index ? (
                  <div className="db-card-row-insertion" aria-hidden />
                ) : null}
              </div>
            </Fragment>
          ))}
          {from < 0 && ghost === cards.length ? (
            <div className="db-card-row-card" aria-hidden>
              <div className="db-card-row-insertion" />
            </div>
          ) : null}
        </div>
      </CardBrowser>
    </div>
  );
}
