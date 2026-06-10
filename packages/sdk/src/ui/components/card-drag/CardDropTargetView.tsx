/**
 * `CardDropTargetView` is a generic controlled drop-target wrapper. It
 * registers the underlying DOM element (and its eligible/disabled state) so
 * the lifted pointer can be matched without exposing geometry to the
 * caller. Its registration is stable: only the `targetId` triggers register/
 * unregister; eligibility and label changes flow through `updateTarget`.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  dropTargetVisualStateDataAttributes,
  type CardDropTargetVisualState,
} from "../../types/visual-state.js";
import { useCardDragSurface } from "./use-drop-target-registry.js";

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
