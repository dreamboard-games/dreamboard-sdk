import { useEffect, useRef, useState, type PointerEvent } from "react";

export interface MarqueeBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** An opt-in background gesture. Bounds use viewport coordinates for an authored fixed overlay. */
export function useMarqueeSelection<Id extends string>(options: {
  readonly enabled: boolean;
  readonly getCards: () => readonly {
    readonly id: Id;
    readonly element: Element;
  }[];
  readonly onSelect: (ids: readonly Id[], additive: boolean) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const [bounds, setBounds] = useState<MarqueeBounds | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  useEffect(() => {
    if (!options.enabled) {
      cleanup.current?.();
      setBounds(null);
    }
  }, [options.enabled]);
  return {
    bounds,
    props: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (
          !latest.current.enabled ||
          event.button !== 0 ||
          event.pointerType === "touch" ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          (event.target as Element).closest(
            "button, input, select, textarea, a, [contenteditable], [data-card-gesture]",
          )
        )
          return;
        event.preventDefault();
        cleanup.current?.();
        const x = event.clientX,
          y = event.clientY,
          pointerId = event.pointerId;
        const area = event.currentTarget;
        const additive = event.shiftKey;
        const doc = event.currentTarget.ownerDocument;
        let rectangle: MarqueeBounds | null = null;
        function move(next: globalThis.PointerEvent) {
          if (next.pointerId !== pointerId) return;
          if (!rectangle && Math.hypot(next.clientX - x, next.clientY - y) < 8)
            return;
          const box = area.getBoundingClientRect();
          const right = Math.min(box.right, Math.max(x, next.clientX));
          const bottom = Math.min(box.bottom, Math.max(y, next.clientY));
          const left = Math.max(box.left, Math.min(x, next.clientX));
          const top = Math.max(box.top, Math.min(y, next.clientY));
          rectangle = { left, top, width: right - left, height: bottom - top };
          setBounds(rectangle);
          next.preventDefault();
        }
        function stop() {
          doc.removeEventListener("pointermove", move);
          doc.removeEventListener("pointerup", up);
          doc.removeEventListener("pointercancel", cancel);
          doc.removeEventListener("keydown", key);
          doc.defaultView?.removeEventListener("blur", cancel);
          cleanup.current = null;
        }
        function cancel() {
          stop();
          setBounds(null);
        }
        function key(next: KeyboardEvent) {
          if (next.key === "Escape") {
            next.preventDefault();
            cancel();
          }
        }
        function up(next: globalThis.PointerEvent) {
          if (next.pointerId !== pointerId) return;
          const ids = rectangle
            ? latest.current
                .getCards()
                .filter(({ element }) => {
                  const box = element.getBoundingClientRect();
                  const region = rectangle!;
                  return (
                    box.right > region.left &&
                    box.left < region.left + region.width &&
                    box.bottom > region.top &&
                    box.top < region.top + region.height
                  );
                })
                .map((card) => card.id)
            : [];
          stop();
          setBounds(null);
          latest.current.onSelect(ids, additive);
        }
        cleanup.current = stop;
        doc.addEventListener("pointermove", move, { passive: false });
        doc.addEventListener("pointerup", up);
        doc.addEventListener("pointercancel", cancel);
        doc.addEventListener("keydown", key);
        doc.defaultView?.addEventListener("blur", cancel);
      },
    },
  };
}
