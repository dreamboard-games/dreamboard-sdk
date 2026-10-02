import { PreviewCard } from "@base-ui/react/preview-card";
import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cardSpring } from "./card";
import "./tokens.css";
export interface CardPreviewProps {
  /** `useCardGesture(...).inspecting`: a resting mouse or a held finger. */
  via: "hover" | "hold";
  /** The inspected card's element; a hover preview sits beside it. */
  anchor: Element | null;
  /** The enlarged card. Cards inside size themselves with `--card-w-preview`. */
  children: ReactNode;
}
/**
 * An enlarged copy of an inspected card. A mouse sees it beside the card
 * without moving the layout; a held finger sees it centred over a dimmed
 * table, with a short vibration where the browser supports it. Neither takes
 * focus, and the card's own label already names it.
 */
export function CardPreview({ via, anchor, children }: CardPreviewProps) {
  useEffect(() => {
    if (via === "hold") navigator.vibrate?.(12);
  }, [via]);
  if (via === "hover")
    return (
      <PreviewCard.Root open>
        <PreviewCard.Portal>
          <PreviewCard.Positioner
            anchor={anchor}
            side="right"
            sideOffset={12}
            collisionPadding={8}
            className="z-50"
          >
            <PreviewCard.Popup
              className="db-card-preview"
              aria-hidden
              data-card-preview="hover"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    );
  return createPortal(
    <motion.div
      className="db-card-preview db-card-preview-hold"
      aria-hidden
      data-card-preview="hold"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={cardSpring}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
