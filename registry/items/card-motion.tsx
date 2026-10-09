import { MotionConfig } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useGame } from "@game";

import type { GameModel as Model, GameCard as Card } from "@game";
import type { ZoneId } from "@game";
export type CardBox = Pick<DOMRectReadOnly, "x" | "y" | "width" | "height">;
export type CardPlacement = CardBox & { rotate: number };
export type CardZone = { zoneId: ZoneId; hostId: Card["hostId"] };
const sameZone = (left: CardZone, right: CardZone) =>
  left.zoneId === right.zoneId && left.hostId === right.hostId;
interface DrawOrigin {
  from: CardZone;
  to: CardZone;
  placement(): CardPlacement;
  target: CardPlacement;
  snapshot: Model["snapshot"];
  landed: Promise<unknown>;
}
const CardMotionContext = createContext<{
  stageDraw(
    from: CardZone,
    to: CardZone,
    placement: () => CardPlacement,
    target: CardPlacement,
    landed: Promise<unknown>,
  ): void;
  clearDraw(): void;
  getDrawOrigin(
    from: CardZone,
    to: CardZone,
  ): {
    from: CardPlacement;
    to: CardPlacement;
    landed: Promise<unknown>;
  } | null;
  registerHand(zone: CardZone, target: () => CardPlacement): () => void;
  getDrawTarget(zone: CardZone): CardPlacement;
  drop: { zone: CardZone; over: boolean; snapshot: Model["snapshot"] } | null;
  setDrop(zone: CardZone | null, over?: boolean): void;
} | null>(null);

/** One game's card motion: reduced motion and a draw's release position, never hidden card identity. */
export function CardMotionProvider({ children }: { children: ReactNode }) {
  const snapshot = useGame((game) => game.snapshot);
  const pending = useRef<DrawOrigin | null>(null);
  const hands = useRef(
    new Map<ZoneId, Map<Card["hostId"], () => CardPlacement>>(),
  );
  const [drop, setDrop] = useState<{
    zone: CardZone;
    over: boolean;
    snapshot: Model["snapshot"];
  } | null>(null);
  // Children consume the origin when the authoritative frame mounts the new card.
  // Clear unused hints after that commit, including seat changes and restores.
  useEffect(() => {
    pending.current = null;
    setDrop(null);
  }, [snapshot]);
  return (
    <MotionConfig reducedMotion="user">
      <CardMotionContext.Provider
        value={{
          stageDraw(from, to, placement, target, landed) {
            pending.current = { from, to, placement, target, snapshot, landed };
          },
          clearDraw() {
            pending.current = null;
          },
          registerHand(zone, target) {
            const hosts =
              hands.current.get(zone.zoneId) ??
              new Map<Card["hostId"], () => CardPlacement>();
            hosts.set(zone.hostId, target);
            hands.current.set(zone.zoneId, hosts);
            return () => {
              if (hosts.get(zone.hostId) === target) hosts.delete(zone.hostId);
              if (hosts.size === 0) hands.current.delete(zone.zoneId);
            };
          },
          getDrawTarget(zone) {
            const target = hands.current.get(zone.zoneId)?.get(zone.hostId);
            if (!target)
              throw new Error(
                `DrawPile requires a mounted Hand for ${zone.zoneId}/${zone.hostId}.`,
              );
            return target();
          },
          drop,
          setDrop(zone, over = false) {
            setDrop((current) =>
              zone === null
                ? null
                : current &&
                    sameZone(current.zone, zone) &&
                    current.over === over
                  ? current
                  : { zone, over, snapshot },
            );
          },
          getDrawOrigin(from, to) {
            const origin = pending.current;
            if (
              !origin ||
              !sameZone(origin.from, from) ||
              !sameZone(origin.to, to) ||
              origin.snapshot?.me !== snapshot?.me ||
              origin.snapshot === snapshot
            )
              return null;
            return {
              from: origin.placement(),
              to: origin.target,
              landed: origin.landed,
            };
          },
        }}
      >
        <div data-game-ui className="contents">
          {children}
        </div>
      </CardMotionContext.Provider>
    </MotionConfig>
  );
}

export function useCardMotion() {
  const table = useContext(CardMotionContext);
  if (!table)
    throw new Error("Hand and DrawPile require the UI binding's GameProvider.");
  return table;
}

export type CardEntry = {
  box: CardPlacement | null;
  hidden: boolean;
  /** The draw overlay owns the flight until this settles. */
  landed?: Promise<unknown>;
};

/**
 * Where a card arriving in `zone` with this frame was last seen, so its
 * `CardArrival` starts there: the drag copy it was released from (marked
 * `data-drag-card`), its own control in the zone it left, or that zone or
 * seat. Read it while rendering the arrival, before the frame removes the old
 * place. A hidden card turns face up on the way.
 */
export function cardEntry(
  card: Card,
  zone: CardZone,
  table: ReturnType<typeof useCardMotion>,
  gameUI: ParentNode | null,
): CardEntry | null {
  const origin = card.getOrigin();
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
  // The pile owns the first flight; this origin continues from its release slot.
  if (released)
    return {
      box: released.to,
      landed: released.landed,
      hidden: origin.hidden,
    };
  const id = CSS.escape(String(card.id));
  const from = gameUI?.querySelector(
    "zone" in origin
      ? `[data-zone="${CSS.escape(origin.zone)}"][data-zone-host="${CSS.escape(origin.hostId)}"]`
      : `[data-player="${CSS.escape(origin.player)}"]`,
  );
  const place =
    document.querySelector(`[data-drag-card="${id}"]`) ??
    from?.querySelector(`[data-card="${id}"]`) ??
    from;
  if (place) {
    const { x, y, width, height } = place.getBoundingClientRect();
    return { box: { x, y, width, height, rotate: 0 }, hidden: origin.hidden };
  }
  return origin.hidden ? { box: null, hidden: true } : null;
}
