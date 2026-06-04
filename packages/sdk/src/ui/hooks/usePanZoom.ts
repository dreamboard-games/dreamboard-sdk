/**
 * usePanZoom hook - Unified pan and zoom gestures using @use-gesture/react
 *
 * Provides a declarative API for pan and zoom interactions on board components.
 * Works with both SVG (via viewBox) and HTML (via CSS transforms) elements.
 *
 * Features:
 * - Single finger/mouse drag for panning
 * - Pinch-to-zoom on touch devices
 * - Mouse wheel zoom on desktop
 * - Configurable zoom limits
 * - Optional momentum/inertia
 *
 * @example SVG usage (NetworkGraph, HexGrid, etc.)
 * ```tsx
 * const { transform, bind, resetTransform } = usePanZoom({
 *   enabled: enablePanZoom,
 *   minZoom: 0.5,
 *   maxZoom: 3,
 * });
 *
 * // Apply to viewBox calculation
 * const viewBoxWidth = contentWidth / transform.zoom;
 * const viewBoxX = baseX - transform.pan.x;
 *
 * <svg {...bind()} style={{ touchAction: 'none' }}>
 *   ...
 * </svg>
 * ```
 *
 * @example HTML usage (SlotSystem, etc.)
 * ```tsx
 * const { transform, bind, style } = usePanZoom({
 *   enabled: enablePanZoom,
 *   mode: 'css',
 * });
 *
 * <div {...bind()} style={{ ...style, touchAction: 'none' }}>
 *   ...
 * </div>
 * ```
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useGesture, type Handler } from "@use-gesture/react";

export interface PanZoomTransform {
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Current pan offset */
  pan: { x: number; y: number };
}

export interface UsePanZoomOptions {
  /** Whether pan/zoom is enabled */
  enabled?: boolean;
  /** Initial zoom level */
  initialZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Initial pan offset */
  initialPan?: { x: number; y: number };
  /** Transform mode: 'viewbox' for SVG, 'css' for HTML elements */
  mode?: "viewbox" | "css";
  /** Zoom sensitivity for wheel events (default: 0.002) */
  wheelSensitivity?: number;
  /** Called when transform changes */
  onTransformChange?: (transform: PanZoomTransform) => void;
}

/** Type for gesture bind function that returns props to spread on element
 * Note: We omit ref from the return type to avoid conflicts with explicit refs on elements.
 * The gesture library handles its own internal ref binding.
 */
type GestureBindFunction = () => Omit<React.HTMLAttributes<Element>, "ref">;

export interface UsePanZoomReturn {
  /** Current transform state */
  transform: PanZoomTransform;
  /** Gesture handlers to spread on the target element - always returns spreadable props */
  bind: GestureBindFunction;
  /** Reset transform to initial values */
  resetTransform: () => void;
  /** Set zoom programmatically */
  setZoom: (zoom: number) => void;
  /** Set pan programmatically */
  setPan: (pan: { x: number; y: number }) => void;
  /** CSS transform style (for mode: 'css') */
  style: React.CSSProperties;
  /** Whether currently dragging/panning */
  isDragging: boolean;
  /** Whether currently pinching */
  isPinching: boolean;
}

/**
 * Hook for pan and zoom gestures on board components
 */
export function usePanZoom(options: UsePanZoomOptions = {}): UsePanZoomReturn {
  const {
    enabled = true,
    initialZoom = 1,
    minZoom = 0.5,
    maxZoom = 3,
    initialPan = { x: 0, y: 0 },
    mode = "viewbox",
    wheelSensitivity = 0.002,
    onTransformChange,
  } = options;

  const [zoom, setZoomState] = useState(initialZoom);
  const [pan, setPanState] = useState(initialPan);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  // Clamp zoom to bounds
  const clampZoom = useCallback(
    (z: number) => Math.min(maxZoom, Math.max(minZoom, z)),
    [minZoom, maxZoom],
  );

  // Update transform and notify
  const updateTransform = useCallback(
    (newZoom: number, newPan: { x: number; y: number }) => {
      const clampedZoom = clampZoom(newZoom);
      setZoomState(clampedZoom);
      setPanState(newPan);
      onTransformChange?.({ zoom: clampedZoom, pan: newPan });
    },
    [clampZoom, onTransformChange],
  );

  // Gesture bindings
  const bind = useGesture(
    {
      onDrag: (({
        delta: [dx, dy],
        active,
        pinching,
      }: Parameters<Handler<"drag">>[0]) => {
        if (!enabled || pinching) return;

        setIsDragging(active);

        if (active) {
          // For viewbox mode, we invert and scale the delta
          // For CSS mode, we apply directly
          const scaleFactor = mode === "viewbox" ? 1 / zoom : 1;
          setPanState((prev) => ({
            x: prev.x + dx * scaleFactor,
            y: prev.y + dy * scaleFactor,
          }));
        }
      }) as Handler<"drag">,
      onPinch: (({
        offset: [scale],
        active,
      }: Parameters<Handler<"pinch">>[0]) => {
        if (!enabled) return;

        setIsPinching(active);

        if (active) {
          const newZoom = clampZoom(scale);
          setZoomState(newZoom);
          onTransformChange?.({ zoom: newZoom, pan });
        }
      }) as Handler<"pinch">,
      onWheel: (({ delta: [, dy], event }: Parameters<Handler<"wheel">>[0]) => {
        if (!enabled) return;

        event.preventDefault();
        const newZoom = clampZoom(zoom - dy * wheelSensitivity);
        setZoomState(newZoom);
        onTransformChange?.({ zoom: newZoom, pan });
      }) as Handler<"wheel">,
    },
    {
      drag: {
        enabled,
        filterTaps: true,
      },
      pinch: {
        enabled,
        scaleBounds: { min: minZoom, max: maxZoom },
        from: () => [zoom, 0],
      },
      wheel: {
        enabled,
        eventOptions: { passive: false },
      },
    },
  );

  // Reset to initial values
  const resetTransform = useCallback(() => {
    updateTransform(initialZoom, initialPan);
  }, [initialZoom, initialPan, updateTransform]);

  useEffect(() => {
    updateTransform(initialZoom, initialPan);
  }, [initialZoom, initialPan.x, initialPan.y, updateTransform]);

  // Programmatic setters
  const setZoom = useCallback(
    (newZoom: number) => {
      updateTransform(clampZoom(newZoom), pan);
    },
    [pan, clampZoom, updateTransform],
  );

  const setPan = useCallback(
    (newPan: { x: number; y: number }) => {
      updateTransform(zoom, newPan);
    },
    [zoom, updateTransform],
  );

  // CSS transform style for HTML mode
  const style = useMemo<React.CSSProperties>(
    () =>
      mode === "css"
        ? {
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }
        : {},
    [mode, pan.x, pan.y, zoom],
  );

  // Current transform state
  const transform = useMemo<PanZoomTransform>(
    () => ({ zoom, pan }),
    [zoom, pan],
  );

  // Wrap bind to ensure it always returns spreadable props (never void)
  // We exclude 'ref' from the result to avoid type conflicts with explicit element refs
  const safeBind: GestureBindFunction = useCallback(() => {
    const result = bind();
    // If bind returns void (shouldn't happen with our config), return empty object
    // Destructure to omit ref, avoiding type conflicts with SVG/HTML element refs

    const { ref: _ref, ...propsWithoutRef } = (result ??
      {}) as React.HTMLAttributes<Element> & { ref?: unknown };
    return propsWithoutRef;
  }, [bind]);

  return {
    transform,
    bind: safeBind,
    resetTransform,
    setZoom,
    setPan,
    style,
    isDragging,
    isPinching,
  };
}

/**
 * Helper to calculate SVG viewBox with pan/zoom applied
 */
export function calculateViewBox(
  bounds: { minX: number; minY: number; width: number; height: number },
  transform: PanZoomTransform,
): string {
  const viewBoxWidth = bounds.width / transform.zoom;
  const viewBoxHeight = bounds.height / transform.zoom;
  const viewBoxX =
    bounds.minX + (bounds.width - viewBoxWidth) / 2 - transform.pan.x;
  const viewBoxY =
    bounds.minY + (bounds.height - viewBoxHeight) / 2 - transform.pan.y;

  return `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
}
