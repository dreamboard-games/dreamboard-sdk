/**
 * SVG-based hex grid for hex-based games (Catan, wargames, Hive, Twilight Imperium).
 * Supports tiles, edges (roads), vertices (settlements), and interactive placement overlays.
 * Pan/zoom enabled on mobile via @use-gesture.
 */

import { useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { usePanZoom, calculateViewBox } from "../../hooks/usePanZoom.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { handleKeyboardActivation } from "./interaction-accessibility.js";
import {
  interactiveTargetRenderState,
  isInteractiveTargetSelectable,
  type InteractiveTargetLayer,
  type InteractiveTargetRenderState,
} from "./target-layer.js";
import {
  type AuthoredHexBoardInput,
  type AnyHexBoardInput,
  type BoardSpaceIdOf,
  type GeneratedHexBoardInput,
  type NormalizedHexBoard,
  type NormalizedHexEdgeOf,
  type NormalizedHexTileOf,
  type NormalizedHexVertexOf,
  normalizeHexBoardInput,
} from "../../types/tiled-board.js";

export type {
  InteractiveTargetLayer,
  InteractiveTargetRenderState,
} from "./target-layer.js";

// ============================================================================
// Types
// ============================================================================

export type HexOrientation = "pointy-top" | "flat-top";

/**
 * Geometry context passed to `renderTile`.
 *
 * `corners`, `points`, and `bounds` are expressed in tile-local
 * coordinates because each tile is rendered inside a `<g>` translated
 * to its center. Use `position` if you need the resolved center in the
 * board's absolute SVG coordinates.
 *
 * The `inset` option shrinks the polygon toward the center by that many
 * pixels, which is useful for layered effects such as borders, frames,
 * or inner highlights without re-deriving the hex math yourself.
 */
export interface HexTileGeometry {
  size: number;
  orientation: HexOrientation;
  center: { x: 0; y: 0 };
  position: { x: number; y: number };
  corners: (options?: { inset?: number }) => Array<{ x: number; y: number }>;
  points: (options?: { inset?: number }) => string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface EdgePosition {
  /** Absolute SVG start point of the visible edge line. */
  x1: number;
  y1: number;
  /** Absolute SVG end point of the visible edge line. */
  x2: number;
  y2: number;
  /** Absolute SVG midpoint of the edge. */
  midX: number;
  midY: number;
  /**
   * Angle in degrees from hex1 center to hex2 center.
   * This is perpendicular to the visible edge line.
   */
  centerAngle: number;
  /** Angle in degrees of the visible edge line itself. */
  edgeAngle: number;
}

export interface InteractiveHexVertex<
  TBoard extends AnyHexBoardInput = AnyHexBoardInput,
> extends NormalizedHexVertexOf<TBoard> {
  position: { x: number; y: number };
  spaceIds: ReadonlyArray<BoardSpaceIdOf<TBoard>>;
}

export interface InteractiveHexEdge<
  TBoard extends AnyHexBoardInput = AnyHexBoardInput,
> extends NormalizedHexEdgeOf<TBoard> {
  position: EdgePosition;
  spaceIds: ReadonlyArray<BoardSpaceIdOf<TBoard>>;
}

export type InteractiveHexSpace<
  TBoard extends AnyHexBoardInput = AnyHexBoardInput,
> = NormalizedHexTileOf<TBoard>;

interface HexGeneratedGridInputProps {
  id?: string;
  layout?: "hex";
  orientation?: HexOrientation;
  spaces: Extract<AnyHexBoardInput, { spaces: unknown }>["spaces"];
  edges?: AnyHexBoardInput["edges"];
  vertices?: AnyHexBoardInput["vertices"];
}

interface HexAuthoredGridInputProps {
  id?: string;
  layout?: "hex";
  orientation?: HexOrientation;
  tiles: Extract<AnyHexBoardInput, { tiles: unknown }>["tiles"];
  edges?: AnyHexBoardInput["edges"];
  vertices?: AnyHexBoardInput["vertices"];
}

type HexGridInputProps = HexGeneratedGridInputProps | HexAuthoredGridInputProps;

type ResolvedArrayProp<Value> =
  Exclude<Value, undefined> extends readonly unknown[]
    ? Exclude<Value, undefined>
    : readonly [];

type HexBoardLikeOfProps<TProps extends HexGridInputProps> = TProps extends {
  id?: infer Id;
  layout?: infer Layout;
  orientation?: infer Orientation;
  spaces: infer Spaces;
  edges?: infer Edges;
  vertices?: infer Vertices;
}
  ? {
      id: Extract<Id, string> extends never ? string : Extract<Id, string>;
      layout?: Extract<Layout, "hex">;
      orientation?: Extract<Orientation, HexOrientation>;
      spaces: Spaces;
      edges: ResolvedArrayProp<Edges>;
      vertices: ResolvedArrayProp<Vertices>;
    } & GeneratedHexBoardInput
  : TProps extends {
        id?: infer Id;
        layout?: infer Layout;
        orientation?: infer Orientation;
        tiles: infer Tiles;
        edges?: infer Edges;
        vertices?: infer Vertices;
      }
    ? {
        id: Extract<Id, string> extends never ? string : Extract<Id, string>;
        layout?: Extract<Layout, "hex">;
        orientation?: Extract<Orientation, HexOrientation>;
        tiles: Tiles;
        edges: ResolvedArrayProp<Edges>;
        vertices: ResolvedArrayProp<Vertices>;
      } & AuthoredHexBoardInput
    : never;

export type HexGridProps<TProps extends HexGridInputProps = HexGridInputProps> =
  TProps & {
    orientation?: HexOrientation;
    /** Hex radius in pixels */
    hexSize?: number;
    /**
     * Receives tile data centered at (0,0) plus a `HexTileGeometry`
     * helper. Use `geometry.points({ inset })` to draw custom polygons
     * without duplicating `hexSize` / orientation in the consumer.
     */
    renderTile: (
      tile: NormalizedHexTileOf<NoInfer<HexBoardLikeOfProps<TProps>>>,
      geometry: HexTileGeometry,
    ) => ReactNode;
    /**
     * Receives edge geometry in absolute SVG coordinates.
     * Use `position.edgeAngle` to align artwork with the visible edge.
     */
    renderEdge: (
      edge: NormalizedHexEdgeOf<NoInfer<HexBoardLikeOfProps<TProps>>>,
      position: EdgePosition,
    ) => ReactNode;
    renderVertex: (
      vertex: NormalizedHexVertexOf<NoInfer<HexBoardLikeOfProps<TProps>>>,
      position: { x: number; y: number },
    ) => ReactNode;
    width?: number | string;
    height?: number | string;
    enablePanZoom?: boolean;
    initialZoom?: number;
    minZoom?: number;
    maxZoom?: number;
    className?: string;

    // Interactive board target layers.

    /** Reducer-aware space target layer from `board.targetLayers.space(...)`. */
    interactiveSpaces?: InteractiveTargetLayer;
    /** Reducer-aware vertex target layer from `board.targetLayers.vertex(...)`. */
    interactiveVertices?: InteractiveTargetLayer;
    /** Reducer-aware edge target layer from `board.targetLayers.edge(...)`. */
    interactiveEdges?: InteractiveTargetLayer;
    /** Receives space geometry centered at (0,0). */
    renderInteractiveSpace?: (
      space: InteractiveHexSpace<NoInfer<HexBoardLikeOfProps<TProps>>>,
      state: InteractiveTargetRenderState,
    ) => ReactNode;
    /**
     * Receives vertex geometry in absolute SVG coordinates.
     */
    renderInteractiveVertex?: (
      vertex: InteractiveHexVertex<NoInfer<HexBoardLikeOfProps<TProps>>>,
      position: { x: number; y: number },
      state: InteractiveTargetRenderState,
    ) => ReactNode;
    /**
     * Receives edge geometry in the same absolute SVG coordinates as `renderEdge`.
     */
    renderInteractiveEdge?: (
      edge: InteractiveHexEdge<NoInfer<HexBoardLikeOfProps<TProps>>>,
      position: EdgePosition,
      state: InteractiveTargetRenderState,
    ) => ReactNode;
    interactiveVertexSize?: number;
    interactiveEdgeSize?: number;
  };

export interface HexGridBoardProps<
  TBoard extends AnyHexBoardInput = AnyHexBoardInput,
> {
  board: TBoard;
  orientation?: HexOrientation;
  hexSize?: number;
  /**
   * Receives tile data centered at (0,0) plus a `HexTileGeometry`
   * helper. Use `geometry.points({ inset })` to draw custom polygons
   * without duplicating `hexSize` / orientation in the consumer.
   */
  renderTile: (
    tile: NormalizedHexTileOf<NoInfer<TBoard>>,
    geometry: HexTileGeometry,
  ) => ReactNode;
  /**
   * Receives edge geometry in absolute SVG coordinates.
   * Use `position.edgeAngle` to align artwork with the visible edge.
   */
  renderEdge: (
    edge: NormalizedHexEdgeOf<NoInfer<TBoard>>,
    position: EdgePosition,
  ) => ReactNode;
  renderVertex: (
    vertex: NormalizedHexVertexOf<NoInfer<TBoard>>,
    position: { x: number; y: number },
  ) => ReactNode;
  width?: number | string;
  height?: number | string;
  enablePanZoom?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  interactiveSpaces?: InteractiveTargetLayer;
  interactiveVertices?: InteractiveTargetLayer;
  interactiveEdges?: InteractiveTargetLayer;
  /** Receives space geometry centered at (0,0). */
  renderInteractiveSpace?: (
    space: InteractiveHexSpace<NoInfer<TBoard>>,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  /**
   * Receives vertex geometry in absolute SVG coordinates.
   */
  renderInteractiveVertex?: (
    vertex: InteractiveHexVertex<NoInfer<TBoard>>,
    position: { x: number; y: number },
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  /**
   * Receives edge geometry in the same absolute SVG coordinates as `renderEdge`.
   */
  renderInteractiveEdge?: (
    edge: InteractiveHexEdge<NoInfer<TBoard>>,
    position: EdgePosition,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  interactiveVertexSize?: number;
  interactiveEdgeSize?: number;
}

// ============================================================================
// Pre-built Helper Components
// ============================================================================

export interface DefaultHexTileProps {
  /** Should match hexSize from HexGrid */
  size: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  label?: string;
  showCoordinates?: boolean;
  coordinates?: { q: number; r: number };
  orientation?: HexOrientation;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}

/** Pre-built hexagon tile for use in `renderTile`. */
export function DefaultHexTile({
  size,
  fill,
  stroke = "#1e293b",
  strokeWidth = 1.5,
  isSelected = false,
  isHighlighted = false,
  label,
  showCoordinates = false,
  coordinates,
  orientation = "pointy-top",
  onClick,
  onPointerEnter,
  onPointerLeave,
  className,
}: DefaultHexTileProps) {
  const effectiveFill = isSelected
    ? "rgba(59, 130, 246, 0.5)"
    : isHighlighted
      ? "rgba(34, 197, 94, 0.4)"
      : fill;

  const effectiveStroke = isSelected
    ? "#3b82f6"
    : isHighlighted
      ? "#22c55e"
      : stroke;

  const effectiveStrokeWidth = isSelected || isHighlighted ? 3 : strokeWidth;

  const points = hexUtils.getHexPoints(0, 0, size * 0.95, orientation);

  return (
    <g
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-all duration-150",
        onClick && "cursor-pointer hover:brightness-110",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (label ?? "Hex tile") : undefined}
    >
      <polygon
        points={points}
        fill={effectiveFill}
        stroke={effectiveStroke}
        strokeWidth={effectiveStrokeWidth}
        filter="url(#hexShadow)"
      />

      {label && (
        <text
          x={0}
          y={showCoordinates ? -8 : 0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={size * 0.28}
          fontWeight="bold"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          pointerEvents="none"
        >
          {label}
        </text>
      )}

      {showCoordinates && coordinates && (
        <text
          x={0}
          y={label ? 10 : 0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={size * 0.2}
          pointerEvents="none"
        >
          {coordinates.q},{coordinates.r}
        </text>
      )}
    </g>
  );
}

export interface DefaultHexEdgeProps {
  position: EdgePosition;
  color: string;
  hasOwner?: boolean;
  strokeWidth?: number;
  touchTargetSize?: number;
  onClick?: () => void;
  className?: string;
}

/** Pre-built edge/road component for use in `renderEdge`. */
export function DefaultHexEdge({
  position,
  color,
  hasOwner = true,
  strokeWidth = 6,
  touchTargetSize = 20,
  onClick,
  className,
}: DefaultHexEdgeProps) {
  const touchTargetLength = Math.hypot(
    position.x2 - position.x1,
    position.y2 - position.y1,
  );

  return (
    <g
      onClick={onClick}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-all duration-150",
        onClick && "cursor-pointer",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Hex edge" : undefined}
    >
      {/* Invisible touch target */}
      <rect
        x={position.midX - touchTargetLength / 2}
        y={position.midY - touchTargetSize / 2}
        width={touchTargetLength}
        height={touchTargetSize}
        rx={touchTargetSize / 2}
        fill="rgba(255,255,255,0.001)"
        transform={`rotate(${position.edgeAngle} ${position.midX} ${position.midY})`}
        pointerEvents="all"
      />
      {/* Visible edge */}
      <line
        x1={position.x1}
        y1={position.y1}
        x2={position.x2}
        y2={position.y2}
        stroke={color}
        strokeWidth={hasOwner ? strokeWidth : strokeWidth / 2}
        strokeLinecap="round"
        className={hasOwner ? "" : "opacity-30"}
      />
    </g>
  );
}

export interface DefaultHexVertexProps {
  position: { x: number; y: number };
  color: string;
  stroke?: string;
  strokeWidth?: number;
  hasOwner?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  size?: number;
  touchTargetSize?: number;
  shape?: "circle" | "square";
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}

/** Pre-built vertex/settlement component for use in `renderVertex`. */
export function DefaultHexVertex({
  position,
  color,
  stroke = "#1e293b",
  strokeWidth = 1.5,
  hasOwner = true,
  isSelected = false,
  isHighlighted = false,
  size = 10,
  touchTargetSize = 22,
  shape = "circle",
  onClick,
  onPointerEnter,
  onPointerLeave,
  className,
}: DefaultHexVertexProps) {
  const effectiveColor = isSelected
    ? "rgba(59, 130, 246, 0.8)"
    : isHighlighted
      ? "rgba(34, 197, 94, 0.8)"
      : color;

  const effectiveStroke = isSelected
    ? "#3b82f6"
    : isHighlighted
      ? "#22c55e"
      : stroke;

  const effectiveStrokeWidth = isSelected || isHighlighted ? 3 : strokeWidth;

  return (
    <g
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-all duration-150",
        onClick && "cursor-pointer hover:scale-110",
        className,
      )}
      style={{ transformOrigin: `${position.x}px ${position.y}px` }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Hex vertex" : undefined}
    >
      {/* Invisible touch target */}
      <circle
        cx={position.x}
        cy={position.y}
        r={touchTargetSize}
        fill="rgba(255,255,255,0.001)"
        pointerEvents="all"
      />
      {/* Visible vertex */}
      {shape === "square" ? (
        <rect
          x={position.x - size}
          y={position.y - size}
          width={size * 2}
          height={size * 2}
          fill={effectiveColor}
          stroke={effectiveStroke}
          strokeWidth={effectiveStrokeWidth}
          className={hasOwner ? "" : "opacity-30"}
        />
      ) : (
        <circle
          cx={position.x}
          cy={position.y}
          r={hasOwner ? size : size * 0.5}
          fill={effectiveColor}
          stroke={effectiveStroke}
          strokeWidth={effectiveStrokeWidth}
          className={hasOwner ? "" : "opacity-30"}
        />
      )}
    </g>
  );
}

// ============================================================================
// Interactive Helper Components (for placement UI)
// ============================================================================

export interface DefaultInteractiveVertexProps {
  position: { x: number; y: number };
  isHovered: boolean;
  size?: number;
  color?: string;
  hoverColor?: string;
  className?: string;
}
export function DefaultInteractiveVertex({
  position,
  isHovered,
  size = 8,
  color = "rgba(255, 255, 255, 0.2)",
  hoverColor = "rgba(34, 197, 94, 0.8)",
  className,
}: DefaultInteractiveVertexProps) {
  return (
    <circle
      cx={position.x}
      cy={position.y}
      r={isHovered ? size * 1.5 : size}
      fill={isHovered ? hoverColor : color}
      stroke={isHovered ? "#22c55e" : "rgba(255,255,255,0.4)"}
      strokeWidth={isHovered ? 2 : 1}
      className={clsx("transition-all duration-150", className)}
    />
  );
}

export interface DefaultInteractiveEdgeProps {
  position: EdgePosition;
  isHovered: boolean;
  strokeWidth?: number;
  color?: string;
  hoverColor?: string;
  className?: string;
}
export function DefaultInteractiveEdge({
  position,
  isHovered,
  strokeWidth = 4,
  color = "rgba(255, 255, 255, 0.15)",
  hoverColor = "rgba(251, 146, 60, 0.8)",
  className,
}: DefaultInteractiveEdgeProps) {
  return (
    <line
      x1={position.x1}
      y1={position.y1}
      x2={position.x2}
      y2={position.y2}
      stroke={isHovered ? hoverColor : color}
      strokeWidth={isHovered ? strokeWidth * 1.5 : strokeWidth}
      strokeLinecap="round"
      className={clsx("transition-all duration-150", className)}
    />
  );
}

// ============================================================================
// Hex Math Utilities
// ============================================================================

export const hexUtils = {
  /** Convert axial coordinates to pixel position. */
  axialToPixel(
    q: number,
    r: number,
    size: number,
    orientation: HexOrientation,
  ): { x: number; y: number } {
    if (orientation === "pointy-top") {
      const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
      const y = size * ((3 / 2) * r);
      return { x, y };
    } else {
      const x = size * ((3 / 2) * q);
      const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
      return { x, y };
    }
  },

  getNeighbors(q: number, r: number): Array<{ q: number; r: number }> {
    return [
      { q: q + 1, r: r },
      { q: q + 1, r: r - 1 },
      { q: q, r: r - 1 },
      { q: q - 1, r: r },
      { q: q - 1, r: r + 1 },
      { q: q, r: r + 1 },
    ];
  },

  getDistance(q1: number, r1: number, q2: number, r2: number): number {
    return (
      (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2
    );
  },

  getHexCorners(
    centerX: number,
    centerY: number,
    size: number,
    orientation: HexOrientation,
  ): Array<{ x: number; y: number }> {
    const corners: Array<{ x: number; y: number }> = [];
    const startAngle = orientation === "pointy-top" ? 30 : 0;

    for (let i = 0; i < 6; i++) {
      const angleDeg = startAngle + 60 * i;
      const angleRad = (Math.PI / 180) * angleDeg;
      corners.push({
        x: centerX + size * Math.cos(angleRad),
        y: centerY + size * Math.sin(angleRad),
      });
    }
    return corners;
  },

  getHexPoints(
    centerX: number,
    centerY: number,
    size: number,
    orientation: HexOrientation,
  ): string {
    const corners = this.getHexCorners(centerX, centerY, size, orientation);
    return corners.map((c) => `${c.x},${c.y}`).join(" ");
  },

  getEdgePosition(
    hex1Pos: { x: number; y: number },
    hex2Pos: { x: number; y: number },
    size: number,
  ): EdgePosition {
    const midX = (hex1Pos.x + hex2Pos.x) / 2;
    const midY = (hex1Pos.y + hex2Pos.y) / 2;
    const centerAngleRad = Math.atan2(
      hex2Pos.y - hex1Pos.y,
      hex2Pos.x - hex1Pos.x,
    );

    // Calculate edge endpoints perpendicular to the line between hex centers
    const edgeAngleRad = centerAngleRad + Math.PI / 2;
    const edgeLength = size * 0.8;
    const centerAngle = (centerAngleRad * 180) / Math.PI;
    const edgeAngle = (edgeAngleRad * 180) / Math.PI;

    return {
      x1: midX - (edgeLength / 2) * Math.cos(edgeAngleRad),
      y1: midY - (edgeLength / 2) * Math.sin(edgeAngleRad),
      x2: midX + (edgeLength / 2) * Math.cos(edgeAngleRad),
      y2: midY + (edgeLength / 2) * Math.sin(edgeAngleRad),
      midX,
      midY,
      centerAngle,
      edgeAngle,
    };
  },

  getVertexPosition(
    hex1Pos: { x: number; y: number },
    hex2Pos: { x: number; y: number },
    hex3Pos: { x: number; y: number },
  ): { x: number; y: number } {
    return {
      x: (hex1Pos.x + hex2Pos.x + hex3Pos.x) / 3,
      y: (hex1Pos.y + hex2Pos.y + hex3Pos.y) / 3,
    };
  },
};

// ============================================================================
// Component
// ============================================================================

export interface HexGridComponent {
  <const TBoard extends AnyHexBoardInput>(
    props: HexGridBoardProps<TBoard>,
  ): ReactNode;
  <const TProps extends HexGeneratedGridInputProps>(
    props: HexGridProps<TProps>,
  ): ReactNode;
  <const TProps extends HexAuthoredGridInputProps>(
    props: HexGridProps<TProps>,
  ): ReactNode;
}

function HexGridImpl(
  props: HexGridBoardProps<AnyHexBoardInput> | HexGridProps<HexGridInputProps>,
) {
  const {
    orientation = "pointy-top",
    hexSize = 50,
    renderTile,
    renderEdge,
    renderVertex,
    width = 800,
    height = 600,
    enablePanZoom = true,
    initialZoom = 1,
    minZoom = 0.5,
    maxZoom = 3,
    className,
    interactiveSpaces,
    interactiveVertices,
    interactiveEdges,
    renderInteractiveSpace,
    renderInteractiveVertex,
    renderInteractiveEdge,
    interactiveVertexSize = 12,
    interactiveEdgeSize = 10,
  } = props;
  const board =
    "board" in props
      ? props.board
      : (("spaces" in props
          ? {
              id: "__hex-grid__",
              orientation,
              spaces: props.spaces,
              edges: props.edges ?? [],
              vertices: props.vertices ?? [],
            }
          : {
              id: "__hex-grid__",
              orientation,
              tiles: props.tiles,
              edges: props.edges ?? [],
              vertices: props.vertices ?? [],
            }) satisfies AnyHexBoardInput);
  // Pan/zoom is only enabled on mobile devices when the prop is true
  const isMobile = useIsMobile();
  const effectivePanZoom = enablePanZoom && isMobile;
  const normalizedBoard = useMemo<NormalizedHexBoard<AnyHexBoardInput>>(
    () => normalizeHexBoardInput(board),
    [board],
  );
  const resolvedTiles = normalizedBoard.tiles;
  const resolvedEdges = normalizedBoard.edges;
  const resolvedVertices = normalizedBoard.vertices;
  const resolvedOrientation = normalizedBoard.orientation ?? orientation;

  // Hover state for interactive elements
  const [hoveredSpaceId, setHoveredSpaceId] = useState<string | null>(null);
  const [hoveredVertexId, setHoveredVertexId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Use the unified pan/zoom hook
  const { transform, bind, isDragging } = usePanZoom({
    enabled: effectivePanZoom,
    initialZoom,
    minZoom,
    maxZoom,
    mode: "viewbox",
  });

  // Pre-compute tile positions
  const tilePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    resolvedTiles.forEach((tile) => {
      positions.set(
        tile.id,
        hexUtils.axialToPixel(tile.q, tile.r, hexSize, resolvedOrientation),
      );
    });
    return positions;
  }, [resolvedTiles, hexSize, resolvedOrientation]);

  // Build a `HexTileGeometry` for a tile centered at `position`.
  //
  // The closures intentionally re-derive corners on demand so callers
  // can pass a per-call `inset` without the grid pre-computing every
  // possible inset. Hex math is cheap (six trig calls).
  const buildTileGeometry = useMemo(
    () =>
      (position: { x: number; y: number }): HexTileGeometry => {
        const corners = (options?: { inset?: number }) => {
          const inset = options?.inset ?? 0;
          const radius = Math.max(0, hexSize - inset);
          return hexUtils.getHexCorners(0, 0, radius, resolvedOrientation);
        };
        const points = (options?: { inset?: number }) =>
          corners(options)
            .map((corner) => `${corner.x},${corner.y}`)
            .join(" ");
        const outer = corners();
        const xs = outer.map((corner) => corner.x);
        const ys = outer.map((corner) => corner.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          size: hexSize,
          orientation: resolvedOrientation,
          center: { x: 0, y: 0 },
          position,
          corners,
          points,
          bounds: {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
          },
        };
      },
    [hexSize, resolvedOrientation],
  );

  const resolvedEdgePositions = useMemo(
    () =>
      resolvedEdges.flatMap((edge) => {
        const pos1 = tilePositions.get(edge.hex1);
        const pos2 = tilePositions.get(edge.hex2);
        if (!pos1 || !pos2) {
          return [];
        }
        return [
          {
            edge,
            interactiveEdge: {
              ...edge,
              spaceIds: [edge.hex1, edge.hex2] as const,
              position: hexUtils.getEdgePosition(pos1, pos2, hexSize),
            } as InteractiveHexEdge<AnyHexBoardInput>,
          },
        ];
      }),
    [hexSize, resolvedEdges, tilePositions],
  );

  const resolvedVertexPositions = useMemo(
    () =>
      resolvedVertices.flatMap((vertex) => {
        const [hex0, hex1, hex2] = vertex.hexes;
        if (!hex0 || !hex1 || !hex2) {
          return [];
        }

        const pos0 = tilePositions.get(hex0);
        const pos1 = tilePositions.get(hex1);
        const pos2 = tilePositions.get(hex2);
        if (!pos0 || !pos1 || !pos2) {
          return [];
        }

        return [
          {
            vertex,
            interactiveVertex: {
              ...vertex,
              spaceIds: vertex.hexes,
              position: hexUtils.getVertexPosition(pos0, pos1, pos2),
            } as InteractiveHexVertex<AnyHexBoardInput>,
          },
        ];
      }),
    [resolvedVertices, tilePositions],
  );

  // Calculate bounds for viewBox
  const bounds = useMemo(() => {
    if (resolvedTiles.length === 0) {
      return { minX: 0, minY: 0, width: 400, height: 300 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    resolvedTiles.forEach((tile) => {
      const pos = tilePositions.get(tile.id);
      if (pos) {
        minX = Math.min(minX, pos.x - hexSize);
        minY = Math.min(minY, pos.y - hexSize);
        maxX = Math.max(maxX, pos.x + hexSize);
        maxY = Math.max(maxY, pos.y + hexSize);
      }
    });

    const padding = hexSize;
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [resolvedTiles, tilePositions, hexSize]);

  // Calculate viewBox with pan and zoom
  const viewBox = calculateViewBox(bounds, transform);

  // Parse viewBox for zoom indicator positioning
  const viewBoxParts = viewBox.split(" ").map(Number);
  const viewBoxX = viewBoxParts[0] ?? 0;
  const viewBoxY = viewBoxParts[1] ?? 0;
  const viewBoxHeight = viewBoxParts[3] ?? 0;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      className={clsx(
        "hex-grid",
        effectivePanZoom && "touch-none",
        isDragging && "cursor-grabbing",
        effectivePanZoom && !isDragging && "cursor-grab",
        className,
      )}
      {...bind()}
      role="img"
      aria-label="Hex grid game board"
    >
      <defs>
        {/* Gradient for ocean tiles */}
        <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        {/* Drop shadow filter */}
        <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Tiles layer */}
      <g className="tiles" role="list" aria-label="Hex tiles">
        {resolvedTiles.map((tile) => {
          const pos = tilePositions.get(tile.id);
          if (!pos) return null;

          const geometry = buildTileGeometry(pos);
          return (
            <g
              key={tile.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              role="listitem"
              aria-label={tile.label ?? `Tile ${tile.id}`}
            >
              {renderTile(tile, geometry)}
            </g>
          );
        })}
      </g>

      {/* Interactive spaces layer */}
      {interactiveSpaces && resolvedTiles.length > 0 && (
        <g
          className="interactive-spaces"
          role="list"
          aria-label="Interactive spaces"
        >
          {resolvedTiles.map((space) => {
            const pos = tilePositions.get(space.id);
            if (!pos) return null;
            const state = interactiveTargetRenderState(
              interactiveSpaces,
              space.id,
              hoveredSpaceId === space.id,
            );
            const isSelectable = isInteractiveTargetSelectable(
              interactiveSpaces,
              state,
            );
            return (
              <g
                key={space.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                role={isSelectable ? "button" : undefined}
                className={clsx(isSelectable && "cursor-pointer")}
                onPointerEnter={() => setHoveredSpaceId(space.id)}
                onPointerLeave={() =>
                  setHoveredSpaceId((currentId) =>
                    currentId === space.id ? null : currentId,
                  )
                }
                onClick={
                  isSelectable
                    ? () => {
                        void state.select?.();
                      }
                    : undefined
                }
                onKeyDown={(event) =>
                  handleKeyboardActivation(
                    event,
                    isSelectable
                      ? () => {
                          void state.select?.();
                        }
                      : undefined,
                  )
                }
                tabIndex={isSelectable ? 0 : undefined}
                aria-label={
                  isSelectable ? `Select space ${space.id}` : undefined
                }
              >
                {isSelectable && (
                  <polygon
                    points={buildTileGeometry(pos).points({
                      inset: hexSize * 0.05,
                    })}
                    fill="rgba(255,255,255,0.001)"
                    pointerEvents="all"
                  />
                )}
                {renderInteractiveSpace
                  ? renderInteractiveSpace(space, state)
                  : null}
              </g>
            );
          })}
        </g>
      )}

      {/* Edges layer (for roads) */}
      {resolvedEdges.length > 0 && (
        <g className="edges" role="list" aria-label="Hex edges">
          {resolvedEdgePositions.map(({ edge, interactiveEdge }) => {
            return (
              <g key={edge.id} role="listitem">
                {renderEdge(edge, interactiveEdge.position)}
              </g>
            );
          })}
        </g>
      )}

      {/* Vertices layer (for settlements) */}
      {resolvedVertices.length > 0 && (
        <g className="vertices" role="list" aria-label="Hex vertices">
          {resolvedVertexPositions.map(({ vertex, interactiveVertex }) => {
            return (
              <g key={vertex.id} role="listitem">
                {renderVertex(vertex, interactiveVertex.position)}
              </g>
            );
          })}
        </g>
      )}

      {/* Interactive edges layer (for road placement) */}
      {interactiveEdges && resolvedEdgePositions.length > 0 && (
        <g
          className="interactive-edges"
          role="list"
          aria-label="Interactive edges for placement"
        >
          {resolvedEdgePositions.map(({ interactiveEdge: edge }) => {
            const state = interactiveTargetRenderState(
              interactiveEdges,
              edge.id,
              hoveredEdgeId === edge.id,
            );
            const isSelectable = isInteractiveTargetSelectable(
              interactiveEdges,
              state,
            );
            const touchTargetLength = Math.hypot(
              edge.position.x2 - edge.position.x1,
              edge.position.y2 - edge.position.y1,
            );
            return (
              <g
                key={edge.id}
                role={isSelectable ? "button" : undefined}
                className={clsx(isSelectable && "cursor-pointer")}
                onPointerEnter={() => setHoveredEdgeId(edge.id)}
                onPointerLeave={() =>
                  setHoveredEdgeId((currentId) =>
                    currentId === edge.id ? null : currentId,
                  )
                }
                onClick={
                  isSelectable
                    ? () => {
                        void state.select?.();
                      }
                    : undefined
                }
                onKeyDown={(event) =>
                  handleKeyboardActivation(
                    event,
                    isSelectable
                      ? () => {
                          void state.select?.();
                        }
                      : undefined,
                  )
                }
                tabIndex={isSelectable ? 0 : undefined}
                aria-label={isSelectable ? `Select edge ${edge.id}` : undefined}
              >
                {isSelectable && (
                  <rect
                    x={edge.position.midX - touchTargetLength / 2}
                    y={edge.position.midY - interactiveEdgeSize}
                    width={touchTargetLength}
                    height={interactiveEdgeSize * 2}
                    rx={interactiveEdgeSize}
                    fill="rgba(255,255,255,0.001)"
                    transform={`rotate(${edge.position.edgeAngle} ${edge.position.midX} ${edge.position.midY})`}
                    pointerEvents="all"
                  />
                )}
                {renderInteractiveEdge ? (
                  renderInteractiveEdge(edge, edge.position, state)
                ) : state.isEnabled && state.isEligible ? (
                  <DefaultInteractiveEdge
                    position={edge.position}
                    isHovered={state.isHovered}
                    strokeWidth={interactiveEdgeSize * 0.6}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      )}

      {/* Interactive vertices layer (for settlement placement) */}
      {interactiveVertices && resolvedVertexPositions.length > 0 && (
        <g
          className="interactive-vertices"
          role="list"
          aria-label="Interactive vertices for placement"
        >
          {resolvedVertexPositions.map(({ interactiveVertex: vertex }) => {
            const state = interactiveTargetRenderState(
              interactiveVertices,
              vertex.id,
              hoveredVertexId === vertex.id,
            );
            const isSelectable = isInteractiveTargetSelectable(
              interactiveVertices,
              state,
            );
            return (
              <g
                key={vertex.id}
                role={isSelectable ? "button" : undefined}
                className={clsx(isSelectable && "cursor-pointer")}
                onPointerEnter={() => setHoveredVertexId(vertex.id)}
                onPointerLeave={() =>
                  setHoveredVertexId((currentId) =>
                    currentId === vertex.id ? null : currentId,
                  )
                }
                onClick={
                  isSelectable
                    ? () => {
                        void state.select?.();
                      }
                    : undefined
                }
                onKeyDown={(event) =>
                  handleKeyboardActivation(
                    event,
                    isSelectable
                      ? () => {
                          void state.select?.();
                        }
                      : undefined,
                  )
                }
                tabIndex={isSelectable ? 0 : undefined}
                aria-label={
                  isSelectable ? `Select vertex ${vertex.id}` : undefined
                }
              >
                {isSelectable && (
                  <circle
                    cx={vertex.position.x}
                    cy={vertex.position.y}
                    r={interactiveVertexSize * 1.5}
                    fill="rgba(255,255,255,0.001)"
                    pointerEvents="all"
                  />
                )}
                {renderInteractiveVertex ? (
                  renderInteractiveVertex(vertex, vertex.position, state)
                ) : state.isEnabled && state.isEligible ? (
                  <DefaultInteractiveVertex
                    position={vertex.position}
                    isHovered={state.isHovered}
                    size={interactiveVertexSize * 0.6}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      )}

      {/* Zoom indicator (for mobile) */}
      {effectivePanZoom && transform.zoom !== 1 && (
        <g
          transform={`translate(${viewBoxX + 10}, ${viewBoxY + viewBoxHeight - 30})`}
        >
          <rect
            x={0}
            y={0}
            width={60}
            height={20}
            rx={4}
            fill="rgba(0,0,0,0.6)"
          />
          <text x={30} y={14} textAnchor="middle" fill="white" fontSize={12}>
            {Math.round(transform.zoom * 100)}%
          </text>
        </g>
      )}
    </svg>
  );
}

export const HexGrid = HexGridImpl as HexGridComponent;
