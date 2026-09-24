/** Native pointer surface; importing a feature never requires browser globals. */
export interface PointerSurface {
  setPointerCapture(pointerId: number): void;
  hasPointerCapture(pointerId: number): boolean;
  releasePointerCapture(pointerId: number): void;
}

export interface PointerInput {
  readonly pointerId: number;
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly currentTarget: PointerSurface;
  preventDefault(): void;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PointerMove {
  readonly origin: Point;
  readonly point: Point;
  readonly delta: Point;
}

/** One captured gesture. Pointer cancellation and disposal never commit a drop. */
export function createPointerSession(callbacks: {
  move(value: PointerMove): void;
  end(value: PointerMove): void;
  cancel(): void;
}) {
  let disposed = false;
  let active:
    | { id: number; surface: PointerSurface; origin: Point; point: Point }
    | undefined;

  function value(): PointerMove {
    const { origin, point } = active!;
    return {
      origin,
      point,
      delta: { x: point.x - origin.x, y: point.y - origin.y },
    };
  }

  function release() {
    const previous = active;
    active = undefined;
    if (previous?.surface.hasPointerCapture(previous.id)) {
      previous.surface.releasePointerCapture(previous.id);
    }
  }

  function cancel() {
    if (!active) return;
    release();
    callbacks.cancel();
  }

  return {
    start(event: PointerInput): boolean {
      if (disposed || active || event.button !== 0) return false;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = { x: event.clientX, y: event.clientY };
      active = {
        id: event.pointerId,
        surface: event.currentTarget,
        origin: point,
        point,
      };
      event.preventDefault();
      return true;
    },
    move(event: PointerInput) {
      if (event.pointerId !== active?.id) return;
      active.point = { x: event.clientX, y: event.clientY };
      event.preventDefault();
      callbacks.move(value());
    },
    end(event: PointerInput) {
      if (event.pointerId !== active?.id) return;
      active.point = { x: event.clientX, y: event.clientY };
      const result = value();
      release();
      callbacks.end(result);
    },
    cancel(event?: Pick<PointerInput, "pointerId">) {
      if (event && event.pointerId !== active?.id) return;
      cancel();
    },
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
