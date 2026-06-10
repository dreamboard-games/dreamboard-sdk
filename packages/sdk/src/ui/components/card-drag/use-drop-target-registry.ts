/**
 * Drop-target registration/lookup machinery for the card drag surface.
 *
 * Hosts the `CardDragSurfaceContext` (consumed by `useCardDragSurface()` and
 * `CardDropTargetView`) and `useDropTargetRegistry`, the hook that owns the
 * mutable registry of drop targets: stable register/unregister, in-place
 * patches via `updateTarget`, deterministic pointer hit-testing and ordered
 * keyboard traversal lookup. The drag lifecycle itself stays in
 * `CardDragSurface.tsx`; this hook only manages target bookkeeping and
 * cleans up keyboard focus when a focused target unregisters mid-drag.
 */

import { createContext, useCallback, useContext, useRef } from "react";
import type {
  ActiveDragState,
  CardDragSurfaceContextValue,
  RegisteredDropTarget,
} from "./types.js";

export const CardDragSurfaceContext =
  createContext<CardDragSurfaceContextValue | null>(null);

export function useCardDragSurface(): CardDragSurfaceContextValue | null {
  return useContext(CardDragSurfaceContext);
}

export interface DropTargetRegistryOptions {
  /** Inset (px) applied on every edge during the pointer hit test. */
  hitTestInsetPx: number;
  /** Live ref to the surface's active drag state (read-only here). */
  activeDragRef: { readonly current: ActiveDragState | null };
  /** Surface's setter for the active drag state (used for focus cleanup). */
  setActive: (next: ActiveDragState | null) => void;
}

export interface DropTargetRegistry {
  /** Mutable map of currently registered targets, keyed by target id. */
  targetsRef: { current: Map<string, RegisteredDropTarget> };
  registerTarget: (target: RegisteredDropTarget) => () => void;
  updateTarget: (
    targetId: string,
    patch: Partial<Omit<RegisteredDropTarget, "targetId" | "element">>,
  ) => void;
  isTargetUsable: (target: RegisteredDropTarget) => boolean;
  resolveDropTarget: (point: { x: number; y: number }) => string | null;
  sortedUsableTargetIds: () => string[];
}

export function useDropTargetRegistry({
  hitTestInsetPx,
  activeDragRef,
  setActive,
}: DropTargetRegistryOptions): DropTargetRegistry {
  const targetsRef = useRef(new Map<string, RegisteredDropTarget>());
  const orderCounterRef = useRef(0);

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
    [activeDragRef, setActive],
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

  return {
    targetsRef,
    registerTarget,
    updateTarget,
    isTargetUsable,
    resolveDropTarget,
    sortedUsableTargetIds,
  };
}
