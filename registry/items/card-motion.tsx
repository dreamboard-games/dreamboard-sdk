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

import type { GameModel as Model } from "@game";
import type { ZoneId } from "@game";
export type CardBox = Pick<DOMRectReadOnly, "x" | "y" | "width" | "height">;
export type CardPlacement = CardBox & { rotate: number };
interface DrawOrigin {
  from: ZoneId;
  to: ZoneId;
  placement(): CardPlacement;
  target: CardPlacement;
  snapshot: Model["snapshot"];
}
const CardMotionContext = createContext<{
  stageDraw(
    from: ZoneId,
    to: ZoneId,
    placement: () => CardPlacement,
    target: CardPlacement,
  ): void;
  clearDraw(): void;
  getDrawOrigin(
    from: ZoneId,
    to: ZoneId,
  ): { from: CardPlacement; to: CardPlacement } | null;
  registerHand(zone: ZoneId, target: () => CardPlacement): () => void;
  getDrawTarget(zone: ZoneId): CardPlacement;
  drop: { zone: ZoneId; over: boolean; snapshot: Model["snapshot"] } | null;
  setDrop(zone: ZoneId | null, over?: boolean): void;
} | null>(null);

/** One game's card motion: reduced motion and a draw's release position, never hidden card identity. */
export function CardMotionProvider({ children }: { children: ReactNode }) {
  const snapshot = useGame((game) => game.snapshot);
  const pending = useRef<DrawOrigin | null>(null);
  const hands = useRef(new Map<ZoneId, () => CardPlacement>());
  const [drop, setDrop] = useState<{
    zone: ZoneId;
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
            hands.current.set(zone, target);
            return () => {
              hands.current.delete(zone);
            };
          },
          getDrawTarget(zone) {
            const target = hands.current.get(zone);
            if (!target)
              throw new Error(`DrawPile requires a mounted Hand for ${zone}.`);
            return target();
          },
          drop,
          setDrop(zone, over = false) {
            setDrop((current) =>
              zone === null
                ? null
                : current?.zone === zone && current.over === over
                  ? current
                  : { zone, over, snapshot },
            );
          },
          getDrawOrigin(from, to) {
            const origin = pending.current;
            if (
              !origin ||
              origin.from !== from ||
              origin.to !== to ||
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
