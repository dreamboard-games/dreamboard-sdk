/**
 * Shared types for the card drag surface modules.
 *
 * Drop-target descriptors, drag-state shapes and registry/controller types
 * used across `use-drop-target-registry.ts`, `overlays.tsx`,
 * `CardDropTargetView.tsx` and `CardDragSurface.tsx`. This module is the
 * root of the card-drag module graph and must not import from any sibling.
 */

import type { ReactNode } from "react";

export interface RegisteredDropTarget {
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

export interface ActiveDragState {
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

export interface SettlingState {
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

export interface ReturningState {
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

export interface TapInput {
  cardId: string;
  cardEligible: boolean;
  cardDisabled: boolean;
  sourceFocus?: HTMLElement | null;
}

export interface PointerDragInput {
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

export interface KeyboardDragInput {
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
