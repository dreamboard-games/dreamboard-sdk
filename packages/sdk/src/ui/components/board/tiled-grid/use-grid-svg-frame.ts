/**
 * Shared SVG frame wiring for the tiled grid components (HexGrid, SquareGrid).
 *
 * Owns the pan/zoom hook wiring, the viewBox computation, the zoom-indicator
 * geometry derived from the viewBox, and the hover state backing the
 * interactive target layers.
 *
 * Pan/zoom gating decisions stay with the CALLER: HexGrid gates on mobile
 * (`enablePanZoom && isMobile`) while SquareGrid uses `enablePanZoom`
 * directly, so callers pass the fully resolved `panZoomEnabled` boolean.
 */

import {
  createElement,
  useState,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from "react";
import {
  usePanZoom,
  calculateViewBox,
  type PanZoomTransform,
  type UsePanZoomReturn,
} from "../../../hooks/usePanZoom.js";

/** Hover state for one interactive target layer (spaces, edges, or vertices). */
export interface GridTargetHoverState {
  hoveredTargetId: string | null;
  setHoveredTargetId: Dispatch<SetStateAction<string | null>>;
}

export interface GridViewBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * How the viewBox string is produced — the two grids historically diverge:
 * - "transformed": always run the bounds through `calculateViewBox`, even
 *   when pan/zoom is disabled (HexGrid's behavior).
 * - "static-when-disabled": use `0 0 ${width} ${height}` until pan/zoom is
 *   enabled (SquareGrid's behavior; bounds min is assumed to be 0,0).
 */
export type GridViewBoxMode = "transformed" | "static-when-disabled";

export interface UseGridSvgFrameOptions {
  /**
   * Resolved pan/zoom enablement. Mobile (or any other) gating decisions
   * stay with the caller; pass the final boolean here.
   */
  panZoomEnabled: boolean;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  /** Content bounds the viewBox is derived from. */
  bounds: GridViewBounds;
  viewBoxMode: GridViewBoxMode;
}

export interface UseGridSvgFrameResult {
  transform: PanZoomTransform;
  bind: UsePanZoomReturn["bind"];
  isDragging: boolean;
  viewBox: string;
  /** viewBox origin/height used to anchor the zoom indicator. */
  viewBoxX: number;
  viewBoxY: number;
  viewBoxHeight: number;
  spaceHover: GridTargetHoverState;
  edgeHover: GridTargetHoverState;
  vertexHover: GridTargetHoverState;
}

export function useGridSvgFrame(
  options: UseGridSvgFrameOptions,
): UseGridSvgFrameResult {
  const { panZoomEnabled, initialZoom, minZoom, maxZoom, bounds, viewBoxMode } =
    options;

  // Hover state for interactive elements
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredVertexId, setHoveredVertexId] = useState<string | null>(null);

  // Use the unified pan/zoom hook
  const { transform, bind, isDragging } = usePanZoom({
    enabled: panZoomEnabled,
    initialZoom,
    minZoom,
    maxZoom,
    mode: "viewbox",
  });

  let viewBox: string;
  let viewBoxX: number;
  let viewBoxY: number;
  let viewBoxHeight: number;
  if (viewBoxMode === "transformed") {
    // Calculate viewBox with pan and zoom (HexGrid behavior)
    viewBox = calculateViewBox(bounds, transform);
    // Parse viewBox for zoom indicator positioning
    const viewBoxParts = viewBox.split(" ").map(Number);
    viewBoxX = viewBoxParts[0] ?? 0;
    viewBoxY = viewBoxParts[1] ?? 0;
    viewBoxHeight = viewBoxParts[3] ?? 0;
  } else {
    // Calculate viewBox for pan/zoom (SquareGrid behavior)
    const totalWidth = bounds.width;
    const totalHeight = bounds.height;
    const viewBoxWidth = totalWidth / transform.zoom;
    viewBoxHeight = totalHeight / transform.zoom;
    viewBoxX = (totalWidth - viewBoxWidth) / 2 - transform.pan.x;
    viewBoxY = (totalHeight - viewBoxHeight) / 2 - transform.pan.y;
    viewBox = panZoomEnabled
      ? `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
      : `0 0 ${totalWidth} ${totalHeight}`;
  }

  return {
    transform,
    bind,
    isDragging,
    viewBox,
    viewBoxX,
    viewBoxY,
    viewBoxHeight,
    spaceHover: {
      hoveredTargetId: hoveredSpaceId,
      setHoveredTargetId: setHoveredSpaceId,
    },
    edgeHover: {
      hoveredTargetId: hoveredEdgeId,
      setHoveredTargetId: setHoveredEdgeId,
    },
    vertexHover: {
      hoveredTargetId: hoveredVertexId,
      setHoveredTargetId: setHoveredVertexId,
    },
  };
}

export interface GridZoomIndicatorProps {
  viewBoxX: number;
  viewBoxY: number;
  viewBoxHeight: number;
  zoom: number;
}

/**
 * Zoom-percentage badge anchored to the bottom-left of the viewBox.
 * Visibility gating (`panZoomEnabled && zoom !== 1`) stays with the caller.
 *
 * Built with `createElement` (not JSX) because this is a `.ts` module; the
 * element tree — including the separate number and "%" text children — is
 * identical to the inline JSX both grids previously used.
 */
export function GridZoomIndicator({
  viewBoxX,
  viewBoxY,
  viewBoxHeight,
  zoom,
}: GridZoomIndicatorProps): ReactElement {
  return createElement(
    "g",
    {
      transform: `translate(${viewBoxX + 10}, ${viewBoxY + viewBoxHeight - 30})`,
    },
    createElement("rect", {
      x: 0,
      y: 0,
      width: 60,
      height: 20,
      rx: 4,
      fill: "rgba(0,0,0,0.6)",
    }),
    createElement(
      "text",
      { x: 30, y: 14, textAnchor: "middle", fill: "white", fontSize: 12 },
      Math.round(zoom * 100),
      "%",
    ),
  );
}
