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
 * inspected the card; a browse handed sideways movement to native scrolling,
 * or scrubbed along a row.
 */
export type GestureKind = "tap" | "hold" | "drag" | "browse";

export interface GestureCallbacks {
  /** A touch or pen stayed still for `holdMs`. */
  hold(): void;
  /** Return false when the card cannot be dragged; the press then browses. */
  dragStart(origin: Point): boolean;
  dragMove(point: Point): void;
  /** A scrubbing finger moved while browsing. */
  browse?(point: Point): void;
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
  /** Cards drag upward on touch; piles can be dragged toward any destination. */
  readonly dragDirection?: "up" | "any";
  /**
   * A browsing finger scrubs along its row instead of scrolling it: `browse`
   * reports every move, and turning upward still drags.
   */
  readonly scrub?: boolean;
}

/**
 * Classifies one press. A mouse drags in any direction and never holds. A
 * finger drags upward, browses sideways and holds when still, so cards can use
 * `touch-action: pan-x` and keep native sideways scrolling, or
 * `touch-action: none` and scrub.
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
  // Where an upward pull out of a scrub starts: the last point it was not rising.
  let pull: Point = origin;
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
  const rises = (from: Point, to: Point) =>
    from.y - to.y > GESTURE_THRESHOLDS.axisBias * Math.abs(to.x - from.x);
  function drag(from: Point, to: Point) {
    if (!callbacks.dragStart(from)) return false;
    kind = "drag";
    callbacks.dragMove(to);
    return true;
  }
  return {
    move(event) {
      if (!ours(event)) return;
      const at = point(event);
      if (kind === "drag") return callbacks.dragMove(at);
      if (kind === "browse") {
        if (!options.scrub) return;
        callbacks.browse?.(at);
        // A refused pull starts over, so a card that cannot drag is asked once per pull.
        if (
          !rises(pull, at) ||
          (pull.y - at.y >= GESTURE_THRESHOLDS.slop && !drag(pull, at))
        )
          pull = at;
        return;
      }
      if (
        kind !== "tap" ||
        Math.hypot(at.x - origin.x, at.y - origin.y) < GESTURE_THRESHOLDS.slop
      )
        return;
      clearTimeout(holdTimer);
      const lifts =
        mouse || options.dragDirection === "any" || rises(origin, at);
      if (lifts && drag(origin, at)) return;
      kind = "browse";
      pull = at;
      if (options.scrub) callbacks.browse?.(at);
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

/** Magnetic rectangular UI targets. A wider exit band prevents edge flicker.
 * Call only for eligible targets; SVG board spaces keep native hit testing. */
export function magneticDropPoint(
  point: Point,
  box: { x: number; y: number; width: number; height: number },
  retained: boolean,
  coarse: boolean,
): Point | null {
  const radius = coarse ? (retained ? 52 : 28) : retained ? 36 : 18;
  if (box.width <= 0 || box.height <= 0) return null;
  const x = Math.max(box.x, Math.min(point.x, box.x + box.width));
  const y = Math.max(box.y, Math.min(point.y, box.y + box.height));
  return Math.hypot(point.x - x, point.y - y) <= radius ? { x, y } : null;
}
