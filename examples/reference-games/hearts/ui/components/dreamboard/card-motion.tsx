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
interface DrawOrigin {
  from: ZoneId;
  to: ZoneId;
  box: CardBox;
  snapshot: Model["snapshot"];
}
const CardMotionContext = createContext<{
  stageDraw(from: ZoneId, to: ZoneId, box: CardBox): void;
  clearDraw(): void;
  getDrawOrigin(from: ZoneId, to: ZoneId): CardBox | null;
  drop: { zone: ZoneId; over: boolean } | null;
  setDrop(zone: ZoneId | null, over?: boolean): void;
} | null>(null);

/** One game's card motion: reduced motion and a draw's release position, never hidden card identity. */
export function CardMotionProvider({ children }: { children: ReactNode }) {
  const snapshot = useGame((game) => game.snapshot);
  const pending = useRef<DrawOrigin | null>(null);
  const [drop, setDrop] = useState<{ zone: ZoneId; over: boolean } | null>(
    null,
  );
  // Children consume the origin when the authoritative frame mounts the new card.
  // Clear unused hints after that commit, including seat changes and restores.
  useEffect(() => {
    pending.current = null;
  }, [snapshot]);
  return (
    <MotionConfig reducedMotion="user">
      <CardMotionContext.Provider
        value={{
          stageDraw(from, to, box) {
            pending.current = { from, to, box, snapshot };
          },
          clearDraw() {
            pending.current = null;
          },
          drop,
          setDrop(zone, over = false) {
            setDrop((current) =>
              zone === null
                ? null
                : current?.zone === zone && current.over === over
                  ? current
                  : { zone, over },
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
            return origin.box;
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
