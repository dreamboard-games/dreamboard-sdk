import { motion, useReducedMotion } from "motion/react";
import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CardBack, cardSettle } from "./card";
import type { CardPlacement } from "./card-motion";

/** A confirmed arrival flies outside the clipped hand, then reveals its face. */
export function CardArrival({
  origin,
  landed,
  hidden,
  target,
  destination,
  rotate,
  back,
  children,
  onComplete,
}: {
  origin: CardPlacement | null;
  /** The draw overlay owns the flight until this settles. */
  landed?: Promise<unknown>;
  hidden: boolean;
  /** The card's back art, shown before it turns face up. */
  back?: string | null;
  target: HTMLElement;
  destination: CardPlacement;
  rotate: number;
  children: ReactNode;
  onComplete(): void;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"waiting" | "flight" | "flip">(
    landed ? "waiting" : origin ? "flight" : "flip",
  );
  const [box] = useState(destination);
  const from = landed ? box : (origin ?? box);
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  useLayoutEffect(() => {
    if (reduced) onComplete();
  }, [reduced, onComplete]);
  useLayoutEffect(() => {
    if (!landed) return;
    let cancelled = false;
    void landed.then(() => {
      if (cancelled) return;
      if (hidden) setPhase("flip");
      else onComplete();
    });
    return () => {
      cancelled = true;
    };
  }, [landed, hidden, onComplete]);
  if (reduced || phase === "waiting") return null;
  return createPortal(
    <motion.div
      aria-hidden
      data-card-arrival={phase}
      className="db-card-arrival"
      style={{ width, height, "--card-w": `${width}px` } as CSSProperties}
      initial={{
        x: from.x + from.width / 2 - width / 2,
        y: from.y + from.height / 2 - height / 2,
        scale: origin && !landed ? origin.width / width : 1,
        rotate: from.rotate,
      }}
      animate={{
        x: box.x + box.width / 2 - width / 2,
        y: box.y + box.height / 2 - height / 2,
        scale: 1,
        rotate,
      }}
      transition={cardSettle}
      onAnimationComplete={() => {
        if (hidden) setPhase("flip");
        else onComplete();
      }}
    >
      <motion.div
        className="db-card-flip"
        initial={{ rotateY: hidden ? 180 : 0 }}
        animate={{ rotateY: phase === "flip" ? 0 : hidden ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => {
          if (phase === "flip") onComplete();
        }}
      >
        <div className="db-card-flip-face">{children}</div>
        {hidden && (
          <div className="db-card-flip-back">
            <CardBack image={back} />
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
