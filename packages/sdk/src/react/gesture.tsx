import type { RuntimeShortcutTarget } from "../headless/features/shortcuts.js";
import type { CoreInstance, InstanceOptions } from "../headless/model.js";
import { inputValueKey } from "../shared/input-domain.js";
import { createStore } from "@tanstack/store";
import { useSelector } from "@tanstack/react-store";
import {
  createContext,
  useContext,
  type CSSProperties,
  type DragEvent,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  createGestureRecognizer,
  magneticDropPoint,
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
export interface GestureGame extends Pick<
  CoreInstance<unknown>,
  "snapshot" | "subscribe"
> {
  readonly drag?: GestureDrag;
  readonly request: unknown;
  getOptions(): Pick<InstanceOptions<unknown>, "source">;
}

export interface GestureState {
  readonly activeTarget: RuntimeShortcutTarget | null;
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
  onFocus(event: FocusEvent<Element>): void;
  onBlur(): void;
  onContextMenu(event: MouseEvent<Element>): void;
  onDragStart(event: DragEvent<Element>): void;
  readonly style: CSSProperties;
  readonly "data-dragging"?: true;
  readonly "data-inspecting"?: "hold" | "hover";
  readonly "data-card-gesture": string;
  readonly "data-gesture-session": string;
}

const CARD_STYLE: CSSProperties = Object.freeze({
  // Sideways movement stays native scrolling; everything else reaches the recognizer.
  touchAction: "pan-x",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
});
const INSPECTION_STYLE: CSSProperties = Object.freeze({
  ...CARD_STYLE,
  // Inspection-only cards should not block their table's native scrolling.
  touchAction: "manipulation",
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
  const store = createStore<GestureState>({
    activeTarget: null,
    drag: null,
    inspect: null,
  });
  const targets = new Map<string, () => RuntimeShortcutTarget>();
  const sameTarget = (
    left: RuntimeShortcutTarget | null,
    right: RuntimeShortcutTarget | null,
  ) => inputValueKey(left) === inputValueKey(right);
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
  let hover: RuntimeShortcutTarget | null = null;
  let hoverPoint: Point | null = null;
  let focused: RuntimeShortcutTarget | null = null;
  let alt = false;
  let pointer: Point = { x: 0, y: 0 };
  let swallowing = false;
  let guardingClicks = false;
  let disposed = false;

  const set = (patch: Partial<GestureState>) =>
    store.setState((previous) => ({ ...previous, ...patch }));

  let snapshot = game.snapshot;
  let source = game.getOptions().source;
  function admitted(target: RuntimeShortcutTarget | null) {
    if (!target || !game.snapshot) return null;
    const zones = game.snapshot.frame.zones;
    if (target.kind === "zone")
      return zones[target.zoneId]?.[target.hostId] ? target : null;
    if (target.kind === "card")
      return Object.values(zones).some((hosts) =>
        Object.values(hosts).some((zone) =>
          zone.cardIds.includes(target.value),
        ),
      )
        ? target
        : null;
    // Board controls own their mounted identity; each shortcut still checks
    // the current projected input domain before submitting.
    return [...targets.values()].some((read) => sameTarget(read(), target))
      ? target
      : null;
  }
  const unsubscribe = game.subscribe(() => {
    const nextSource = game.getOptions().source;
    const changedLifetime =
      source !== nextSource || snapshot?.me !== game.snapshot?.me;
    if (changedLifetime || snapshot !== game.snapshot) {
      source = nextSource;
      snapshot = game.snapshot;
      press?.recognizer.cancel();
      alt = false;
      // A parked pointer or keyboard focus survives an admitted same-seat
      // frame, so separate key presses can keep acting on the same control.
      hover = changedLifetime ? null : admitted(hover);
      focused = changedLifetime ? null : admitted(focused);
      if (changedLifetime) hoverPoint = null;
      set({ activeTarget: hover ?? focused, inspect: null });
    }
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
  function retarget(at: Point): Point {
    if (!press?.dragging) return at;
    let area = hitArea(at);
    const read = area === null ? undefined : areas.get(area);
    let target = read ? resolveDropArea(game.drag, read()) : null;
    let point = at;
    // Direct hits win; outside a target retain its edge before looking for a new one.
    if (!target) {
      const candidates = [...areas].sort(([left], [right]) =>
        left === press?.area ? -1 : right === press?.area ? 1 : 0,
      );
      let distance = Infinity;
      for (const [id, binding] of candidates) {
        const resolved = resolveDropArea(game.drag, binding());
        if (
          !resolved ||
          !game.drag
            ?.getDropTargets()
            .some((item) => sameDropTarget(item, resolved))
        )
          continue;
        const element = document.querySelector(
          `[data-drop-area="${CSS.escape(id)}"]`,
        );
        if (!(element instanceof HTMLElement)) continue;
        const snapped = magneticDropPoint(
          at,
          element.getBoundingClientRect(),
          id === press.area,
          press.pointerType === "touch",
        );
        if (!snapped) continue;
        const nextDistance = Math.hypot(at.x - snapped.x, at.y - snapped.y);
        if (nextDistance >= distance) continue;
        area = id;
        target = resolved;
        point = snapped;
        distance = nextDistance;
        if (id === press.area) break;
      }
    }
    if (area !== press.area || !sameDropTarget(target, press.target)) {
      press.area = area;
      press.target = target;
      game.drag?.setDropTarget(target);
    }
    return point;
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
    hover = null;
  }
  function inspectWithAlt() {
    const target = hover ?? focused;
    const cardId = target?.kind === "card" ? target.value : null;
    set({
      activeTarget: target,
      inspect: alt && cardId && !press ? { cardId, via: "hover" } : null,
    });
  }
  function hoverAt(at: Point) {
    hoverPoint = at;
    const wasFocused = focused !== null;
    focused = null;
    const hit = document
      .elementFromPoint(at.x, at.y)
      ?.closest("[data-card-gesture], [data-shortcut-target]");
    const control =
      hit?.getAttribute("data-gesture-session") === id ? hit : null;
    const targetId = control?.getAttribute("data-shortcut-target");
    const cardId = control?.getAttribute("data-card-gesture");
    const next: RuntimeShortcutTarget | null = targetId
      ? (targets.get(targetId)?.() ?? null)
      : cardId
        ? { kind: "card", value: cardId }
        : null;
    if (sameTarget(hover, next) && !wasFocused) return;
    hover = next;
    inspectWithAlt();
  }
  // CSS transforms generate enter/leave events under a parked mouse. Only
  // physical movement changes its target; down uses the actual pressed control.
  const browse = (event: globalThis.PointerEvent) => {
    if (event.pointerType !== "mouse" || press) return;
    if (hoverPoint?.x === event.clientX && hoverPoint.y === event.clientY)
      return;
    alt = event.altKey;
    hoverAt({ x: event.clientX, y: event.clientY });
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      press?.recognizer.cancel();
      alt = false;
      set({ inspect: null });
    } else if (event.key === "Alt") {
      alt = event.type === "keydown";
      inspectWithAlt();
    }
  };
  const loseFocus = () => {
    alt = false;
    clearHover();
    hoverPoint = null;
    focused = null;
    set({ activeTarget: null, inspect: null });
  };
  addEventListener("keydown", key);
  addEventListener("keyup", key);
  addEventListener("blur", loseFocus);
  const leaveWindow = (event: globalThis.PointerEvent) => {
    if (event.pointerType !== "mouse" || event.relatedTarget !== null) return;
    clearHover();
    hoverPoint = null;
    focused = null;
    alt = false;
    inspectWithAlt();
  };
  addEventListener("pointermove", browse);
  addEventListener("pointerout", leaveWindow);
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
        focused = null;
        press!.dragging = true;
        set({
          drag: {
            cardId,
            grab: { x: origin.x - box.left, y: origin.y - box.top },
            size: { width: box.width, height: box.height },
            settling: false,
          },
          inspect: null,
          activeTarget: null,
        });
        return true;
      },
      dragMove(at) {
        pointer = retarget(at);
        for (const follow of followers) follow(pointer);
      },
      end(kind, at) {
        const dragging = press!.dragging;
        const pointerType = press!.pointerType;
        if (dragging) retarget(at);
        release();
        if (kind !== "tap") swallowNextClick();
        if (kind === "hold") set({ inspect: null });
        if (!dragging) {
          // A rejected drag or inspection-only mouse press may browse to a
          // different face. Its final physical point becomes the canonical target.
          if (kind === "browse" && pointerType === "mouse") hoverAt(at);
          return;
        }
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
      onPointerDown(event) {
        if (event.pointerType === "mouse") {
          hover = { kind: "card", value: cardId };
          alt = event.altKey;
          inspectWithAlt();
        }
        start(event.nativeEvent, cardId, event.currentTarget, options);
      },
      onFocus(event) {
        focused = event.currentTarget.matches(":focus-visible")
          ? { kind: "card", value: cardId }
          : null;
        if (focused) hover = null;
        inspectWithAlt();
      },
      onBlur() {
        if (focused?.kind === "card" && focused.value === cardId)
          focused = null;
        inspectWithAlt();
      },
      onContextMenu(event) {
        // A long press must inspect the card, not open the browser's menu.
        if ((press && press.pointerType !== "mouse") || swallowing)
          event.preventDefault();
      },
      onDragStart: (event) => event.preventDefault(),
      style: options === false ? INSPECTION_STYLE : CARD_STYLE,
      "data-dragging": flags.dragging || undefined,
      "data-inspecting": flags.inspecting ?? undefined,
      "data-card-gesture": cardId,
      "data-gesture-session": id,
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
    getActiveCardId() {
      const target = store.get().activeTarget;
      return target?.kind === "card" ? target.value : null;
    },
    getActiveTarget: () => store.get().activeTarget,
    registerTarget(targetId: string, read: () => RuntimeShortcutTarget) {
      const target = read();
      targets.set(targetId, read);
      return () => {
        targets.delete(targetId);
        if (sameTarget(hover, target)) hover = null;
        if (sameTarget(focused, target)) focused = null;
        inspectWithAlt();
      };
    },
    targetProps(targetId: string) {
      return {
        "data-shortcut-target": targetId,
        "data-gesture-session": id,
        onPointerDown(event: PointerEvent<Element>) {
          if (event.pointerType !== "mouse") return;
          hover = targets.get(targetId)?.() ?? null;
          alt = event.altKey;
          inspectWithAlt();
        },
        onFocus(event: FocusEvent<Element>) {
          focused = event.currentTarget.matches(":focus-visible")
            ? (targets.get(targetId)?.() ?? null)
            : null;
          if (focused) hover = null;
          inspectWithAlt();
        },
        onBlur() {
          const target = targets.get(targetId)?.() ?? null;
          if (sameTarget(focused, target)) focused = null;
          inspectWithAlt();
        },
      };
    },
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
      removeEventListener("keydown", key);
      removeEventListener("keyup", key);
      removeEventListener("blur", loseFocus);
      removeEventListener("pointermove", browse);
      removeEventListener("pointerout", leaveWindow);
      unsubscribe();
      followers.clear();
      targets.clear();
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
