/**
 * React binding for the {@link HandPointerEngine}.
 *
 * The hook recognizes pointer/keyboard activity on a card and forwards it to
 * the surrounding `CardDragSurface` controller. All `CardIntent` emission
 * (`activate`, `previewStart`, `previewEnd`, `drop`) flows through the
 * surface so that the surface is the single source of truth for the
 * drag-lifecycle.
 *
 * Two interaction policies:
 *
 * - `direct-activate` — desktop tap/click and keyboard Enter/Space emit one
 *   `activate` (the hook calls `onIntent` directly because no drag-lifecycle
 *   exists in this mode).
 * - `drag-to-target` — pointer lift starts a surface drag session; release
 *   commits/returns through the surface; tap/keyboard Enter trigger the
 *   surface's `recordTap`/`startKeyboardDrag` so it owns the lifecycle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_POINTER_THRESHOLDS,
  HandPointerEngine,
  type CardPointerState,
  type HandInteractionPolicy,
  type PointerEngineCardSnapshot,
  type PointerEngineThresholds,
} from "../components/hand-pointer-engine.js";
import type { CardDragSurfaceController } from "../components/card-drag/index.js";
import type { CardIntent } from "../types/visual-state.js";
import type { ReactNode } from "react";

export interface UseHandCardPointerOptions {
  onIntent?: (intent: CardIntent) => void;
  thresholds?: PointerEngineThresholds;
  /**
   * Active interaction policy. Defaults to `direct-activate`.
   */
  policy?: HandInteractionPolicy;
  /**
   * Drag-surface controller for `drag-to-target` mode. The hook forwards
   * pointer/keyboard lifts to the controller; the controller emits intents.
   */
  surface?: CardDragSurfaceController | null;
  /**
   * Render the lifted card payload. Required when a `surface` is supplied;
   * the hook calls this to produce the overlay content for the active card.
   */
  renderLiftedCard?: (cardId: string) => ReactNode;
  /**
   * Resolve the human-readable label of the card being dragged for live
   * announcements.
   */
  resolveCardLabel?: (cardId: string) => string | null | undefined;
}

export interface HandCardPointerBindings {
  /** Identity of the card the engine is currently tracking, if any. */
  activeCardId: string | null;
  /** Pointer recognition state (used for previewing/scroll-lock visuals). */
  recognitionState: CardPointerState;
  /** Whether the host should suppress vertical scrolling. */
  scrollLocked: boolean;
  /** Returns the props bag for a single card. */
  bindCard: (card: PointerEngineCardSnapshot) => HandCardPointerProps;
  /** Programmatic activation, for keyboard and synthetic clicks. */
  activateKeyboard: (card: PointerEngineCardSnapshot) => void;
}

export interface HandCardPointerProps {
  ref: (element: HTMLElement | null) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  style: React.CSSProperties;
  "data-pointer-state": CardPointerState["kind"];
}

export function useHandCardPointer({
  onIntent,
  thresholds = DEFAULT_POINTER_THRESHOLDS,
  policy = "direct-activate",
  surface = null,
  renderLiftedCard,
  resolveCardLabel,
}: UseHandCardPointerOptions = {}): HandCardPointerBindings {
  const intentRef = useRef(onIntent);
  intentRef.current = onIntent;
  const policyRef = useRef(policy);
  policyRef.current = policy;
  const surfaceRef = useRef<CardDragSurfaceController | null>(surface);
  surfaceRef.current = surface;
  const renderLiftedCardRef = useRef(renderLiftedCard);
  renderLiftedCardRef.current = renderLiftedCard;
  const resolveCardLabelRef = useRef(resolveCardLabel);
  resolveCardLabelRef.current = resolveCardLabel;

  const cardElementsRef = useRef(new Map<string, HTMLElement>());
  const cardRefsRef = useRef(
    new Map<string, (element: HTMLElement | null) => void>(),
  );

  const getCardRef = useCallback((cardId: string) => {
    let stable = cardRefsRef.current.get(cardId);
    if (!stable) {
      stable = (element: HTMLElement | null) => {
        if (element) {
          cardElementsRef.current.set(cardId, element);
        } else {
          cardElementsRef.current.delete(cardId);
        }
      };
      cardRefsRef.current.set(cardId, stable);
    }
    return stable;
  }, []);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [recognitionState, setRecognitionState] = useState<CardPointerState>({
    kind: "idle",
  });
  const [scrollLocked, setScrollLocked] = useState(false);

  const captureSourceRect = useCallback((cardId: string) => {
    const el = cardElementsRef.current.get(cardId);
    if (!el) return { left: 0, top: 0, width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const engine = useMemo(
    () =>
      new HandPointerEngine(
        {
          onTap: (cardId) => {
            const cardEl = cardElementsRef.current.get(cardId);
            if (policyRef.current === "drag-to-target" && surfaceRef.current) {
              surfaceRef.current.recordTap({
                cardId,
                cardEligible: true,
                cardDisabled: false,
                sourceFocus: cardEl ?? null,
              });
              return;
            }
            if (surfaceRef.current) {
              surfaceRef.current.recordActivate(cardId, "tap");
              return;
            }
            intentRef.current?.({
              type: "activate",
              cardId,
              source: "tap",
            });
          },
          onPreviewStart: (cardId) => {
            // Surface is the canonical owner of all `CardIntent` emission
            // when present. Without a surface (legacy direct-activate-only
            // mounts), fall back to the local `onIntent` callback.
            if (surfaceRef.current) {
              surfaceRef.current.recordPreviewStart(cardId);
              return;
            }
            intentRef.current?.({ type: "previewStart", cardId });
          },
          onPreviewEnd: (cardId) => {
            if (surfaceRef.current) {
              surfaceRef.current.recordPreviewEnd(cardId);
              return;
            }
            intentRef.current?.({ type: "previewEnd", cardId });
          },
          onLiftStart: (event) => {
            if (policyRef.current !== "drag-to-target") return;
            const surfaceController = surfaceRef.current;
            if (!surfaceController) return;
            const content = renderLiftedCardRef.current?.(event.cardId) ?? null;
            const label = resolveCardLabelRef.current?.(event.cardId) ?? null;
            const sourceRect = captureSourceRect(event.cardId);
            const cardEl = cardElementsRef.current.get(event.cardId) ?? null;
            surfaceController.startPointerDrag({
              cardId: event.cardId,
              cardLabel: label,
              pointerId: event.pointerId,
              startX: event.startX,
              startY: event.startY,
              pointerX: event.pointerX,
              pointerY: event.pointerY,
              grabOffsetX: event.grabOffsetX,
              grabOffsetY: event.grabOffsetY,
              sourceRect,
              content,
              sourceFocus: cardEl,
            });
          },
          onLiftMove: (event) => {
            surfaceRef.current?.updatePointer({
              x: event.pointerX,
              y: event.pointerY,
            });
          },
          onLiftEnd: (event) => {
            surfaceRef.current?.releasePointer({
              x: event.pointerX,
              y: event.pointerY,
            });
          },
          onLiftCancel: () => {
            surfaceRef.current?.cancelDrag();
          },
          onLockScroll: setScrollLocked,
          onStateChange: (next) => {
            setRecognitionState(next);
            if (next.kind === "idle") {
              setActiveCardId(null);
            } else {
              setActiveCardId(next.cardId);
            }
          },
        },
        thresholds,
      ),
    [captureSourceRect, thresholds],
  );

  useEffect(() => () => engine.dispose(), [engine]);

  const bindCard = useCallback(
    (card: PointerEngineCardSnapshot): HandCardPointerProps => {
      const isActive = activeCardId === card.cardId;
      const pointerStateKind: CardPointerState["kind"] = isActive
        ? recognitionState.kind
        : "idle";
      return {
        ref: getCardRef(card.cardId),
        style: {
          touchAction: isActive && scrollLocked ? "none" : "pan-x",
          userSelect: "none",
          WebkitUserSelect: "none",
        },
        "data-pointer-state": pointerStateKind,
        onPointerDown: (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          if (card.disabled) return;
          try {
            (event.currentTarget as HTMLElement).setPointerCapture?.(
              event.pointerId,
            );
          } catch {
            // Test environments without an OS-backed pointer (jsdom-like
            // headless Chromium with synthesized PointerEvents) may throw
            // here. Capture is a UX nicety, not required for correctness.
          }
          engine.handlePointerDown(card, {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
        onPointerMove: (event) => {
          engine.handlePointerMove(card, {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
        onPointerUp: (event) => {
          try {
            (event.currentTarget as HTMLElement).releasePointerCapture?.(
              event.pointerId,
            );
          } catch {
            // Pair with the synthesized-pointer try in `onPointerDown`.
          }
          engine.handlePointerUp(card, {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        },
        onPointerCancel: () => {
          engine.handlePointerCancel(card);
        },
        onLostPointerCapture: () => {
          engine.handlePointerCancel(card);
        },
        onKeyDown: (event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            surfaceRef.current?.cancelDrag();
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (card.disabled || !card.eligible) return;
            if (policyRef.current === "drag-to-target") {
              const surfaceController = surfaceRef.current;
              if (!surfaceController) return;
              const cardEl = cardElementsRef.current.get(card.cardId) ?? null;
              const content =
                renderLiftedCardRef.current?.(card.cardId) ?? null;
              const label = resolveCardLabelRef.current?.(card.cardId) ?? null;
              const sourceRect = captureSourceRect(card.cardId);
              const started = surfaceController.startKeyboardDrag({
                cardId: card.cardId,
                cardLabel: label,
                cardEligible: card.eligible,
                sourceRect,
                content,
                sourceFocus: cardEl,
              });
              if (!started) {
                // No eligible target — record an inspection through the
                // surface so the visual treatment matches a tap. We never
                // silently revert to direct activate under drag-to-target.
                surfaceController.recordTap({
                  cardId: card.cardId,
                  cardEligible: card.eligible,
                  cardDisabled: card.disabled,
                  sourceFocus: cardEl,
                });
              }
              return;
            }
            if (surfaceRef.current) {
              surfaceRef.current.recordActivate(card.cardId, "keyboard");
              return;
            }
            intentRef.current?.({
              type: "activate",
              cardId: card.cardId,
              source: "keyboard",
            });
          }
        },
        onClick: () => {
          // Pointerup paths already emit; suppress the synthetic click.
        },
      };
    },
    [
      activeCardId,
      captureSourceRect,
      engine,
      getCardRef,
      recognitionState.kind,
      scrollLocked,
    ],
  );

  const activateKeyboard = useCallback((card: PointerEngineCardSnapshot) => {
    if (card.disabled || !card.eligible) return;
    if (policyRef.current === "drag-to-target") return;
    if (surfaceRef.current) {
      surfaceRef.current.recordActivate(card.cardId, "keyboard");
      return;
    }
    intentRef.current?.({
      type: "activate",
      cardId: card.cardId,
      source: "keyboard",
    });
  }, []);

  return {
    activeCardId,
    recognitionState,
    scrollLocked,
    bindCard,
    activateKeyboard,
  };
}
