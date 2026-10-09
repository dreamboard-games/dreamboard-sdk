import type { RuntimeShortcutTarget } from "../headless/features/shortcuts.js";
import type { CoreInstance, InstanceOptions, Card } from "../headless/model.js";
import type { ZoneVisibility } from "../shared/domain/contracts.js";
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
import type { PositionTarget } from "../shared/position-target.js";
import type { Point } from "../headless/features/pointer-session.js";
import type {
  RuntimeDropTarget,
  RuntimeTargetOptions,
} from "../headless/targets.js";

/** The runtime surface of `dragFeature` that a gesture needs. */
export interface GestureDrag {
  readonly active: {
    readonly target: RuntimeDropTarget | null;
    readonly cardIds?: readonly string[];
  } | null;
  getCanDrag(cardId: string, options?: RuntimeTargetOptions): boolean;
  getDropTargets(): readonly RuntimeDropTarget[];
  getIsDropTarget(target: RuntimeDropTarget): boolean;
  begin(cardId: string, options?: RuntimeTargetOptions): boolean;
  setDropTarget(target: RuntimeDropTarget | null): void;
  drop(): void;
  cancel(): void;
}
export interface GestureGame extends Pick<
  CoreInstance<unknown>,
  "snapshot" | "subscribe" | "cards" | "zones" | "me"
> {
  readonly drag?: GestureDrag;
  readonly request: unknown;
  getOptions(): Pick<InstanceOptions<unknown>, "source">;
}

export interface GestureState {
  readonly activeTarget: RuntimeShortcutTarget | null;
  readonly focusedTarget: RuntimeShortcutTarget | null;
  readonly pointerActive: boolean;
  readonly drag: {
    readonly cardId: string;
    readonly cardIds: readonly string[];
    /** Pointer offset inside the card where it was picked up. */
    readonly grab: Point;
    readonly size: { readonly width: number; readonly height: number };
    /** Dropped and submitted; waiting for the authoritative frame. */
    readonly settling: boolean;
    /** The area under the card and where it would land there, kept while settling. */
    readonly area: string | null;
    readonly target: RuntimeDropTarget | null;
    readonly landing: {
      readonly zoneId: string;
      readonly hostId: string;
      readonly index: number;
      readonly concealed: boolean;
      readonly cards: readonly Card<unknown, Record<never, never>>[];
      readonly snapshot: GestureGame["snapshot"];
    } | null;
  } | null;
  readonly inspect: {
    readonly cardId: string;
    readonly via: "hold" | "hover";
  } | null;
}

/** A renderer's destination identity and its existing disclosure policy. */
export interface RuntimeDropPresentation {
  readonly zone: { readonly zoneId: string; readonly hostId: string };
  readonly visibility: ZoneVisibility;
  readonly index?: number;
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
  readonly "data-card-control": string;
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
const ROW_STYLE: CSSProperties = Object.freeze({
  // A row that fits never scrolls; its cards' sideways movement scrubs instead.
  touchAction: "none",
});
const px = (value: number) => `${value}px`;

/** The card whose resting place in a row is under a viewport point, or null off the row. */
export type CardRowLookup = (point: Point) => string | null;

/** A resolved destination, the interaction an area runs, or an insertion point it offers. */
export type DropAreaValue =
  | RuntimeDropTarget
  | {
      readonly interaction: string;
      readonly input?: string;
      readonly params?: import("../headless/targets.js").RuntimeInteractionDropTarget["params"];
      readonly position?: PositionTarget;
    }
  | null;
/** A fixed binding, or one read at each dragged point, as for an insertion point under the pointer. */
export type DropAreaInput = DropAreaValue | ((point: Point) => DropAreaValue);

export function resolveDropArea(
  drag: GestureDrag | undefined,
  binding: DropAreaValue,
): RuntimeDropTarget | null {
  if (!drag || !binding) return null;
  if ("interactionKey" in binding)
    return drag.getIsDropTarget(binding) ? binding : null;
  const { position } = binding;
  const matches = drag
    .getDropTargets()
    .filter(
      (target) =>
        target.kind === (position ? "position" : "interaction") &&
        target.interactionKey === binding.interaction &&
        (!binding.input || target.cardInputKey === binding.input) &&
        (!position ||
          (target.kind === "position" &&
            inputValueKey(target.value) === inputValueKey(position))),
    );
  if (position)
    return matches.length === 1 && drag.getIsDropTarget(matches[0])
      ? matches[0]
      : null;
  // Two card inputs on one interaction need an explicit `input`.
  if (matches.length !== 1) return null;
  const target = {
    ...matches[0],
    ...(binding.params === undefined ? {} : { params: binding.params }),
  };
  return drag.getIsDropTarget(target) ? target : null;
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
 * own hit testing, so transformed and SVG areas need no geometry. A finger on
 * a card in a row slides along it: the row names the card whose resting place
 * is under the finger, which becomes active; lifting there clicks that card,
 * and pulling up drags it.
 */
export function createGestureSession(game: GestureGame) {
  const id = `g${++sessions}`;
  const store = createStore<GestureState>({
    activeTarget: null,
    focusedTarget: null,
    pointerActive: false,
    drag: null,
    inspect: null,
  });
  const targets = new Map<string, () => RuntimeShortcutTarget>();
  const sameTarget = (
    left: RuntimeShortcutTarget | null,
    right: RuntimeShortcutTarget | null,
  ) => inputValueKey(left) === inputValueKey(right);
  const areas = new Map<string, (point: Point) => DropAreaValue>();
  const presentations = new Map<
    string,
    () => RuntimeDropPresentation | undefined
  >();
  const rows = new Map<string, CardRowLookup>();
  // A slide can end on a control other than the pressed one; it drags with
  // that mounted control's own routes.
  const controls = new Map<string, () => false | RuntimeTargetOptions>();
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
  // Real DOM focus remains a local-action scope when mouse browsing changes presentation focus.
  let domFocused: RuntimeShortcutTarget | null = null;
  let alt = false;
  let pointer: Point = { x: 0, y: 0 };
  let swallowing = false;
  let guardingClicks = false;
  let disposed = false;

  const set = (patch: Partial<GestureState>) =>
    store.setState((previous) => {
      const next = { ...previous, ...patch };
      return {
        ...next,
        focusedTarget: domFocused,
        pointerActive: press !== null || next.drag !== null,
      };
    });

  let snapshot = game.snapshot;
  let source = game.getOptions().source;
  function admitted(target: RuntimeShortcutTarget | null) {
    if (!target || !game.snapshot) return null;
    const zones = game.snapshot.frame.zones;
    if (target.kind === "zone")
      return zones[target.zoneId]?.[target.hostId] ? target : null;
    if (target.kind === "card")
      return Object.entries(snapshot?.frame.zones ?? {}).some(
        ([zoneId, hosts]) =>
          Object.entries(hosts).some(
            ([hostId, zone]) =>
              zone.cardIds.includes(target.value) &&
              zones[zoneId]?.[hostId]?.cardIds.includes(target.value),
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
  function admittedFocus(target: RuntimeShortcutTarget | null) {
    if (!target || !sameTarget(target, targetOf(document.activeElement)))
      return null;
    if (target.kind !== "card") return admitted(target);
    // A mounted focused card can move between zones without another focus event.
    return Object.values(game.snapshot?.frame.zones ?? {}).some((hosts) =>
      Object.values(hosts).some((zone) => zone.cardIds.includes(target.value)),
    )
      ? target
      : null;
  }
  const unsubscribe = game.subscribe(() => {
    const nextSource = game.getOptions().source;
    const changedLifetime =
      source !== nextSource || snapshot?.me !== game.snapshot?.me;
    const changedSnapshot = snapshot !== game.snapshot;
    if (changedLifetime || snapshot !== game.snapshot) {
      // Cancelling first lets a scrubbing finger take its activity with it.
      press?.recognizer.cancel();
      const nextHover = changedLifetime ? null : admitted(hover);
      const nextFocused = changedLifetime ? null : admitted(focused);
      const nextDomFocused = changedLifetime ? null : admittedFocus(domFocused);
      source = nextSource;
      snapshot = game.snapshot;
      alt = false;
      // A parked pointer or keyboard focus survives an admitted same-seat
      // frame, so separate key presses can keep acting on the same control.
      hover = nextHover;
      focused = nextFocused;
      domFocused = nextDomFocused;
      if (changedLifetime) hoverPoint = null;
      set({ activeTarget: hover ?? focused, inspect: null });
    }
    // New frames, seats and sources cancel the semantic drag; end the press with it.
    if (press?.dragging && !game.drag?.active) press.recognizer.cancel();
    const drag = store.get().drag;
    if (
      drag?.settling &&
      (game.request === null || changedSnapshot || changedLifetime)
    )
      set({ drag: null });
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
    let target = read ? resolveDropArea(game.drag, read(at)) : null;
    let point = at;
    // Direct hits win; outside a target retain its edge before looking for a new one.
    if (!target) {
      const candidates = [...areas].sort(([left], [right]) =>
        left === press?.area ? -1 : right === press?.area ? 1 : 0,
      );
      let distance = Infinity;
      for (const [id, binding] of candidates) {
        const resolved = resolveDropArea(game.drag, binding(at));
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
      const drag = store.get().drag;
      if (drag) set({ drag: { ...drag, area, target } });
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
    const pending = store.get().drag;
    set({
      activeTarget: target,
      inspect:
        alt &&
        cardId &&
        !press &&
        !(pending?.settling && pending.cardIds.includes(cardId))
          ? { cardId, via: "hover" }
          : null,
    });
  }
  function targetOf(element: Element | null): RuntimeShortcutTarget | null {
    const hit = element?.closest("[data-card-gesture], [data-shortcut-target]");
    const control =
      hit?.getAttribute("data-gesture-session") === id ? hit : null;
    const targetId = control?.getAttribute("data-shortcut-target");
    const cardId = control?.getAttribute("data-card-gesture");
    return targetId
      ? (targets.get(targetId)?.() ?? null)
      : cardId
        ? { kind: "card", value: cardId }
        : null;
  }
  function hoverAt(at: Point) {
    hoverPoint = at;
    const wasFocused = focused !== null;
    focused = null;
    const next = targetOf(document.elementFromPoint(at.x, at.y));
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
    domFocused = null;
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
    set({});
  }

  function start(
    event: globalThis.PointerEvent,
    cardId: string,
    element: Element,
    options: false | RuntimeTargetOptions,
  ) {
    if (disposed || press || event.button !== 0) return;
    const pending = store.get().drag;
    if (pending?.settling && pending.cardIds.includes(cardId)) return;
    // The card a press acts on; a sliding finger moves it, or leaves the row.
    let card: {
      cardId: string;
      element: Element;
      options: false | RuntimeTargetOptions;
    } | null = { cardId, element, options };
    const row =
      event.pointerType === "mouse" ? null : element.closest("[data-card-row]");
    const cardAt = rows.get(row?.getAttribute("data-card-row") ?? "");
    const scrubbing = cardAt !== undefined;
    const activate = (next: string | null) => {
      if ((hover?.kind === "card" ? hover.value : null) === next) return;
      hover = next === null ? null : { kind: "card", value: next };
      inspectWithAlt();
    };
    // Resting places, not the raised face's, keep every card a strip's travel apart.
    function scrubTo(at: Point) {
      const next = cardAt!(at);
      const control =
        next === null
          ? null
          : row!.querySelector(`[data-card-gesture="${CSS.escape(next)}"]`);
      const routes = controls.get(
        control?.getAttribute("data-card-control") ?? "",
      );
      card =
        next === null || !control || !routes
          ? null
          : { cardId: next, element: control, options: routes() };
      activate(card?.cardId ?? null);
    }
    const recognizer = createGestureRecognizer(
      event,
      {
        // A hold comes before any movement, so the pressed card is still chosen.
        hold() {
          set({ inspect: { cardId, via: "hold" } });
        },
        dragStart(origin) {
          if (!card) return false;
          const { cardId, element, options } = card;
          if (options === false || !game.drag?.begin(cardId, options))
            return false;
          const box = element.getBoundingClientRect();
          clearHover();
          focused = null;
          press!.dragging = true;
          set({
            drag: {
              cardIds: game.drag?.active?.cardIds ?? [cardId],
              cardId,
              grab: { x: origin.x - box.left, y: origin.y - box.top },
              size: { width: box.width, height: box.height },
              settling: false,
              area: null,
              target: null,
              landing: null,
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
        browse: scrubTo,
        end(kind, at) {
          const dragging = press!.dragging;
          const pointerType = press!.pointerType;
          // A finger lifted from a scrub chooses the card under it, as a tap would.
          const chosen = scrubbing && kind === "browse" ? card?.element : null;
          if (dragging) retarget(at);
          release();
          // A finger leaves no hover behind.
          if (scrubbing) activate(null);
          // Clicked before the guard below, so the choice is never swallowed.
          if (chosen instanceof HTMLElement) chosen.click();
          if (kind !== "tap") swallowNextClick();
          if (kind === "hold") set({ inspect: null });
          if (!dragging) {
            // A rejected drag or inspection-only mouse press may browse to a
            // different face. Its final physical point becomes the canonical target.
            if (kind === "browse" && pointerType === "mouse") hoverAt(at);
            return;
          }
          const before = game.request;
          const drag = store.get().drag;
          const areaPresentation = drag?.area
            ? presentations.get(drag.area)?.()
            : undefined;
          const position =
            drag?.target?.kind === "position" ? drag.target.value : null;
          const zone = position ?? areaPresentation?.zone;
          // Hand insertion areas carry a canonical position; inherit the
          // enclosing zone's disclosure policy when they have no metadata.
          const presentation = zone
            ? [
                areaPresentation,
                ...Array.from(presentations.values(), (read) => read()),
              ].find(
                (candidate) =>
                  candidate?.zone.zoneId === zone.zoneId &&
                  candidate.zone.hostId === zone.hostId,
              )
            : undefined;
          const destination = zone && game.zones.find(zone.zoneId, zone.hostId);
          const cards =
            drag?.cardIds.flatMap((id) => {
              const card = game.cards.find(id);
              return card ? [card] : [];
            }) ?? [];
          const landing =
            destination && zone && cards.length
              ? Object.freeze({
                  zoneId: zone.zoneId,
                  hostId: zone.hostId,
                  index:
                    position?.index ??
                    presentation?.index ??
                    destination.getCards().length,
                  concealed: presentation
                    ? presentation.visibility === "hidden" ||
                      (presentation.visibility === "ownerOnly" &&
                        zone.hostId !== game.me?.id)
                    : cards.some(
                        (card) =>
                          card.zone !== zone.zoneId ||
                          card.hostId !== zone.hostId ||
                          card.hidden,
                      ),
                  cards: Object.freeze(cards),
                  snapshot: game.snapshot,
                })
              : null;
          game.drag?.drop();
          // A submitted move keeps its overlay until the authoritative frame.
          if (drag && game.request !== null && game.request !== before)
            set({ drag: { ...drag, settling: true, landing } });
          else set({ drag: null });
        },
        cancel(kind) {
          const dragging = press!.dragging;
          release();
          if (scrubbing) activate(null);
          // Cancellation does not turn a non-tap into a selection on release.
          if (kind !== "tap") swallowNextClick();
          if (kind === "hold") set({ inspect: null });
          if (dragging) {
            game.drag?.cancel();
            set({ drag: null });
          }
        },
      },
      { scrub: scrubbing },
    );
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
    set({});
  }

  function cardProps(
    cardId: string,
    control: string,
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
        domFocused = { kind: "card", value: cardId };
        if (focused) hover = null;
        inspectWithAlt();
      },
      onBlur() {
        if (focused?.kind === "card" && focused.value === cardId)
          focused = null;
        if (domFocused?.kind === "card" && domFocused.value === cardId)
          domFocused = null;
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
      "data-card-control": control,
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
    getShortcutActivity: () => ({
      // Removal can change DOM focus without emitting blur. Admit the current mounted control.
      focusedTarget: sameTarget(domFocused, targetOf(document.activeElement))
        ? domFocused
        : null,
      pointerActive: store.get().pointerActive,
    }),
    registerTarget(targetId: string, read: () => RuntimeShortcutTarget) {
      const target = read();
      targets.set(targetId, read);
      return () => {
        targets.delete(targetId);
        if (sameTarget(hover, target)) hover = null;
        if (sameTarget(focused, target)) focused = null;
        if (sameTarget(domFocused, target)) domFocused = null;
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
          domFocused = targets.get(targetId)?.() ?? null;
          if (focused) hover = null;
          inspectWithAlt();
        },
        onBlur() {
          const target = targets.get(targetId)?.() ?? null;
          if (sameTarget(focused, target)) focused = null;
          if (sameTarget(domFocused, target)) domFocused = null;
          inspectWithAlt();
        },
      };
    },
    overlayRef,
    /** `read` returns the area's current binding; targets resolve when hit. */
    registerArea(
      area: string,
      read: (point: Point) => DropAreaValue,
      presentation: () => RuntimeDropPresentation | undefined,
    ) {
      areas.set(area, read);
      presentations.set(area, presentation);
      return () => {
        areas.delete(area);
        presentations.delete(area);
      };
    },
    /** `read` returns a mounted card control's current drag routes. */
    registerControl(control: string, read: () => false | RuntimeTargetOptions) {
      controls.set(control, read);
      return () => {
        controls.delete(control);
      };
    },
    registerRow(row: string, cardAt: CardRowLookup) {
      rows.set(row, cardAt);
      return () => {
        rows.delete(row);
      };
    },
    rowProps(row: string) {
      return { "data-card-row": row, style: ROW_STYLE };
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
      areas.clear();
      presentations.clear();
      rows.clear();
      controls.clear();
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
