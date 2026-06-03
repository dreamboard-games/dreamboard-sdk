/**
 * Width-aware presentation selector for the controlled `HandView`.
 *
 * Measures the wrapping element with `ResizeObserver` and returns the chosen
 * presentation mode plus the resolved fan geometry. The hook is purely
 * presentational: it does not consume runtime state or descriptors.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  HAND_MODE_GEOMETRY,
  chooseHandLayoutMode,
  computeFanLayout,
  type FanCardPosition,
  type HandPresentationMode,
} from "../components/hand-layout-math.js";

export interface HandPresentationOptions {
  cardCount: number;
  cardWidth: number;
  cardHeight: number;
  /** Desktop preference; defaults to `fan`. */
  desktop?: HandPresentationMode;
  /** Mobile fallback; defaults to `tray`. */
  mobile?: HandPresentationMode;
  /** Subtracted from measured container width (gutter, scroll padding). */
  containerPadding?: number;
}

export interface HandPresentationResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerWidth: number;
  mode: HandPresentationMode;
  fanPositions: FanCardPosition[];
  fanStep: number;
  totalWidth: number;
  visibleSlice: number;
}

const DEFAULT_PADDING = 16;

export function useHandPresentation({
  cardCount,
  cardWidth,
  cardHeight,
  desktop = "fan",
  mobile = "tray",
  containerPadding = DEFAULT_PADDING,
}: HandPresentationOptions): HandPresentationResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let frame = 0;
    // Round to whole pixels and bail when the width is unchanged. The chosen
    // mode (fan vs compressed-fan) feeds the rendered card geometry, so an
    // unguarded float setState here can ping-pong the layout via ResizeObserver
    // (sub-pixel jitter, or a content-sized ancestor) and re-render forever.
    // Deferring to rAF also avoids "ResizeObserver loop limit exceeded".
    const apply = () => {
      const node = containerRef.current;
      if (!node) return;
      const next = Math.max(
        0,
        Math.round(node.getBoundingClientRect().width) - containerPadding,
      );
      setContainerWidth((prev) => (prev === next ? prev : next));
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerPadding]);

  return useMemo<HandPresentationResult>(() => {
    const mode = chooseHandLayoutMode({
      containerWidth,
      cardCount,
      cardWidth,
      desktop,
      mobile,
    });
    if (mode === "fan" || mode === "compressed-fan") {
      const geometry = HAND_MODE_GEOMETRY[mode];
      const layout = computeFanLayout({
        availableWidth: containerWidth || cardWidth * cardCount,
        cardWidth,
        cardHeight,
        count: cardCount,
        ...geometry,
      });
      return {
        containerRef,
        containerWidth,
        mode,
        fanPositions: layout.positions,
        fanStep: layout.step,
        totalWidth: layout.totalWidth,
        visibleSlice: layout.visibleSlice,
      };
    }
    return {
      containerRef,
      containerWidth,
      mode,
      fanPositions: [],
      fanStep: cardWidth,
      totalWidth: cardWidth * cardCount,
      visibleSlice: cardWidth,
    };
  }, [cardCount, cardHeight, cardWidth, containerWidth, desktop, mobile]);
}
