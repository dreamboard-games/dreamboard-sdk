import { useGame } from "@game";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./tokens.css";
export interface TurnBannerProps {
  label?: string;
  className?: string;
}
/** Announces "Your turn" briefly each time the selected seat can act again. */
export function TurnBanner({
  label = "Your turn",
  className = "",
}: TurnBannerProps) {
  const me = useGame((game) => game.me?.id ?? null);
  const canAct = useGame((game) => game.me?.getCanAct() ?? false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(canAct);
    if (!canAct) return;
    const timer = setTimeout(() => setShown(false), 1400);
    return () => clearTimeout(timer);
  }, [canAct, me]);
  // The live region stays mounted so the banner's text is announced.
  return createPortal(
    <MotionConfig reducedMotion="user">
      <div role="status" className={`db-turn-banner ${className}`}>
        <AnimatePresence>
          {shown && (
            <motion.p
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }}
            >
              {label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>,
    document.body,
  );
}
