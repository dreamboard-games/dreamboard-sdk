import { handFanTiming } from "@dreamboard-games/sdk";
import { motion, useReducedMotion } from "motion/react";
import {
  useLayoutEffect,
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CardBack } from "./card";
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
  const box = destination;
  const [from] = useState(origin ?? box);
  // Sorting can overlap travel and the face turn; reveal only after both finish.
  const moving = useRef(!!origin);
  const flipped = useRef(!hidden);
  const latest = useRef({ ...box, rotate });
  useLayoutEffect(() => {
    const previous = latest.current;
    if (
      previous.x !== box.x ||
      previous.y !== box.y ||
      previous.width !== box.width ||
      previous.height !== box.height ||
      previous.rotate !== rotate
    )
      moving.current = true;
    latest.current = { ...box, rotate };
  }, [box.x, box.y, box.width, box.height, rotate]);
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
      const target = latest.current;
      if (
        from.x !== target.x ||
        from.y !== target.y ||
        from.width !== target.width ||
        from.height !== target.height ||
        from.rotate !== target.rotate
      ) {
        moving.current = true;
        setPhase("flight");
      } else {
        moving.current = false;
        if (hidden) setPhase("flip");
        else onComplete();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [landed, hidden, from, onComplete]);
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
      transition={handFanTiming.settle}
      onAnimationComplete={() => {
        moving.current = false;
        if (flipped.current) onComplete();
        else setPhase("flip");
      }}
    >
      <motion.div
        className="db-card-flip"
        initial={{ rotateY: hidden ? 180 : 0 }}
        animate={{ rotateY: phase === "flip" ? 0 : hidden ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => {
          if (phase === "flip") {
            flipped.current = true;
            if (!moving.current) onComplete();
          }
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
