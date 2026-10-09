import "./tokens.css";
import { motion, type HTMLMotionProps } from "motion/react";
import { useEffect, useState } from "react";

/** The spring every card movement uses, matching the tokens' timings. */
export const cardSpring = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0.15,
} as const;

/** A direct release settles promptly, without a second spring or overshoot. */
export const cardSettle = { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] } as const;
export const cardPickup = { duration: 0.1, ease: "easeOut" } as const;
export const cardDragScale = 1.2;
/**
 * A dragged copy's scale: lifted until it nears a landing, then that
 * landing's size, still a little raised until it sits in a pile.
 */
export function dragCopyScale(
  fit: { readonly scale: number | null; readonly snapped: boolean },
  lifted = cardDragScale,
) {
  return fit.scale === null
    ? lifted
    : fit.snapped
      ? fit.scale
      : fit.scale * 1.08;
}
/** A short tick on touch devices as a dragged card settles into a pile. */
export function useSnapTick(snapped: boolean) {
  useEffect(() => {
    if (snapped && matchMedia("(pointer: coarse)").matches)
      navigator.vibrate?.(8);
  }, [snapped]);
}

export type CardState = "idle" | "eligible" | "selected" | "dimmed";
export type CardProps = HTMLMotionProps<"div"> & {
  state?: CardState;
  /** Change it to shake the card, as when a dimmed card is tapped. */
  shake?: number;
};
/**
 * A visual card face. Compose inside a button when the card is actionable.
 * Give the same `layoutId` to a card in each place it can be, and Motion
 * moves it between them.
 */
export function Card({
  state = "idle",
  shake = 0,
  className = "",
  onLayoutAnimationStart,
  onLayoutAnimationComplete,
  ...props
}: CardProps) {
  const moving = useMoving(onLayoutAnimationStart, onLayoutAnimationComplete);
  return (
    <motion.div
      transition={cardSpring}
      {...props}
      {...moving}
      data-card-state={state}
      data-shake={shake ? (shake % 2 ? "a" : "b") : undefined}
      className={`db-card ${className}`}
    />
  );
}
/** Marks an element `data-moving` while Motion carries it between places, so it can fly above the rest. */
export function useMoving(onStart?: () => void, onComplete?: () => void) {
  const [moving, setMoving] = useState(false);
  return {
    "data-moving": moving || undefined,
    onLayoutAnimationStart() {
      setMoving(true);
      onStart?.();
    },
    onLayoutAnimationComplete() {
      setMoving(false);
      onComplete?.();
    },
  };
}
/** A card's back art: a visible card's from its view, a hidden card's own. */
export function backImageOf(card: {
  readonly view: unknown;
  readonly backImage?: string | null;
}) {
  const { view } = card;
  return view !== null &&
    typeof view === "object" &&
    "backImage" in view &&
    typeof view.backImage === "string"
    ? view.backImage
    : (card.backImage ?? null);
}
/** A face-down card: the game's back art when `image` is given, a plain back otherwise. */
export function CardBack({
  image,
  className = "",
  ...props
}: HTMLMotionProps<"div"> & { image?: string | null }) {
  return (
    <motion.div
      role="img"
      aria-label="Face-down card"
      transition={cardSpring}
      {...props}
      className={`db-card ${image ? "db-image-card" : "db-card-back"} ${className}`}
    >
      {image && <img src={image} alt="" draggable={false} />}
    </motion.div>
  );
}
