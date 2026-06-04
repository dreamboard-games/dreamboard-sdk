/**
 * SVG-based area control visualization for territory games (Risk, Small World, Diplomacy).
 */

import { useMemo, type ReactNode } from "react";
import { clsx } from "clsx";
import { usePanZoom } from "../../hooks/usePanZoom.js";
import { handleKeyboardActivation } from "./interaction-accessibility.js";

export interface ZoneShape {
  type: "polygon" | "path" | "circle";
  points?: Array<{ x: number; y: number }>;
  /** SVG path data */
  path?: string;
  center?: { x: number; y: number };
  radius?: number;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  adjacentTo: string[];
  shape?: ZoneShape;
  value?: number;
  type?: string;
  data?: Record<string, unknown>;
}

export interface ZonePiece {
  id: string;
  zoneId: string;
  type: string;
  owner?: string;
  /** Count for stackable pieces (armies) */
  count?: number;
  data?: Record<string, unknown>;
}

export interface ZoneMapProps {
  zones: ZoneDefinition[];
  pieces: ZonePiece[];
  renderZone: (zone: ZoneDefinition, pieces: ZonePiece[]) => ReactNode;
  backgroundImage?: string;
  width?: number | string;
  height?: number | string;
  enablePanZoom?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

export type ZoneHighlightType =
  | "valid"
  | "selected"
  | "attack"
  | "defend"
  | "neutral";

// Highlight colors by type
const HIGHLIGHT_COLORS: Record<ZoneHighlightType, string> = {
  valid: "rgba(34, 197, 94, 0.4)", // Green
  selected: "rgba(59, 130, 246, 0.4)", // Blue
  attack: "rgba(239, 68, 68, 0.4)", // Red
  defend: "rgba(234, 179, 8, 0.4)", // Yellow
  neutral: "rgba(148, 163, 184, 0.4)", // Slate
};

const HIGHLIGHT_STROKES: Record<ZoneHighlightType, string> = {
  valid: "#22c55e",
  selected: "#3b82f6",
  attack: "#ef4444",
  defend: "#eab308",
  neutral: "#94a3b8",
};

const EMPTY_PLAYER_COLORS: Record<string, string> = {};

export interface DefaultZoneProps {
  zone: ZoneDefinition;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  isHighlighted?: boolean;
  highlightType?: ZoneHighlightType;
  isSelected?: boolean;
  showLabel?: boolean;
  showValue?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  className?: string;
  children?: ReactNode;
}
export function DefaultZone({
  zone,
  fill = "rgba(100, 116, 139, 0.2)",
  stroke = "#475569",
  strokeWidth = 1,
  isHighlighted = false,
  highlightType,
  isSelected = false,
  showLabel = true,
  showValue = false,
  onClick,
  onHover,
  className,
  children,
}: DefaultZoneProps) {
  // Calculate colors based on state
  let computedFill = fill;
  let computedStroke = stroke;
  let computedStrokeWidth = strokeWidth;

  if (isHighlighted && highlightType && HIGHLIGHT_COLORS[highlightType]) {
    computedFill = HIGHLIGHT_COLORS[highlightType];
    computedStroke = HIGHLIGHT_STROKES[highlightType];
    computedStrokeWidth = 3;
  } else if (isSelected) {
    computedFill = HIGHLIGHT_COLORS.selected;
    computedStroke = HIGHLIGHT_STROKES.selected;
    computedStrokeWidth = 3;
  }

  // Render zone shape
  const renderShape = () => {
    if (!zone.shape) return null;

    switch (zone.shape.type) {
      case "polygon":
        if (!zone.shape.points) return null;
        return (
          <polygon
            points={zone.shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={computedFill}
            stroke={computedStroke}
            strokeWidth={computedStrokeWidth}
          />
        );

      case "path":
        if (!zone.shape.path) return null;
        return (
          <path
            d={zone.shape.path}
            fill={computedFill}
            stroke={computedStroke}
            strokeWidth={computedStrokeWidth}
          />
        );

      case "circle":
        if (!zone.shape.center) return null;
        return (
          <circle
            cx={zone.shape.center.x}
            cy={zone.shape.center.y}
            r={zone.shape.radius || 30}
            fill={computedFill}
            stroke={computedStroke}
            strokeWidth={computedStrokeWidth}
          />
        );

      default:
        return null;
    }
  };

  return (
    <g
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(onClick && "cursor-pointer", className)}
      role={onClick ? "button" : "listitem"}
      aria-label={zone.name}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Zone shape */}
      {renderShape()}

      {/* Zone label */}
      {showLabel && zone.shape?.center && (
        <text
          x={zone.shape.center.x}
          y={zone.shape.center.y - (showValue ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight="bold"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
        >
          {zone.name}
        </text>
      )}

      {/* Zone value */}
      {showValue && zone.value !== undefined && zone.shape?.center && (
        <text
          x={zone.shape.center.x}
          y={zone.shape.center.y + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fbbf24"
          fontSize={10}
          fontWeight="bold"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
        >
          +{zone.value}
        </text>
      )}

      {/* Children (pieces) */}
      {children}
    </g>
  );
}

export interface DefaultZonePiecesProps {
  pieces: ZonePiece[];
  zone: ZoneDefinition;
  playerColors?: Record<string, string>;
  radius?: number;
  spacing?: number;
  yOffset?: number;
  className?: string;
}
export function DefaultZonePieces({
  pieces,
  zone,
  playerColors = EMPTY_PLAYER_COLORS,
  radius = 14,
  spacing = 25,
  yOffset = 20,
  className,
}: DefaultZonePiecesProps) {
  if (pieces.length === 0 || !zone.shape?.center) return null;

  const centerX = zone.shape.center.x;
  const centerY = zone.shape.center.y;

  // Group pieces by owner
  const piecesByOwner: Record<string, ZonePiece[]> = {};
  pieces.forEach((p) => {
    const owner = p.owner || "neutral";
    const existing = piecesByOwner[owner];
    if (existing) {
      existing.push(p);
    } else {
      piecesByOwner[owner] = [p];
    }
  });

  const owners = Object.keys(piecesByOwner);
  const startOffset = -((owners.length - 1) * spacing) / 2;

  return (
    <g className={clsx("zone-pieces", className)}>
      {owners.map((owner, i) => {
        const ownerPieces = piecesByOwner[owner] || [];
        const totalCount = ownerPieces.reduce(
          (sum, p) => sum + (p.count || 1),
          0,
        );
        const offsetX = startOffset + i * spacing;

        return (
          <g
            key={owner}
            transform={`translate(${centerX + offsetX}, ${centerY + yOffset})`}
          >
            {/* Piece circle */}
            <circle
              r={radius}
              fill={playerColors[owner] || "#64748b"}
              stroke="white"
              strokeWidth={2}
            />
            {/* Count */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={10}
              fontWeight="bold"
            >
              {totalCount}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export interface DefaultZonePieceProps {
  piece: ZonePiece;
  x?: number;
  y?: number;
  radius?: number;
  color?: string;
  onClick?: () => void;
  className?: string;
}
export function DefaultZonePiece({
  piece,
  x = 0,
  y = 0,
  radius = 14,
  color = "#64748b",
  onClick,
  className,
}: DefaultZonePieceProps) {
  const count = piece.count || 1;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(event) =>
        handleKeyboardActivation(event, onClick, { stopPropagation: true })
      }
      className={clsx(onClick && "cursor-pointer", className)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Piece ${piece.id}`}
    >
      <circle r={radius} fill={color} stroke="white" strokeWidth={2} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={10}
        fontWeight="bold"
      >
        {count}
      </text>
    </g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ZoneMap({
  zones,
  pieces,
  renderZone,
  backgroundImage,
  width = 800,
  height = 600,
  enablePanZoom = false,
  initialZoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
  className,
}: ZoneMapProps) {
  // Use the unified pan/zoom hook
  const { transform, bind, isDragging } = usePanZoom({
    enabled: enablePanZoom,
    initialZoom,
    minZoom,
    maxZoom,
    mode: "viewbox",
  });

  // Group pieces by zone
  const piecesByZone = useMemo(() => {
    const map: Record<string, ZonePiece[]> = {};
    pieces.forEach((p) => {
      const existing = map[p.zoneId];
      if (existing) {
        existing.push(p);
      } else {
        map[p.zoneId] = [p];
      }
    });
    return map;
  }, [pieces]);

  // Calculate viewBox dimensions
  const baseWidth = typeof width === "number" ? width : 800;
  const baseHeight = typeof height === "number" ? height : 600;
  const viewBoxWidth = baseWidth / transform.zoom;
  const viewBoxHeight = baseHeight / transform.zoom;
  const viewBoxX = (baseWidth - viewBoxWidth) / 2 - transform.pan.x;
  const viewBoxY = (baseHeight - viewBoxHeight) / 2 - transform.pan.y;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
      className={clsx(
        "overflow-visible",
        enablePanZoom && "touch-none",
        isDragging && "cursor-grabbing",
        enablePanZoom && !isDragging && "cursor-grab",
        className,
      )}
      {...bind()}
      role="img"
      aria-label="Zone map"
    >
      {/* Background image */}
      {backgroundImage && (
        <image href={backgroundImage} width={width} height={height} />
      )}

      {/* Zones */}
      <g className="zones" role="list" aria-label="Map zones">
        {zones.map((zone) => {
          const zonePieces = piecesByZone[zone.id] || [];
          return <g key={zone.id}>{renderZone(zone, zonePieces)}</g>;
        })}
      </g>

      {/* Zoom indicator */}
      {enablePanZoom && transform.zoom !== 1 && (
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
