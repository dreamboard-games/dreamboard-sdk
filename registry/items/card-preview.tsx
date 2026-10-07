import { Dialog } from "@base-ui/react/dialog";
import { motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  const [size, setSize] = useState({
    width: 0,
    height: 0,
    sourceWidth: 0,
    sourceHeight: 0,
  });
  useLayoutEffect(() => {
    const face = anchor?.querySelector<HTMLElement>(".db-card");
    if (!face) return;
    const measure = () => {
      // Resolved CSS dimensions exclude the fan transform and retain subpixels.
      const style = getComputedStyle(face);
      const sourceWidth = parseFloat(style.width);
      const sourceHeight = parseFloat(style.height);
      const aspect = sourceWidth / sourceHeight;
      const availableHeight = innerHeight * 0.82 - (via === "action" ? 72 : 0);
      const width = Math.min(480, innerWidth * 0.82, availableHeight * aspect);
      setSize({
        width,
        height: width / aspect,
        sourceWidth,
        sourceHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      removeEventListener("resize", measure);
    };
  }, [anchor, via]);
  const face = (
    <div
      className="db-card-preview-frame"
      style={{ width: size.width, height: size.height }}
    >
      <div
        className="db-card-preview-face"
        style={
          {
            "--card-w": `${size.sourceWidth}px`,
            width: size.sourceWidth,
            height: size.sourceHeight,
            transform: `scale(${size.sourceWidth ? size.width / size.sourceWidth : 1})`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
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
            {face}
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
      {face}
    </motion.div>,
    document.body,
  );
}
