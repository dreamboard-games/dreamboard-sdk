import { createStore } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";
import {
  createContext,
  useContext,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  createGestureRecognizer,
  GESTURE_THRESHOLDS,
  type GestureRecognizer,
} from "../headless/gesture.js";
import { isSameDropTarget } from "../headless/drop-targets.js";
import type { Point } from "../headless/features/pointer-session.js";
import type {
  RuntimeDropTarget,
  RuntimeTargetOptions,
} from "../headless/targets.js";

/** The runtime surface of `dragFeature` that a gesture needs. */
export interface GestureDrag {
  readonly active: { readonly target: RuntimeDropTarget | null } | null;
  getCanDrag(cardId: string, options?: RuntimeTargetOptions): boolean;
  getDropTargets(): readonly RuntimeDropTarget[];
  begin(cardId: string, options?: RuntimeTargetOptions): boolean;
  setDropTarget(target: RuntimeDropTarget | null): void;
  drop(): void;
  cancel(): void;
}
export interface GestureGame {
  readonly drag?: GestureDrag;
  readonly request: unknown;
  subscribe(listener: () => void): () => void;
}

export interface GestureState {
  readonly drag: {
    readonly cardId: string;
    /** Pointer offset inside the card where it was picked up. */
    readonly grab: Point;
    readonly size: { readonly width: number; readonly height: number };
    /** Dropped and submitted; waiting for the authoritative frame. */
    readonly settling: boolean;
  } | null;
  readonly inspect: {
    readonly cardId: string;
    readonly via: "hold" | "hover";
  } | null;
}

export interface CardGestureProps {
  onPointerDown(event: PointerEvent<Element>): void;
  onPointerEnter(event: PointerEvent<Element>): void;
  onPointerLeave(event: PointerEvent<Element>): void;
  onContextMenu(event: MouseEvent<Element>): void;
  onDragStart(event: DragEvent<Element>): void;
  readonly style: CSSProperties;
  readonly "data-dragging"?: true;
  readonly "data-inspecting"?: "hold" | "hover";
}

const CARD_STYLE: CSSProperties = Object.freeze({
  // Sideways movement stays native scrolling; everything else reaches the recognizer.
  touchAction: "pan-x",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
});
const px = (value: number) => `${value}px`;

/** A resolved board destination, or the interaction an area runs. */
export type DropAreaInput =
  | RuntimeDropTarget
  | { readonly interaction: string; readonly input?: string }
  | null;

export function resolveDropArea(
  drag: GestureDrag | undefined,
  binding: DropAreaInput,
): RuntimeDropTarget | null {
  if (!drag || !binding) return null;
  if ("interactionKey" in binding) return binding;
  const matches = drag
    .getDropTargets()
    .filter(
      (target) =>
        target.kind === "interaction" &&
        target.interactionKey === binding.interaction &&
        (!binding.input || target.cardInputKey === binding.input),
    );
  // Two card inputs on one interaction need an explicit `input`.
  return matches.length === 1 ? matches[0] : null;
}
/** Targets are rebuilt with every drag update; compare what they route. */
export const sameDropTarget = (
  left: RuntimeDropTarget | null,
  right: RuntimeDropTarget | null,
) => left === right || (!!left && !!right && isSameDropTarget(left, right));
let sessions = 0;

export type GestureSession = ReturnType<typeof createGestureSession>;

/**
 * One press at a time for a provider: tap, hold, drag or browse, plus mouse
 * hover intent. The session outlives the pressed element, so a hand may move
 * the card into an overlay mid-drag. Drop areas are found with the browser's
 * own hit testing, so transformed and SVG areas need no geometry.
 */
export function createGestureSession(game: GestureGame) {
  const id = `g${++sessions}`;
  const store = createStore<GestureState>({ drag: null, inspect: null });
  const areas = new Map<string, () => DropAreaInput>();
  const followers = new Set<(point: Point) => void>();
  let press: {
    readonly recognizer: GestureRecognizer;
    readonly pointerType: string;
    readonly detach: () => void;
    dragging: boolean;
    area: string | null;
    target: RuntimeDropTarget | null;
  } | null = null;
  let hover: { cardId: string; timer: ReturnType<typeof setTimeout> } | null =
    null;
  let pointer: Point = { x: 0, y: 0 };
  let swallowing = false;
  let guardingClicks = false;
  let disposed = false;

  const set = (patch: Partial<GestureState>) =>
    store.setState((previous) => ({ ...previous, ...patch }));

  const unsubscribe = game.subscribe(() => {
    // New frames, seats and sources cancel the semantic drag; end the press with it.
    if (press?.dragging && !game.drag?.active) press.recognizer.cancel();
    const drag = store.get().drag;
    if (drag?.settling && game.request === null) set({ drag: null });
  });

  function hitArea(at: Point): string | null {
    for (const element of document.elementsFromPoint(at.x, at.y)) {
      if (element.closest("[data-drag-overlay]")) continue;
      const area = element.closest("[data-drop-area]");
      if (area) return area.getAttribute("data-drop-area");
    }
    return null;
  }
  function retarget(at: Point) {
    if (!press?.dragging) return;
    const area = hitArea(at);
    const read = area === null ? undefined : areas.get(area);
    const target = read ? resolveDropArea(game.drag, read()) : null;
    if (area === press.area && sameDropTarget(target, press.target)) return;
    press.area = area;
    press.target = target;
    game.drag?.setDropTarget(target);
  }
  // Keyboard clicks (detail 0) and clicks from a new press are never swallowed.
  function swallow(event: globalThis.MouseEvent) {
    if (!swallowing || event.detail === 0) return;
    swallowing = false;
    event.stopPropagation();
    event.preventDefault();
  }
  function newPress() {
    swallowing = false;
  }
  /** A non-tap stays suppressed until its click or a new press, even after cancellation. */
  function swallowNextClick() {
    swallowing = true;
    if (guardingClicks) return;
    guardingClicks = true;
    addEventListener("click", swallow, true);
    addEventListener("pointerdown", newPress, true);
  }
  function clearHover() {
    if (hover) clearTimeout(hover.timer);
    hover = null;
  }
  function release() {
    press?.detach();
    press = null;
  }

  function start(
    event: globalThis.PointerEvent,
    cardId: string,
    element: Element,
    options: false | RuntimeTargetOptions,
  ) {
    if (disposed || press || event.button !== 0) return;
    const recognizer = createGestureRecognizer(event, {
      hold() {
        set({ inspect: { cardId, via: "hold" } });
      },
      dragStart(origin) {
        if (options === false || !game.drag?.begin(cardId, options))
          return false;
        const box = element.getBoundingClientRect();
        clearHover();
        press!.dragging = true;
        set({
          drag: {
            cardId,
            grab: { x: origin.x - box.left, y: origin.y - box.top },
            size: { width: box.width, height: box.height },
            settling: false,
          },
          inspect: null,
        });
        return true;
      },
      dragMove(at) {
        pointer = at;
        for (const follow of followers) follow(at);
        retarget(at);
      },
      end(kind, at) {
        const dragging = press!.dragging;
        if (dragging) retarget(at);
        release();
        if (kind !== "tap") swallowNextClick();
        if (kind === "hold") set({ inspect: null });
        if (!dragging) return;
        const before = game.request;
        game.drag?.drop();
        // A submitted move keeps its overlay until the authoritative frame.
        const drag = store.get().drag;
        if (drag && game.request !== null && game.request !== before)
          set({ drag: { ...drag, settling: true } });
        else set({ drag: null });
      },
      cancel(kind) {
        const dragging = press!.dragging;
        release();
        // Cancellation does not turn a non-tap into a selection on release.
        if (kind !== "tap") swallowNextClick();
        if (kind === "hold") set({ inspect: null });
        if (dragging) {
          game.drag?.cancel();
          set({ drag: null });
        }
      },
    });
    const move = (next: globalThis.PointerEvent) => recognizer.move(next);
    const up = (next: globalThis.PointerEvent) => recognizer.up(next);
    const cancel = (next: globalThis.PointerEvent) => recognizer.cancel(next);
    const blur = () => recognizer.cancel();
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", cancel);
    addEventListener("blur", blur);
    if (event.pointerType === "mouse") {
      // A mouse keeps reporting outside the card; touch is captured implicitly.
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone.
      }
    }
    press = {
      recognizer,
      pointerType: event.pointerType,
      dragging: false,
      area: null,
      target: null,
      detach() {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", up);
        removeEventListener("pointercancel", cancel);
        removeEventListener("blur", blur);
      },
    };
  }

  function cardProps(
    cardId: string,
    options: false | RuntimeTargetOptions,
    flags: { dragging: boolean; inspecting: "hold" | "hover" | null },
  ): CardGestureProps {
    return {
      onPointerDown: (event) =>
        start(event.nativeEvent, cardId, event.currentTarget, options),
      onPointerEnter(event) {
        if (event.pointerType !== "mouse" || press?.dragging) return;
        clearHover();
        hover = {
          cardId,
          timer: setTimeout(
            () => set({ inspect: { cardId, via: "hover" } }),
            GESTURE_THRESHOLDS.hoverMs,
          ),
        };
      },
      onPointerLeave() {
        if (hover?.cardId === cardId) clearHover();
        const inspect = store.get().inspect;
        if (inspect?.cardId === cardId && inspect.via === "hover")
          set({ inspect: null });
      },
      onContextMenu(event) {
        // A long press must inspect the card, not open the browser's menu.
        if ((press && press.pointerType !== "mouse") || swallowing)
          event.preventDefault();
      },
      onDragStart: (event) => event.preventDefault(),
      style: CARD_STYLE,
      "data-dragging": flags.dragging || undefined,
      "data-inspecting": flags.inspecting ?? undefined,
    };
  }

  /** Positions the dragged card's overlay without rendering on each move. */
  function overlayRef(element: HTMLElement | null) {
    const drag = store.get().drag;
    if (!element || !drag) return;
    element.setAttribute("data-drag-overlay", "");
    Object.assign(element.style, {
      position: "fixed",
      margin: "0",
      pointerEvents: "none",
      width: px(drag.size.width),
      height: px(drag.size.height),
    });
    const follow = (at: Point) => {
      element.style.left = px(at.x - drag.grab.x);
      element.style.top = px(at.y - drag.grab.y);
    };
    follow(pointer);
    followers.add(follow);
    return () => {
      followers.delete(follow);
    };
  }

  return {
    id,
    store,
    cardProps,
    overlayRef,
    /** `read` returns the area's current binding; targets resolve when hit. */
    registerArea(area: string, read: () => DropAreaInput) {
      areas.set(area, read);
      return () => {
        areas.delete(area);
      };
    },
    dispose() {
      disposed = true;
      press?.recognizer.cancel();
      clearHover();
      unsubscribe();
      followers.clear();
      if (!guardingClicks) return;
      removeEventListener("click", swallow, true);
      removeEventListener("pointerdown", newPress, true);
    },
  };
}

export const GestureContext = createContext<GestureSession | null>(null);

export function useGestureSession(): GestureSession {
  const session = useContext(GestureContext);
  if (!session) throw new Error("Gesture hooks require their GameProvider.");
  return session;
}

export function useGestureState<Value>(
  session: GestureSession,
  select: (state: GestureState) => Value,
): Value {
  return useSelector(session.store, select);
}
