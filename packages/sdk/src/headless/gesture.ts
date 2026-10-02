import type { Point } from "./features/pointer-session.js";

/** Measured with emulated touch; confirm on physical devices before changing. */
export const GESTURE_THRESHOLDS = Object.freeze({
  /** Movement, in CSS pixels, before a press becomes a drag or a browse. */
  slop: 8,
  /** A touch or pen held this long without moving inspects the card. */
  holdMs: 350,
  /** A mouse resting on a card this long inspects it. */
  hoverMs: 250,
  /** A finger drags when upward travel exceeds this multiple of sideways travel. */
  axisBias: 1.25,
});

export interface GesturePointer {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
}

/**
 * How a press ended. A tap leaves selection to the native click; a hold
 * inspected the card; a browse handed sideways movement to native scrolling.
 */
export type GestureKind = "tap" | "hold" | "drag" | "browse";

export interface GestureCallbacks {
  /** A touch or pen stayed still for `holdMs`. */
  hold(): void;
  /** Return false when the card cannot be dragged; the press then browses. */
  dragStart(origin: Point): boolean;
  dragMove(point: Point): void;
  /** The pointer lifted. */
  end(kind: GestureKind, point: Point): void;
  /** The browser or the caller cancelled. A cancelled drag never drops. */
  cancel(kind: GestureKind): void;
}

export interface GestureRecognizer {
  move(event: GesturePointer): void;
  up(event: GesturePointer): void;
  cancel(event?: Pick<GesturePointer, "pointerId">): void;
}

export interface GestureOptions {
  /** Hands keep sideways scrolling; piles can be dragged toward any destination. */
  readonly dragDirection?: "up" | "any";
}

/**
 * Classifies one press. A mouse drags in any direction and never holds. A
 * finger drags upward, browses sideways and holds when still, so cards can use
 * `touch-action: pan-x` and keep native sideways scrolling.
 */
export function createGestureRecognizer(
  down: GesturePointer,
  callbacks: GestureCallbacks,
  options: GestureOptions = {},
): GestureRecognizer {
  const origin = { x: down.clientX, y: down.clientY };
  const mouse = down.pointerType === "mouse";
  let kind: GestureKind = "tap";
  let finished = false;
  const holdTimer = mouse
    ? undefined
    : setTimeout(() => {
        kind = "hold";
        callbacks.hold();
      }, GESTURE_THRESHOLDS.holdMs);
  const point = (event: GesturePointer) => ({
    x: event.clientX,
    y: event.clientY,
  });
  const ours = (event?: Pick<GesturePointer, "pointerId">) =>
    !finished && (!event || event.pointerId === down.pointerId);
  function finish() {
    finished = true;
    clearTimeout(holdTimer);
  }
  return {
    move(event) {
      if (!ours(event)) return;
      if (kind === "drag") return callbacks.dragMove(point(event));
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (kind !== "tap" || Math.hypot(dx, dy) < GESTURE_THRESHOLDS.slop)
        return;
      clearTimeout(holdTimer);
      const lifts =
        mouse ||
        options.dragDirection === "any" ||
        -dy > GESTURE_THRESHOLDS.axisBias * Math.abs(dx);
      if (lifts && callbacks.dragStart(origin)) {
        kind = "drag";
        callbacks.dragMove(point(event));
      } else kind = "browse";
    },
    up(event) {
      if (!ours(event)) return;
      finish();
      callbacks.end(kind, point(event));
    },
    cancel(event) {
      if (!ours(event)) return;
      finish();
      callbacks.cancel(kind);
    },
  };
}
