import { Dialog } from "@base-ui/react/dialog";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./tokens.css";
export interface CardPreviewProps {
  via: "hover" | "hold" | "action";
  anchor: Element | null;
  children: ReactNode;
  onClose?(): void;
}
/** Alt/Option, a held finger, or the card menu explicitly opens inspection. */
export function CardPreview({
  via,
  anchor,
  children,
  onClose,
}: CardPreviewProps) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (via === "hold") navigator.vibrate?.(12);
  }, [via]);
  if (via === "action")
    return (
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="db-inspect-backdrop" />
          <Dialog.Popup
            className="db-inspect-dialog db-card-preview"
            finalFocus={() => (anchor instanceof HTMLElement ? anchor : null)}
          >
            <Dialog.Title className="sr-only">Card inspection</Dialog.Title>
            {children}
            <Dialog.Close className="db-inspect-close">Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  return createPortal(
    <motion.div
      className="db-card-preview db-card-preview-hold"
      aria-hidden
      data-card-preview={via}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.12 }}
    >
      {children}
    </motion.div>,
    document.body,
  );
}
