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
}
const CardMotionContext = createContext<{
  stageDraw(
    from: CardZone,
    to: CardZone,
    placement: () => CardPlacement,
    target: CardPlacement,
  ): void;
  clearDraw(): void;
  getDrawOrigin(
    from: CardZone,
    to: CardZone,
  ): { from: CardPlacement; to: CardPlacement } | null;
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
          stageDraw(from, to, placement, target) {
            pending.current = { from, to, placement, target, snapshot };
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
            return { from: origin.placement(), to: origin.target };
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
