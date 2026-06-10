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
 * The drag lifecycle and intent emission live together in this module by
 * design (single-owner). Target bookkeeping is delegated to
 * `useDropTargetRegistry` and overlay rendering to `overlays.tsx`, but every
 * `CardIntent` is still emitted from here.
 *
 * `HandView` (and the hook it uses) drives this surface through the
 * controller exposed by `useCardDragSurface()`. Pointer events come from
 * `HandPointerEngine`'s lift callbacks. Keyboard pickup, target traversal
 * and Escape are handled here so that the drag-lifecycle has exactly one
 * authoritative owner.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { AnimatePresence, type Transition } from "framer-motion";
import { useTheme } from "../../theme/ThemeProvider.js";
import { type CardIntent } from "../../types/visual-state.js";
import type {
  ActiveDragState,
  CardDragSurfaceContextValue,
  CardDragSurfaceController,
  DragPhase,
  KeyboardDragInput,
  PointerDragInput,
  ReturningState,
  SettlingState,
  TapInput,
} from "./types.js";
import {
  CardDragSurfaceContext,
  useDropTargetRegistry,
} from "./use-drop-target-registry.js";
import {
  DragOverlay,
  REDUCED_TRANSITION,
  ReturnOverlay,
  SettleOverlay,
} from "./overlays.js";

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

  const {
    targetsRef,
    registerTarget,
    updateTarget,
    isTargetUsable,
    resolveDropTarget,
    sortedUsableTargetIds,
  } = useDropTargetRegistry({ hitTestInsetPx, activeDragRef, setActive });

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
    [finalizeInteraction, setActive, targetsRef],
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
    [setActive, setInspecting, sortedUsableTargetIds, targetsRef],
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
    [setActive, sortedUsableTargetIds, targetsRef],
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
  }, [completeWithDrop, isTargetUsable, targetsRef]);

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
  }, [activeDrag, targetsRef]);

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
