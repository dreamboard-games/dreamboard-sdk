/**
 * Drag overlay rendering for the card drag surface.
 *
 * Presentational overlays rendered into a portal by `CardDragSurface`:
 *
 * - `DragOverlay` — the lifted card following the pointer (or pinned at the
 *   source rect for keyboard drags)
 * - `SettleOverlay` — the committed-drop animation toward the target rect
 * - `ReturnOverlay` — the snap-back animation toward the source rect
 *
 * These components are stateless with respect to the drag lifecycle; all
 * session data arrives via props.
 */

import { motion, type Transition } from "framer-motion";
import type {
  ActiveDragState,
  ReturningState,
  SettlingState,
} from "./types.js";

export const REDUCED_TRANSITION: Transition = { duration: 0 };

export interface DragOverlayProps {
  session: ActiveDragState;
  reducedMotion: boolean;
}

export function DragOverlay({ session, reducedMotion }: DragOverlayProps) {
  if (session.source === "keyboard") {
    return (
      <motion.div
        key="overlay-keyboard"
        data-dreamboard-card-drag-overlay=""
        data-source="keyboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reducedMotion ? REDUCED_TRANSITION : { duration: 0.12 }}
        style={{
          position: "fixed",
          left: session.sourceRect.left,
          top: session.sourceRect.top,
          width: session.sourceRect.width,
          height: session.sourceRect.height,
          pointerEvents: "none",
          zIndex: 1000,
          boxShadow: reducedMotion ? "none" : "0 12px 32px rgba(0,0,0,0.18)",
          borderRadius: 12,
        }}
      >
        {session.content}
      </motion.div>
    );
  }

  const liftedAnimate = reducedMotion
    ? {
        scale: 1,
        rotate: 0,
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
      }
    : {
        scale: [1, 1.42, 1.35],
        rotate: [0, -3, 3, -1.8, 1.8, 0],
        filter: [
          "drop-shadow(0 4px 8px rgba(0,0,0,0.18))",
          "drop-shadow(0 24px 36px rgba(0,0,0,0.36))",
        ],
      };
  const liftedTransition: Transition = reducedMotion
    ? REDUCED_TRANSITION
    : {
        scale: { type: "spring", stiffness: 420, damping: 22, mass: 0.7 },
        rotate: { duration: 0.55, ease: "easeInOut" },
        filter: { duration: 0.18, ease: "easeOut" },
      };
  return (
    <motion.div
      key="overlay-pointer"
      data-dreamboard-card-drag-overlay=""
      data-source="pointer"
      initial={{
        scale: 1,
        rotate: 0,
        opacity: 1,
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))",
      }}
      animate={liftedAnimate}
      exit={{ opacity: 0 }}
      transition={liftedTransition}
      style={{
        position: "fixed",
        left: session.pointerX - session.sourceRect.width / 2,
        top: session.pointerY - session.sourceRect.height / 2,
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
        touchAction: "none",
        transformOrigin: "center center",
        willChange: "transform, filter",
      }}
    >
      {session.content}
    </motion.div>
  );
}

export interface SettleOverlayProps {
  session: SettlingState;
  transition: Transition;
  onDone: () => void;
}

export function SettleOverlay({
  session,
  transition,
  onDone,
}: SettleOverlayProps) {
  const startLeft = session.pointerX - session.sourceRect.width / 2;
  const startTop = session.pointerY - session.sourceRect.height / 2;
  const endLeft =
    session.targetRect.left +
    session.targetRect.width / 2 -
    session.sourceRect.width / 2;
  const endTop =
    session.targetRect.top +
    session.targetRect.height / 2 -
    session.sourceRect.height / 2;
  return (
    <motion.div
      data-dreamboard-card-drag-overlay=""
      data-source={session.source}
      data-drag-phase="settling"
      initial={{ left: startLeft, top: startTop, scale: 1.06, opacity: 1 }}
      animate={{ left: endLeft, top: endTop, scale: 0.92, opacity: 0 }}
      transition={transition}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {session.content}
    </motion.div>
  );
}

export interface ReturnOverlayProps {
  session: ReturningState;
  transition: Transition;
  onDone: () => void;
}

export function ReturnOverlay({
  session,
  transition,
  onDone,
}: ReturnOverlayProps) {
  const startLeft = session.pointerX - session.sourceRect.width / 2;
  const startTop = session.pointerY - session.sourceRect.height / 2;
  return (
    <motion.div
      data-dreamboard-card-drag-overlay=""
      data-source={session.source}
      data-drag-phase="returning"
      initial={{ left: startLeft, top: startTop, scale: 1.06, opacity: 1 }}
      animate={{
        left: session.sourceRect.left,
        top: session.sourceRect.top,
        scale: 1,
        opacity: 1,
      }}
      exit={{ opacity: 0 }}
      transition={transition}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {session.content}
    </motion.div>
  );
}
