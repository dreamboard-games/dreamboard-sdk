/**
 * Controlled drag-to-target surface for the SDK hand and drop-target views.
 *
 * `CardDragSurface` is the single owner of:
 *
 * - the drag-lifecycle phase (`idle`/`inspecting`/`dragging`/`settling`/
 *   `returning`)
 * - the registry of drop targets, including their eligibility
 * - all committed `CardIntent` emission (`activate`, `previewStart`,
 *   `previewEnd`, and `drop`)
 * - the lifted-card overlay, settle/snap-back animation and live
 *   announcement
 *
 * `CardDropTargetView` is a generic controlled drop-target wrapper. It
 * registers the underlying DOM element (and its eligible/disabled state) so
 * the lifted pointer can be matched without exposing geometry to the
 * caller. Its registration is stable: only the `targetId` triggers register/
 * unregister; eligibility and label changes flow through `updateTarget`.
 *
 * `HandView` (and the hook it uses) drives this surface through the
 * controller exposed by `useCardDragSurface()`. Pointer events come from
 * `HandPointerEngine`'s lift callbacks. Keyboard pickup, target traversal
 * and Escape are handled here so that the drag-lifecycle has exactly one
 * authoritative owner.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useTheme } from "../theme/ThemeProvider.js";
import {
  dropTargetVisualStateDataAttributes,
  type CardDropTargetVisualState,
  type CardIntent,
} from "../types/visual-state.js";

interface RegisteredDropTarget {
  targetId: string;
  disabled: boolean;
  eligible: boolean;
  element: HTMLElement;
  /** Plain-text label used for the live a11y announcement. */
  label: string | null;
  /** Order hint for keyboard target traversal (lower numbers focus first). */
  order: number;
}

export type DragPhase =
  | "idle"
  | "inspecting"
  | "dragging"
  | "settling"
  | "returning";

interface ActiveDragState {
  cardId: string;
  cardLabel: string | null;
  source: "pointer" | "keyboard";
  pointerId: number | null;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  /**
   * Source rectangle captured at lift time, used as the snap-back/origin
   * geometry for animated returns.
   */
  sourceRect: { left: number; top: number; width: number; height: number };
  content: ReactNode;
  overTargetId: string | null;
  keyboardFocusedTargetId: string | null;
  /** DOM node we should focus when the lifecycle ends. */
  sourceFocus: HTMLElement | null;
}

interface SettlingState {
  cardId: string;
  source: "pointer" | "keyboard";
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  sourceRect: { left: number; top: number; width: number; height: number };
  targetRect: { left: number; top: number; width: number; height: number };
  content: ReactNode;
}

interface ReturningState {
  cardId: string;
  source: "pointer" | "keyboard";
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  sourceRect: { left: number; top: number; width: number; height: number };
  content: ReactNode;
}

export interface CardDragSurfaceController {
  /** Identity of the card currently in the drag-lifecycle, if any. */
  activeCardId: string | null;
  /** Source of the active drag, if any. */
  activeSource: "pointer" | "keyboard" | null;
  /** Drag-lifecycle phase. */
  phase: DragPhase;
  /** Currently highlighted drop target id, if any. */
  overTargetId: string | null;
  /** Currently keyboard-focused target id, if any. */
  keyboardFocusedTargetId: string | null;
  /**
   * Begin a pointer drag session. Returns `true` if the session started.
   */
  startPointerDrag: (input: PointerDragInput) => boolean;
  /** Update the pointer coordinates of an active pointer drag. */
  updatePointer: (point: { x: number; y: number }) => void;
  /**
   * Commit the active pointer drag at the supplied release position. Emits
   * a `drop` intent if the pointer is over an eligible target, or schedules
   * a snap back otherwise.
   */
  releasePointer: (point: { x: number; y: number }) => void;
  /** Cancel the active drag (pointer or keyboard) without committing. */
  cancelDrag: () => void;
  /**
   * Begin a keyboard drag session. The first eligible registered target is
   * focused automatically.
   */
  startKeyboardDrag: (input: KeyboardDragInput) => boolean;
  /** Move keyboard focus across registered eligible targets. */
  moveKeyboardFocus: (direction: "next" | "prev") => void;
  /** Commit the active keyboard drag on the focused target. */
  commitKeyboardDrop: () => void;
  /**
   * Record a tap that did not produce a lift. The surface holds the
   * `inspecting` phase until another lift, drop, or external dismissal.
   */
  recordTap: (input: TapInput) => void;
  /**
   * Record a `previewStart` intent. Surface owns canonical intent emission
   * so consumers subscribe in one place.
   */
  recordPreviewStart: (cardId: string) => void;
  /** Record a `previewEnd` intent. */
  recordPreviewEnd: (cardId: string) => void;
  /**
   * Record a desktop/keyboard `activate` intent under the `direct-activate`
   * policy. Drag-to-target policy never calls this; it is centralized here
   * so that the surface remains the only ingress for `CardIntent`.
   */
  recordActivate: (cardId: string, source: "tap" | "keyboard") => void;
  /** Clear the `inspecting` phase. */
  clearInspect: () => void;
  /** Total number of currently registered eligible targets. */
  eligibleTargetCount: number;
}

interface TapInput {
  cardId: string;
  cardEligible: boolean;
  cardDisabled: boolean;
  sourceFocus?: HTMLElement | null;
}

interface PointerDragInput {
  cardId: string;
  cardLabel?: string | null;
  pointerId: number;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  sourceRect: { left: number; top: number; width: number; height: number };
  content: ReactNode;
  sourceFocus?: HTMLElement | null;
}

interface KeyboardDragInput {
  cardId: string;
  cardLabel?: string | null;
  cardEligible: boolean;
  sourceRect: { left: number; top: number; width: number; height: number };
  content: ReactNode;
  sourceFocus?: HTMLElement | null;
}

export interface CardDragSurfaceContextValue {
  registerTarget: (target: RegisteredDropTarget) => () => void;
  updateTarget: (
    targetId: string,
    patch: Partial<Omit<RegisteredDropTarget, "targetId" | "element">>,
  ) => void;
  controller: CardDragSurfaceController;
  /** Expose the most recent active card id for visual-state computation. */
  activeCardId: string | null;
  /** Expose the highlighted target id for visual-state computation. */
  overTargetId: string | null;
  /** Expose whether any drag is in progress. */
  dragActive: boolean;
  keyboardFocusedTargetId: string | null;
}

const CardDragSurfaceContext =
  createContext<CardDragSurfaceContextValue | null>(null);

export function useCardDragSurface(): CardDragSurfaceContextValue | null {
  return useContext(CardDragSurfaceContext);
}

export interface CardDragSurfaceProps {
  onCardIntent?: (intent: CardIntent) => void;
  /**
   * Approximate inset (px) used for the deterministic hit test. Defaults to
   * `8`. Lowering this lets edges register more aggressively; raising it
   * makes overlapping targets less ambiguous.
   */
  hitTestInsetPx?: number;
  /** Suppress the live a11y announcement (for environments providing their own). */
  suppressLiveAnnouncement?: boolean;
  /** Animation transition tunable for settle/return. */
  motionTransition?: Transition;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const SETTLE_TRANSITION: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};
const RETURN_TRANSITION: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.8,
};
const REDUCED_TRANSITION: Transition = { duration: 0 };

export function CardDragSurface({
  onCardIntent,
  hitTestInsetPx = 8,
  suppressLiveAnnouncement = false,
  motionTransition,
  className,
  style,
  children,
}: CardDragSurfaceProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const liveRegionId = useId();
  const targetsRef = useRef(new Map<string, RegisteredDropTarget>());
  const orderCounterRef = useRef(0);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const inspectingRef = useRef<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
  const [inspectingCardId, setInspectingCardId] = useState<string | null>(null);
  const [settlingState, setSettlingState] = useState<SettlingState | null>(
    null,
  );
  const [returningState, setReturningState] = useState<ReturningState | null>(
    null,
  );
  const onIntentRef = useRef(onCardIntent);
  onIntentRef.current = onCardIntent;

  const settleTransition = motionTransition ?? SETTLE_TRANSITION;
  const returnTransition = motionTransition ?? RETURN_TRANSITION;

  const setActive = useCallback((next: ActiveDragState | null) => {
    activeDragRef.current = next;
    setActiveDrag(next);
  }, []);

  const setInspecting = useCallback((next: string | null) => {
    inspectingRef.current = next;
    setInspectingCardId(next);
  }, []);

  const finalizeInteraction = useCallback((sourceFocus: HTMLElement | null) => {
    if (sourceFocus) {
      // Defer focus restoration so animation can complete first frame.
      queueMicrotask(() => {
        try {
          sourceFocus.focus({ preventScroll: true });
        } catch {
          // Source may have been unmounted; ignore.
        }
      });
    }
  }, []);

  const registerTarget = useCallback(
    (target: RegisteredDropTarget) => {
      targetsRef.current.set(target.targetId, {
        ...target,
        order: target.order || ++orderCounterRef.current,
      });
      return () => {
        targetsRef.current.delete(target.targetId);
        const active = activeDragRef.current;
        if (active && active.keyboardFocusedTargetId === target.targetId) {
          setActive({ ...active, keyboardFocusedTargetId: null });
        }
      };
    },
    [setActive],
  );

  const updateTarget = useCallback(
    (
      targetId: string,
      patch: Partial<Omit<RegisteredDropTarget, "targetId" | "element">>,
    ) => {
      const existing = targetsRef.current.get(targetId);
      if (!existing) return;
      targetsRef.current.set(targetId, { ...existing, ...patch });
    },
    [],
  );

  const isTargetUsable = useCallback((target: RegisteredDropTarget) => {
    return !target.disabled && target.eligible !== false;
  }, []);

  const resolveDropTarget = useCallback(
    (point: { x: number; y: number }): string | null => {
      for (const target of targetsRef.current.values()) {
        if (!isTargetUsable(target)) continue;
        const rect = target.element.getBoundingClientRect();
        if (
          point.x >= rect.left + hitTestInsetPx &&
          point.x <= rect.right - hitTestInsetPx &&
          point.y >= rect.top + hitTestInsetPx &&
          point.y <= rect.bottom - hitTestInsetPx
        ) {
          return target.targetId;
        }
      }
      return null;
    },
    [hitTestInsetPx, isTargetUsable],
  );

  const sortedUsableTargetIds = useCallback((): string[] => {
    const entries = Array.from(targetsRef.current.values()).filter((t) =>
      isTargetUsable(t),
    );
    entries.sort((a, b) => a.order - b.order);
    return entries.map((t) => t.targetId);
  }, [isTargetUsable]);

  const recordTap = useCallback(
    (input: TapInput) => {
      if (input.cardDisabled || !input.cardEligible) return;
      // Tap is non-committing in drag-to-target mode regardless of whether
      // any usable target is currently registered. A missing target is a
      // composition/availability problem, not a reason to silently fall
      // back to tap-to-play. Hold the card in `inspecting` so the user can
      // see what they tapped while the runtime decides what to do next.
      setInspecting(input.cardId);
    },
    [setInspecting],
  );

  const recordPreviewStart = useCallback((cardId: string) => {
    onIntentRef.current?.({ type: "previewStart", cardId });
  }, []);

  const recordPreviewEnd = useCallback((cardId: string) => {
    onIntentRef.current?.({ type: "previewEnd", cardId });
  }, []);

  const recordActivate = useCallback(
    (cardId: string, source: "tap" | "keyboard") => {
      onIntentRef.current?.({ type: "activate", cardId, source });
    },
    [],
  );

  const clearInspect = useCallback(() => {
    if (inspectingRef.current !== null) setInspecting(null);
  }, [setInspecting]);

  const startPointerDrag = useCallback(
    (input: PointerDragInput): boolean => {
      if (activeDragRef.current) return false;
      if (inspectingRef.current) setInspecting(null);
      const overTargetId = resolveDropTarget({
        x: input.pointerX,
        y: input.pointerY,
      });
      const next: ActiveDragState = {
        cardId: input.cardId,
        cardLabel: input.cardLabel ?? null,
        source: "pointer",
        pointerId: input.pointerId,
        pointerX: input.pointerX,
        pointerY: input.pointerY,
        grabOffsetX: input.grabOffsetX,
        grabOffsetY: input.grabOffsetY,
        sourceRect: input.sourceRect,
        content: input.content,
        overTargetId,
        keyboardFocusedTargetId: null,
        sourceFocus: input.sourceFocus ?? null,
      };
      setActive(next);
      return true;
    },
    [resolveDropTarget, setActive, setInspecting],
  );

  const updatePointer = useCallback(
    (point: { x: number; y: number }) => {
      const active = activeDragRef.current;
      if (!active || active.source !== "pointer") return;
      const overTargetId = resolveDropTarget(point);
      setActive({
        ...active,
        pointerX: point.x,
        pointerY: point.y,
        overTargetId,
      });
    },
    [resolveDropTarget, setActive],
  );

  const completeWithDrop = useCallback(
    (
      active: ActiveDragState,
      targetId: string,
      releaseX: number,
      releaseY: number,
    ) => {
      const target = targetsRef.current.get(targetId);
      const targetRect = target?.element.getBoundingClientRect();
      const settling: SettlingState = {
        cardId: active.cardId,
        source: active.source,
        pointerX: releaseX,
        pointerY: releaseY,
        grabOffsetX: active.grabOffsetX,
        grabOffsetY: active.grabOffsetY,
        sourceRect: active.sourceRect,
        targetRect: targetRect
          ? {
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
              height: targetRect.height,
            }
          : active.sourceRect,
        content: active.content,
      };
      onIntentRef.current?.({
        type: "drop",
        cardId: active.cardId,
        targetId,
        source: active.source === "keyboard" ? "keyboard" : "pointer",
      });
      setSettlingState(settling);
      setReturningState(null);
      setActive(null);
      finalizeInteraction(active.sourceFocus);
    },
    [finalizeInteraction, setActive],
  );

  const completeWithReturn = useCallback(
    (active: ActiveDragState, releaseX: number, releaseY: number) => {
      const returning: ReturningState = {
        cardId: active.cardId,
        source: active.source,
        pointerX: releaseX,
        pointerY: releaseY,
        grabOffsetX: active.grabOffsetX,
        grabOffsetY: active.grabOffsetY,
        sourceRect: active.sourceRect,
        content: active.content,
      };
      setReturningState(returning);
      setSettlingState(null);
      setActive(null);
      finalizeInteraction(active.sourceFocus);
    },
    [finalizeInteraction, setActive],
  );

  const releasePointer = useCallback(
    (point: { x: number; y: number }) => {
      const active = activeDragRef.current;
      if (!active || active.source !== "pointer") return;
      const overTargetId = resolveDropTarget(point);
      if (overTargetId) {
        completeWithDrop(active, overTargetId, point.x, point.y);
        return;
      }
      completeWithReturn(active, point.x, point.y);
    },
    [completeWithDrop, completeWithReturn, resolveDropTarget],
  );

  const cancelDrag = useCallback(() => {
    const active = activeDragRef.current;
    if (!active) return;
    completeWithReturn(active, active.pointerX, active.pointerY);
  }, [completeWithReturn]);

  const startKeyboardDrag = useCallback(
    (input: KeyboardDragInput): boolean => {
      if (activeDragRef.current) return false;
      if (!input.cardEligible) return false;
      if (inspectingRef.current) setInspecting(null);
      const ids = sortedUsableTargetIds();
      if (ids.length === 0) return false;
      const firstFocus = ids[0]!;
      const firstTarget = targetsRef.current.get(firstFocus);
      const firstRect = firstTarget?.element.getBoundingClientRect();
      const next: ActiveDragState = {
        cardId: input.cardId,
        cardLabel: input.cardLabel ?? null,
        source: "keyboard",
        pointerId: null,
        pointerX: firstRect ? firstRect.left + firstRect.width / 2 : 0,
        pointerY: firstRect ? firstRect.top + firstRect.height / 2 : 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        sourceRect: input.sourceRect,
        content: input.content,
        overTargetId: firstFocus,
        keyboardFocusedTargetId: firstFocus,
        sourceFocus: input.sourceFocus ?? null,
      };
      setActive(next);
      // Focus is moved by `CardDropTargetView` in an effect that watches
      // `keyboardFocusedTargetId`, ensuring focus transfer happens after
      // React commits the render that promotes this target.
      return true;
    },
    [setActive, setInspecting, sortedUsableTargetIds],
  );

  const moveKeyboardFocus = useCallback(
    (direction: "next" | "prev") => {
      const active = activeDragRef.current;
      if (!active || active.source !== "keyboard") return;
      const ids = sortedUsableTargetIds();
      if (ids.length === 0) return;
      const currentIdx = active.keyboardFocusedTargetId
        ? ids.indexOf(active.keyboardFocusedTargetId)
        : -1;
      const nextIdx =
        direction === "next"
          ? (currentIdx + 1) % ids.length
          : (currentIdx - 1 + ids.length) % ids.length;
      const nextId = ids[nextIdx]!;
      const target = targetsRef.current.get(nextId);
      const rect = target?.element.getBoundingClientRect();
      setActive({
        ...active,
        keyboardFocusedTargetId: nextId,
        overTargetId: nextId,
        pointerX: rect ? rect.left + rect.width / 2 : active.pointerX,
        pointerY: rect ? rect.top + rect.height / 2 : active.pointerY,
      });
      // Focus moved by the target's keyboardFocused effect.
    },
    [setActive, sortedUsableTargetIds],
  );

  const commitKeyboardDrop = useCallback(() => {
    const active = activeDragRef.current;
    if (!active || active.source !== "keyboard") return;
    const targetId = active.keyboardFocusedTargetId;
    if (!targetId) return;
    const target = targetsRef.current.get(targetId);
    if (!target || !isTargetUsable(target)) return;
    const rect = target.element.getBoundingClientRect();
    completeWithDrop(
      active,
      targetId,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  }, [completeWithDrop, isTargetUsable]);

  const phase: DragPhase = useMemo(() => {
    if (activeDrag) return "dragging";
    if (settlingState) return "settling";
    if (returningState) return "returning";
    if (inspectingCardId) return "inspecting";
    return "idle";
  }, [activeDrag, inspectingCardId, returningState, settlingState]);

  const eligibleTargetCount = useMemo(
    () => sortedUsableTargetIds().length,
    // Recompute whenever any target patch changes — `activeDrag` is a cheap
    // proxy: target updates also bump the surface re-render via parent state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDrag, sortedUsableTargetIds],
  );

  const controller: CardDragSurfaceController = useMemo(
    () => ({
      activeCardId:
        activeDrag?.cardId ??
        settlingState?.cardId ??
        returningState?.cardId ??
        (inspectingCardId ? inspectingCardId : null),
      activeSource: activeDrag?.source ?? null,
      phase,
      overTargetId: activeDrag?.overTargetId ?? null,
      keyboardFocusedTargetId: activeDrag?.keyboardFocusedTargetId ?? null,
      startPointerDrag,
      updatePointer,
      releasePointer,
      cancelDrag,
      startKeyboardDrag,
      moveKeyboardFocus,
      commitKeyboardDrop,
      recordTap,
      recordPreviewStart,
      recordPreviewEnd,
      recordActivate,
      clearInspect,
      eligibleTargetCount,
    }),
    [
      activeDrag,
      cancelDrag,
      clearInspect,
      commitKeyboardDrop,
      eligibleTargetCount,
      inspectingCardId,
      moveKeyboardFocus,
      phase,
      recordActivate,
      recordPreviewEnd,
      recordPreviewStart,
      recordTap,
      releasePointer,
      returningState,
      settlingState,
      startKeyboardDrag,
      startPointerDrag,
      updatePointer,
    ],
  );

  const contextValue: CardDragSurfaceContextValue = useMemo(
    () => ({
      registerTarget,
      updateTarget,
      controller,
      activeCardId: controller.activeCardId,
      overTargetId: activeDrag?.overTargetId ?? null,
      dragActive: activeDrag !== null,
      keyboardFocusedTargetId: activeDrag?.keyboardFocusedTargetId ?? null,
    }),
    [activeDrag, controller, registerTarget, updateTarget],
  );

  useEffect(() => {
    if (!activeDrag) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDrag();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDrag, cancelDrag]);

  const announcement = useMemo(() => {
    if (!activeDrag) return null;
    const overTarget = activeDrag.overTargetId
      ? targetsRef.current.get(activeDrag.overTargetId)
      : null;
    const overLabel = overTarget?.label ?? null;
    const cardLabel = activeDrag.cardLabel ?? "Card";
    if (overLabel) {
      return `${cardLabel} over ${overLabel}. Press Enter to drop or Escape to cancel.`;
    }
    return `${cardLabel} picked up. Move to a target or press Escape to cancel.`;
  }, [activeDrag]);

  const overlayContent = activeDrag ? (
    <DragOverlay session={activeDrag} reducedMotion={reducedMotion} />
  ) : null;

  const settleOverlay = settlingState ? (
    <SettleOverlay
      key={`settle-${settlingState.cardId}`}
      session={settlingState}
      transition={reducedMotion ? REDUCED_TRANSITION : settleTransition}
      onDone={() => setSettlingState(null)}
    />
  ) : null;

  const returnOverlay = returningState ? (
    <ReturnOverlay
      key={`return-${returningState.cardId}`}
      session={returningState}
      transition={reducedMotion ? REDUCED_TRANSITION : returnTransition}
      onDone={() => setReturningState(null)}
    />
  ) : null;

  const portalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <CardDragSurfaceContext.Provider value={contextValue}>
      <div
        data-dreamboard-card-drag-surface=""
        data-drag-active={activeDrag ? "true" : undefined}
        data-drag-source={activeDrag?.source}
        data-drag-phase={phase}
        className={clsx("relative", className)}
        style={style}
      >
        {children}
      </div>
      {portalRoot
        ? createPortal(
            <AnimatePresence initial={false}>
              {overlayContent}
              {settleOverlay}
              {returnOverlay}
            </AnimatePresence>,
            portalRoot,
          )
        : null}
      {!suppressLiveAnnouncement ? (
        <div
          id={liveRegionId}
          role="status"
          aria-live="polite"
          className="sr-only"
          data-dreamboard-card-drag-announcement=""
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {announcement ?? ""}
        </div>
      ) : null}
    </CardDragSurfaceContext.Provider>
  );
}

interface DragOverlayProps {
  session: ActiveDragState;
  reducedMotion: boolean;
}

function DragOverlay({ session, reducedMotion }: DragOverlayProps) {
  if (session.source === "keyboard") {
    return (
      <motion.div
        key="overlay-keyboard"
        data-dreamboard-card-drag-overlay=""
        data-source="keyboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reducedMotion ? REDUCED_TRANSITION : { duration: 0.12 }}
        style={{
          position: "fixed",
          left: session.sourceRect.left,
          top: session.sourceRect.top,
          width: session.sourceRect.width,
          height: session.sourceRect.height,
          pointerEvents: "none",
          zIndex: 1000,
          boxShadow: reducedMotion ? "none" : "0 12px 32px rgba(0,0,0,0.18)",
          borderRadius: 12,
        }}
      >
        {session.content}
      </motion.div>
    );
  }

  const liftedAnimate = reducedMotion
    ? {
        scale: 1,
        rotate: 0,
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
      }
    : {
        scale: [1, 1.42, 1.35],
        rotate: [0, -3, 3, -1.8, 1.8, 0],
        filter: [
          "drop-shadow(0 4px 8px rgba(0,0,0,0.18))",
          "drop-shadow(0 24px 36px rgba(0,0,0,0.36))",
        ],
      };
  const liftedTransition: Transition = reducedMotion
    ? REDUCED_TRANSITION
    : {
        scale: { type: "spring", stiffness: 420, damping: 22, mass: 0.7 },
        rotate: { duration: 0.55, ease: "easeInOut" },
        filter: { duration: 0.18, ease: "easeOut" },
      };
  return (
    <motion.div
      key="overlay-pointer"
      data-dreamboard-card-drag-overlay=""
      data-source="pointer"
      initial={{
        scale: 1,
        rotate: 0,
        opacity: 1,
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))",
      }}
      animate={liftedAnimate}
      exit={{ opacity: 0 }}
      transition={liftedTransition}
      style={{
        position: "fixed",
        left: session.pointerX - session.sourceRect.width / 2,
        top: session.pointerY - session.sourceRect.height / 2,
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
        touchAction: "none",
        transformOrigin: "center center",
        willChange: "transform, filter",
      }}
    >
      {session.content}
    </motion.div>
  );
}

interface SettleOverlayProps {
  session: SettlingState;
  transition: Transition;
  onDone: () => void;
}

function SettleOverlay({ session, transition, onDone }: SettleOverlayProps) {
  const startLeft = session.pointerX - session.sourceRect.width / 2;
  const startTop = session.pointerY - session.sourceRect.height / 2;
  const endLeft =
    session.targetRect.left +
    session.targetRect.width / 2 -
    session.sourceRect.width / 2;
  const endTop =
    session.targetRect.top +
    session.targetRect.height / 2 -
    session.sourceRect.height / 2;
  return (
    <motion.div
      data-dreamboard-card-drag-overlay=""
      data-source={session.source}
      data-drag-phase="settling"
      initial={{ left: startLeft, top: startTop, scale: 1.06, opacity: 1 }}
      animate={{ left: endLeft, top: endTop, scale: 0.92, opacity: 0 }}
      transition={transition}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {session.content}
    </motion.div>
  );
}

interface ReturnOverlayProps {
  session: ReturningState;
  transition: Transition;
  onDone: () => void;
}

function ReturnOverlay({ session, transition, onDone }: ReturnOverlayProps) {
  const startLeft = session.pointerX - session.sourceRect.width / 2;
  const startTop = session.pointerY - session.sourceRect.height / 2;
  return (
    <motion.div
      data-dreamboard-card-drag-overlay=""
      data-source={session.source}
      data-drag-phase="returning"
      initial={{ left: startLeft, top: startTop, scale: 1.06, opacity: 1 }}
      animate={{
        left: session.sourceRect.left,
        top: session.sourceRect.top,
        scale: 1,
        opacity: 1,
      }}
      exit={{ opacity: 0 }}
      transition={transition}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        width: session.sourceRect.width,
        height: session.sourceRect.height,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {session.content}
    </motion.div>
  );
}

export interface CardDropTargetViewProps {
  targetId: string;
  state?: CardDropTargetVisualState;
  /** Plain-text label used in live announcements ("Selected cards", etc.). */
  label?: string;
  renderTarget: (state: CardDropTargetVisualState) => ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Tab order hint (lower numbers focus first). */
  order?: number;
  /** ARIA role override; defaults to `button`. */
  role?: string;
}

export function CardDropTargetView({
  targetId,
  state,
  label,
  renderTarget,
  className,
  style,
  order,
  role = "button",
}: CardDropTargetViewProps) {
  const surface = useCardDragSurface();
  const ref = useRef<HTMLDivElement | null>(null);
  const disabled = state?.disabled ?? false;
  const baseEligible = state?.eligible ?? true;
  const baseLabel = label ?? null;
  const orderProp = order ?? 0;

  const registerTargetRef = useRef(surface?.registerTarget);
  registerTargetRef.current = surface?.registerTarget;
  const updateTargetRef = useRef(surface?.updateTarget);
  updateTargetRef.current = surface?.updateTarget;

  // Stable register/unregister keyed only on `targetId`. Eligibility, label
  // and disabled flow through `updateTarget` so changing surface context
  // values cannot tear down the registration mid-drag.
  useEffect(() => {
    const element = ref.current;
    const register = registerTargetRef.current;
    if (!register || !element) return;
    const unregister = register({
      targetId,
      disabled,
      eligible: baseEligible,
      element,
      label: baseLabel,
      order: orderProp,
    });
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    updateTargetRef.current?.(targetId, {
      disabled,
      eligible: baseEligible,
      label: baseLabel,
      order: orderProp,
    });
  }, [targetId, disabled, baseEligible, baseLabel, orderProp]);

  const dragActive = surface?.dragActive ?? false;
  const overTargetId = surface?.overTargetId ?? null;
  const keyboardFocused = surface?.keyboardFocusedTargetId === targetId;

  // Move focus into this target whenever the surface promotes it to the
  // keyboard-focused id. Doing it here, after React commits, is more
  // reliable than firing focus() from inside the surface's `setActive`
  // callback (where React batching can race the source card's commit).
  useEffect(() => {
    if (!keyboardFocused) return;
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      // Element may have unmounted; ignore.
    }
  }, [keyboardFocused, targetId]);

  const computedState: CardDropTargetVisualState = {
    ...state,
    eligible: baseEligible,
    active: dragActive ? true : state?.active,
    over:
      overTargetId === targetId && baseEligible ? true : (state?.over ?? false),
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!surface) return;
      const controller = surface.controller;
      if (controller.activeSource !== "keyboard") return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        controller.commitKeyboardDrop();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        controller.moveKeyboardFocus("next");
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        controller.moveKeyboardFocus("prev");
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        controller.cancelDrag();
      }
    },
    [surface],
  );

  return (
    <div
      ref={ref}
      data-dreamboard-card-drop-target=""
      data-target-id={targetId}
      data-keyboard-focused={keyboardFocused ? "true" : undefined}
      role={role}
      tabIndex={disabled || !baseEligible ? -1 : 0}
      aria-disabled={disabled || !baseEligible || undefined}
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={className}
      style={style}
      {...dropTargetVisualStateDataAttributes(computedState)}
    >
      {renderTarget(computedState)}
    </div>
  );
}
