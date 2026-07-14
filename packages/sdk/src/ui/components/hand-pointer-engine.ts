/**
 * Deterministic pointer recognizer for the controlled hand view.
 *
 * The engine is independent from React: it consumes pointer events and a
 * caller-supplied callbacks bag, and produces semantic gesture events. It
 * owns no DOM, emits no `CardIntent`, and does not track the drag-lifecycle
 * `phase` — that responsibility lives in `CardDragSurface`. The engine only
 * recognizes `tap`, `previewStart`/`previewEnd`, `liftStart`/`liftMove`/
 * `liftEnd`/`liftCancel`, and a `horizontalBrowse` informational signal.
 *
 * The thresholds match
 * `docs/reference/ui-sdk-mobile-hand-and-card-interactions.md`:
 *
 * | Threshold                 | Default     |
 * | ------------------------- | ----------- |
 * | Press preview delay       | `220ms`     |
 * | Movement slop             | `8px`       |
 * | Axis bias                 | `1.25`      |
 * | Drag lift distance        | `28px`      |
 *
 * Callers wire the engine's `handlePointerDown` / `handlePointerMove` /
 * `handlePointerUp` / `handlePointerCancel` to the matching DOM events on
 * each interactive card.
 */

export type HandInteractionPolicy = "direct-activate" | "drag-to-target";

/**
 * Internal recognition state. Not exposed to consumers because drag-lifecycle
 * phases (`inspecting`/`dragging`/`settling`/`returning`) live in
 * `CardDragSurface`.
 */
export type CardPointerState =
  | { kind: "idle" }
  | { kind: "pressing"; pointerId: number; cardId: string; startedAt: number }
  | { kind: "preview"; pointerId: number; cardId: string }
  | { kind: "horizontalBrowse"; pointerId: number; cardId: string }
  | { kind: "lifted"; pointerId: number; cardId: string };

export interface PointerEngineThresholds {
  pressPreviewMs: number;
  movementSlopPx: number;
  axisBiasRatio: number;
  dragLiftDistancePx: number;
}

export const DEFAULT_POINTER_THRESHOLDS: PointerEngineThresholds = {
  pressPreviewMs: 220,
  movementSlopPx: 8,
  axisBiasRatio: 1.25,
  dragLiftDistancePx: 28,
};

export type AxisDecision = "undecided" | "horizontal" | "upward";

export function resolveAxis(
  dx: number,
  dy: number,
  thresholds: PointerEngineThresholds = DEFAULT_POINTER_THRESHOLDS,
): AxisDecision {
  if (
    Math.abs(dx) < thresholds.movementSlopPx &&
    Math.abs(dy) < thresholds.movementSlopPx
  ) {
    return "undecided";
  }
  if (Math.abs(dx) > Math.abs(dy) * thresholds.axisBiasRatio)
    return "horizontal";
  if (-dy > Math.abs(dx) * thresholds.axisBiasRatio) return "upward";
  return "undecided";
}

export interface PointerEngineCardSnapshot {
  cardId: string;
  /** Whether the runtime adapter says this card is interactive. */
  eligible: boolean;
  /** Whether the runtime adapter says this card is disabled. */
  disabled: boolean;
}

export interface LiftStartEvent {
  cardId: string;
  pointerId: number;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
}

export interface LiftMoveEvent {
  cardId: string;
  pointerId: number;
  pointerX: number;
  pointerY: number;
}

export interface LiftEndEvent {
  cardId: string;
  pointerId: number;
  pointerX: number;
  pointerY: number;
}

export interface PointerEngineCallbacks {
  /**
   * Recognized clean tap (no movement, no preview). Source is `pointer` for
   * pointerup taps; the keyboard activation path is a separate caller method
   * (see `triggerKeyboardActivate`/`triggerKeyboardLift`).
   */
  onTap?: (cardId: string) => void;
  /** Long-press preview started. */
  onPreviewStart?: (cardId: string) => void;
  /** Preview ended (release or axis disqualification). */
  onPreviewEnd?: (cardId: string) => void;
  /** Vertical lift gesture began past the drag threshold. */
  onLiftStart?: (event: LiftStartEvent) => void;
  /** Pointer move while lifted. */
  onLiftMove?: (event: LiftMoveEvent) => void;
  /** Pointer release while lifted. */
  onLiftEnd?: (event: LiftEndEvent) => void;
  /** Lift was cancelled (pointer cancel/lost capture). */
  onLiftCancel?: (cardId: string) => void;
  /** Horizontal browse arbitration (informational). */
  onHorizontalBrowse?: (cardId: string) => void;
  /**
   * Called when the engine has captured the pointer and wants the host to
   * suppress scrolling. The host controls the `touch-action` value.
   */
  onLockScroll?: (locked: boolean) => void;
  /** Called whenever the recognition state transitions, for visual hints. */
  onStateChange?: (next: CardPointerState) => void;
}

interface ActivePointer {
  cardId: string;
  pointerId: number;
  startedAt: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  axis: AxisDecision;
  /** Set when the long-press preview timer fires. */
  previewActive: boolean;
}

export class HandPointerEngine {
  private readonly callbacks: PointerEngineCallbacks;
  private readonly thresholds: PointerEngineThresholds;
  private active: ActivePointer | null = null;
  private state: CardPointerState = { kind: "idle" };
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private now: () => number;

  constructor(
    callbacks: PointerEngineCallbacks,
    thresholds: PointerEngineThresholds = DEFAULT_POINTER_THRESHOLDS,
    now: () => number = () => Date.now(),
  ) {
    this.callbacks = callbacks;
    this.thresholds = thresholds;
    this.now = now;
  }

  /** Returns the most recently emitted recognition state (test helper). */
  getState(): CardPointerState {
    return this.state;
  }

  dispose(): void {
    this.clearPreviewTimer();
    if (this.state.kind === "lifted") {
      this.callbacks.onLiftCancel?.(this.state.cardId);
    }
    this.active = null;
    this.transition({ kind: "idle" });
    this.callbacks.onLockScroll?.(false);
  }

  handlePointerDown(
    card: PointerEngineCardSnapshot,
    event: { pointerId: number; clientX: number; clientY: number },
  ): void {
    if (this.active) return;
    if (card.disabled) return;

    const startedAt = this.now();
    this.active = {
      cardId: card.cardId,
      pointerId: event.pointerId,
      startedAt,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      axis: "undecided",
      previewActive: false,
    };
    this.transition({
      kind: "pressing",
      pointerId: event.pointerId,
      cardId: card.cardId,
      startedAt,
    });
    this.schedulePreview(card);
  }

  handlePointerMove(
    card: PointerEngineCardSnapshot,
    event: { pointerId: number; clientX: number; clientY: number },
  ): void {
    const pointer = this.active;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (pointer.cardId !== card.cardId) return;

    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const axis = resolveAxis(dx, dy, this.thresholds);
    if (axis !== "undecided") pointer.axis = axis;

    if (this.state.kind === "lifted") {
      this.callbacks.onLiftMove?.({
        cardId: pointer.cardId,
        pointerId: pointer.pointerId,
        pointerX: event.clientX,
        pointerY: event.clientY,
      });
      return;
    }

    if (this.state.kind === "pressing") {
      if (axis === "horizontal") {
        this.clearPreviewTimer();
        this.transition({
          kind: "horizontalBrowse",
          pointerId: pointer.pointerId,
          cardId: pointer.cardId,
        });
        this.callbacks.onHorizontalBrowse?.(pointer.cardId);
        return;
      }
      if (
        axis === "upward" &&
        card.eligible &&
        -dy >= this.thresholds.dragLiftDistancePx
      ) {
        this.clearPreviewTimer();
        this.beginLift(pointer, event.clientX, event.clientY);
        return;
      }
      return;
    }

    if (this.state.kind === "preview") {
      if (
        axis === "upward" &&
        card.eligible &&
        -dy >= this.thresholds.dragLiftDistancePx
      ) {
        this.callbacks.onPreviewEnd?.(card.cardId);
        pointer.previewActive = false;
        this.beginLift(pointer, event.clientX, event.clientY);
        return;
      }
      if (axis === "horizontal") {
        this.callbacks.onPreviewEnd?.(card.cardId);
        pointer.previewActive = false;
        this.transition({
          kind: "horizontalBrowse",
          pointerId: pointer.pointerId,
          cardId: pointer.cardId,
        });
        this.callbacks.onHorizontalBrowse?.(pointer.cardId);
        return;
      }
      return;
    }

    // horizontalBrowse — remain locked until release.
  }

  handlePointerUp(
    card: PointerEngineCardSnapshot,
    event: { pointerId: number; clientX: number; clientY: number },
  ): void {
    const pointer = this.active;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (pointer.cardId !== card.cardId) return;
    this.clearPreviewTimer();

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const isTap =
      pointer.axis === "undecided" &&
      !pointer.previewActive &&
      Math.abs(dx) < this.thresholds.movementSlopPx &&
      Math.abs(dy) < this.thresholds.movementSlopPx;

    if (this.state.kind === "lifted") {
      this.callbacks.onLiftEnd?.({
        cardId: pointer.cardId,
        pointerId: pointer.pointerId,
        pointerX: event.clientX,
        pointerY: event.clientY,
      });
      this.reset();
      return;
    }

    if (isTap) {
      if (card.eligible && !card.disabled) {
        this.callbacks.onTap?.(card.cardId);
      }
      this.reset();
      return;
    }

    if (pointer.previewActive) {
      this.callbacks.onPreviewEnd?.(card.cardId);
    }
    this.reset();
  }

  handlePointerCancel(card: PointerEngineCardSnapshot): void {
    const pointer = this.active;
    if (!pointer || pointer.cardId !== card.cardId) return;
    this.clearPreviewTimer();
    if (this.state.kind === "lifted") {
      this.callbacks.onLiftCancel?.(card.cardId);
      this.reset();
      return;
    }
    if (pointer.previewActive) {
      this.callbacks.onPreviewEnd?.(card.cardId);
    }
    this.reset();
  }

  /**
   * Programmatic reset of recognition state (e.g. after the surface commits
   * a keyboard lift externally). Does not emit callbacks.
   */
  resetRecognition(): void {
    this.clearPreviewTimer();
    this.active = null;
    this.callbacks.onLockScroll?.(false);
    this.transition({ kind: "idle" });
  }

  private beginLift(
    pointer: ActivePointer,
    clientX: number,
    clientY: number,
  ): void {
    this.callbacks.onLockScroll?.(true);
    const grabOffsetX = clientX - pointer.startX;
    const grabOffsetY = clientY - pointer.startY;
    this.transition({
      kind: "lifted",
      pointerId: pointer.pointerId,
      cardId: pointer.cardId,
    });
    this.callbacks.onLiftStart?.({
      cardId: pointer.cardId,
      pointerId: pointer.pointerId,
      startX: pointer.startX,
      startY: pointer.startY,
      pointerX: clientX,
      pointerY: clientY,
      grabOffsetX,
      grabOffsetY,
    });
  }

  private schedulePreview(card: PointerEngineCardSnapshot): void {
    this.clearPreviewTimer();
    this.previewTimer = setTimeout(() => {
      const pointer = this.active;
      if (!pointer || pointer.cardId !== card.cardId) return;
      if (pointer.axis !== "undecided") return;
      pointer.previewActive = true;
      this.callbacks.onPreviewStart?.(card.cardId);
      this.transition({
        kind: "preview",
        pointerId: pointer.pointerId,
        cardId: card.cardId,
      });
    }, this.thresholds.pressPreviewMs);
  }

  private clearPreviewTimer(): void {
    if (this.previewTimer !== null) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  }

  private reset(): void {
    this.active = null;
    this.callbacks.onLockScroll?.(false);
    this.transition({ kind: "idle" });
  }

  private transition(next: CardPointerState): void {
    this.state = next;
    this.callbacks.onStateChange?.(next);
  }
}
