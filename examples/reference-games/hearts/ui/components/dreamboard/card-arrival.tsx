import { motion, useReducedMotion } from "motion/react";
import {
  useLayoutEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CardBack, cardSpring } from "./card";
import type { CardBox } from "./card-motion";

/** A confirmed arrival flies outside the scrolling hand, then reveals its face. */
export function CardArrival({
  origin,
  hidden,
  target,
  rotate,
  children,
  onComplete,
}: {
  origin: CardBox | null;
  hidden: boolean;
  target: HTMLElement;
  rotate: number;
  children: ReactNode;
  onComplete(): void;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"flight" | "flip">(
    origin ? "flight" : "flip",
  );
  const [box] = useState(() => target.getBoundingClientRect());
  const from = origin ?? box;
  const width = target.offsetWidth;
  const height = target.offsetHeight;
  useLayoutEffect(() => {
    if (reduced) onComplete();
  }, [reduced, onComplete]);
  if (reduced) return null;
  return createPortal(
    <motion.div
      aria-hidden
      data-card-arrival={phase}
      className="db-card-arrival"
      style={{ width, height, "--card-w": `${width}px` } as CSSProperties}
      initial={{
        x: from.x + from.width / 2 - width / 2,
        y: from.y + from.height / 2 - height / 2,
        scale: origin ? origin.width / width : 1,
        rotate: origin ? 0 : rotate,
      }}
      animate={{
        x: box.x + box.width / 2 - width / 2,
        y: box.y + box.height / 2 - height / 2,
        scale: 1,
        rotate,
      }}
      transition={cardSpring}
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
            <CardBack />
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
