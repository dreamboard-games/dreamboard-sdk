import type { CoreInstance, FeatureContext } from "../model.js";
import {
  createPointerSession,
  type PointerInput,
  type PointerSurface,
} from "./pointer-session.js";

export interface ViewportTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}
export interface ViewportSurface extends PointerSurface {
  getBoundingClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly height: number;
  };
}
export interface WheelInput {
  readonly clientX: number;
  readonly clientY: number;
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly currentTarget: ViewportSurface;
  preventDefault(): void;
}
export interface PanZoomOptions {
  readonly initial?: ViewportTransform;
  readonly minScale?: number;
  readonly maxScale?: number;
}

/** Native pointer panning and wheel zoom around the cursor. No document listeners. */
export function panZoomFeature<G>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
  options: PanZoomOptions = {},
) {
  const minScale = options.minScale ?? 0.25;
  const maxScale = options.maxScale ?? 4;
  if (
    !Number.isFinite(minScale) ||
    !Number.isFinite(maxScale) ||
    minScale <= 0 ||
    maxScale < minScale
  ) {
    throw new Error(
      "Viewport scale limits must be positive, finite, and ordered.",
    );
  }
  const initial = options.initial ?? { x: 0, y: 0, scale: 1 };
  let disposed = false;
  let source = game.getOptions().source;
  let seat = game.snapshot?.me;
  let dragOrigin = initial;
  let transform = admit(initial);
  let branch = snapshot();

  function admit(value: ViewportTransform): ViewportTransform {
    if (
      ![value.x, value.y, value.scale].every(Number.isFinite) ||
      value.scale <= 0
    ) {
      throw new Error(
        "Viewport transform must have finite coordinates and positive scale.",
      );
    }
    return Object.freeze({
      x: value.x,
      y: value.y,
      scale: Math.min(maxScale, Math.max(minScale, value.scale)),
    });
  }
  function update(value: ViewportTransform) {
    if (disposed) return;
    const next = admit(value);
    if (
      next.x === transform.x &&
      next.y === transform.y &&
      next.scale === transform.scale
    )
      return;
    transform = next;
    branch = snapshot();
    context.invalidate();
  }
  const pointer = createPointerSession({
    move: ({ delta }) =>
      update({
        ...dragOrigin,
        x: dragOrigin.x + delta.x,
        y: dragOrigin.y + delta.y,
      }),
    end: ({ delta }) =>
      update({
        ...dragOrigin,
        x: dragOrigin.x + delta.x,
        y: dragOrigin.y + delta.y,
      }),
    cancel() {},
  });
  function props() {
    return {
      style: { touchAction: "none" as const },
      onPointerDown(event: PointerInput) {
        if (pointer.start(event)) dragOrigin = transform;
      },
      onPointerMove: pointer.move,
      onPointerUp: pointer.end,
      onPointerCancel: pointer.cancel,
      onLostPointerCapture: pointer.cancel,
      onWheel(event: WheelInput) {
        if (disposed) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const unit =
          event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
        const scale = Math.min(
          maxScale,
          Math.max(
            minScale,
            transform.scale * Math.exp(-event.deltaY * unit * 0.002),
          ),
        );
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const ratio = scale / transform.scale;
        update({
          x: x - (x - transform.x) * ratio,
          y: y - (y - transform.y) * ratio,
          scale,
        });
      },
    };
  }
  function snapshot() {
    const captured = transform;
    return Object.freeze({
      transform: captured,
      getTransform: () => captured,
      getProps: props,
      setTransform: update,
      reset: () => {
        pointer.cancel();
        update(initial);
      },
    });
  }
  const unsubscribe = game.subscribe(() => {
    const nextSource = game.getOptions().source;
    const nextSeat = game.snapshot?.me;
    if (nextSource !== source || nextSeat !== seat) {
      source = nextSource;
      seat = nextSeat;
      pointer.cancel();
      update(initial);
    }
  });
  return {
    root: {
      get viewport() {
        return branch;
      },
    },
    dispose() {
      disposed = true;
      unsubscribe();
      pointer.dispose();
    },
  };
}
