/**
 * SVG-based network/graph visualization for route-building games
 * (Ticket to Ride, Pandemic, Power Grid, Brass).
 */

import { useMemo, type ReactNode } from "react";
import { clsx } from "clsx";
import { usePanZoom, calculateViewBox } from "../../hooks/usePanZoom.js";
import { handleKeyboardActivation } from "./interaction-accessibility.js";

// ============================================================================
// Types
// ============================================================================

export interface NetworkNode {
  id: string;
  label?: string;
  position: { x: number; y: number };
  type?: string;
  data?: Record<string, unknown>;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  label?: string | number;
  owner?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface NetworkPiece {
  id: string;
  nodeId: string;
  owner?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  pieces: NetworkPiece[];
  /** Receives node centered at its position */
  renderNode: (node: NetworkNode, pieces: NetworkPiece[]) => ReactNode;
  renderEdge: (
    edge: NetworkEdge,
    fromNode: NetworkNode,
    toNode: NetworkNode,
  ) => ReactNode;
  renderPiece: (
    piece: NetworkPiece,
    position: { x: number; y: number },
  ) => ReactNode;
  width?: number | string;
  height?: number | string;
  nodeRadius?: number;
  enablePanZoom?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  padding?: number;
  className?: string;
}

const EMPTY_NETWORK_EDGES: NetworkEdge[] = [];
const EMPTY_NETWORK_PIECES: NetworkPiece[] = [];

// ============================================================================
// Pre-built Helper Components
// ============================================================================

export interface DefaultNetworkNodeProps {
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  label?: string;
  maxLabelLength?: number;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}

/** Pre-built network node for use in `renderNode`. */
export function DefaultNetworkNode({
  radius = 20,
  fill = "#1e293b",
  stroke = "#475569",
  strokeWidth = 2,
  isSelected = false,
  isHighlighted = false,
  label,
  maxLabelLength = 6,
  onClick,
  onPointerEnter,
  onPointerLeave,
  className,
}: DefaultNetworkNodeProps) {
  const effectiveFill = isSelected
    ? "#3b82f6"
    : isHighlighted
      ? "#22c55e"
      : fill;

  const effectiveStroke = isSelected
    ? "#60a5fa"
    : isHighlighted
      ? "#4ade80"
      : stroke;

  const effectiveStrokeWidth = isSelected || isHighlighted ? 3 : strokeWidth;

  const displayLabel = label
    ? label.length > maxLabelLength
      ? label.slice(0, maxLabelLength - 1) + "…"
      : label
    : undefined;

  return (
    <g
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-all duration-150",
        onClick && "cursor-pointer",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (label ?? "Network node") : undefined}
    >
      <circle
        r={radius}
        fill={effectiveFill}
        stroke={effectiveStroke}
        strokeWidth={effectiveStrokeWidth}
      />
      {displayLabel && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={10}
          fontWeight="bold"
        >
          {displayLabel}
        </text>
      )}
    </g>
  );
}

export interface DefaultNetworkEdgeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
  strokeWidth?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  /** Displayed at midpoint */
  label?: string | number;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}

/** Pre-built network edge for use in `renderEdge`. */
export function DefaultNetworkEdge({
  from,
  to,
  color = "#64748b",
  strokeWidth = 3,
  isSelected = false,
  isHighlighted = false,
  label,
  onClick,
  onPointerEnter,
  onPointerLeave,
  className,
}: DefaultNetworkEdgeProps) {
  const effectiveColor = isSelected
    ? "#3b82f6"
    : isHighlighted
      ? "#22c55e"
      : color;

  const effectiveWidth =
    isSelected || isHighlighted ? strokeWidth + 2 : strokeWidth;

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  return (
    <g
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-all duration-150",
        onClick && "cursor-pointer",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={
        onClick
          ? label !== undefined
            ? `Network edge ${label}`
            : "Network edge"
          : undefined
      }
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={effectiveColor}
        strokeWidth={effectiveWidth}
        strokeLinecap="round"
      />
      {label !== undefined && (
        <>
          <circle
            cx={midX}
            cy={midY}
            r={12}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={1}
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={10}
            fontWeight="bold"
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}

export interface DefaultNetworkPieceProps {
  color?: string;
  radius?: number;
  shape?: "circle" | "square";
  onClick?: () => void;
  className?: string;
}
export function DefaultNetworkPiece({
  color = "#f59e0b",
  radius = 6,
  shape = "circle",
  onClick,
  className,
}: DefaultNetworkPieceProps) {
  return (
    <g
      onClick={onClick}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(onClick && "cursor-pointer", className)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Network piece" : undefined}
    >
      {shape === "square" ? (
        <rect
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          fill={color}
          stroke="white"
          strokeWidth={1.5}
        />
      ) : (
        <circle r={radius} fill={color} stroke="white" strokeWidth={1.5} />
      )}
    </g>
  );
}

// ============================================================================
// Component
// ============================================================================

export function NetworkGraph({
  nodes,
  edges = EMPTY_NETWORK_EDGES,
  pieces = EMPTY_NETWORK_PIECES,
  renderNode,
  renderEdge,
  renderPiece,
  width = 800,
  height = 600,
  nodeRadius = 20,
  enablePanZoom = false,
  initialZoom = 1,
  minZoom = 0.5,
  maxZoom = 3,
  padding = 40,
  className,
}: NetworkGraphProps) {
  // Use the unified pan/zoom hook
  const { transform, bind, isDragging } = usePanZoom({
    enabled: enablePanZoom,
    initialZoom,
    minZoom,
    maxZoom,
    mode: "viewbox",
  });

  // Group pieces by node
  const piecesByNode = useMemo(() => {
    const map: Record<string, NetworkPiece[]> = {};
    pieces.forEach((p) => {
      const nodeId = p.nodeId;
      const existing = map[nodeId];
      if (existing) {
        existing.push(p);
      } else {
        map[nodeId] = [p];
      }
    });
    return map;
  }, [pieces]);

  // Create node lookup map
  const nodeMap = useMemo(() => {
    return Object.fromEntries(nodes.map((n) => [n.id, n]));
  }, [nodes]);

  // Calculate bounds for viewBox
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, width: 400, height: 300 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x - nodeRadius);
      minY = Math.min(minY, node.position.y - nodeRadius);
      maxX = Math.max(maxX, node.position.x + nodeRadius);
      maxY = Math.max(maxY, node.position.y + nodeRadius);
    });

    return {
      minX: minX - padding,
      minY: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [nodes, nodeRadius, padding]);

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
        "overflow-visible",
        enablePanZoom && "touch-none",
        isDragging && "cursor-grabbing",
        enablePanZoom && !isDragging && "cursor-grab",
        className,
      )}
      {...bind()}
      role="img"
      aria-label="Network graph"
    >
      {/* Render edges first (below nodes) */}
      <g className="network-edges" role="list" aria-label="Network connections">
        {edges.map((edge) => {
          const fromNode = nodeMap[edge.from];
          const toNode = nodeMap[edge.to];
          if (!fromNode || !toNode) return null;

          return (
            <g
              key={edge.id}
              role="listitem"
              aria-label={`Edge from ${fromNode.label ?? fromNode.id} to ${toNode.label ?? toNode.id}`}
            >
              {renderEdge(edge, fromNode, toNode)}
            </g>
          );
        })}
      </g>

      {/* Render nodes */}
      <g className="network-nodes" role="list" aria-label="Network nodes">
        {nodes.map((node) => {
          const nodePieces = piecesByNode[node.id] ?? [];

          return (
            <g
              key={node.id}
              transform={`translate(${node.position.x}, ${node.position.y})`}
              role="listitem"
              aria-label={node.label ?? node.id}
            >
              {renderNode(node, nodePieces)}

              {/* Render pieces around the node */}
              {nodePieces.length > 0 && (
                <g className="node-pieces">
                  {nodePieces.map((piece, i) => {
                    const angle =
                      (i / nodePieces.length) * 2 * Math.PI - Math.PI / 2;
                    const pieceX = Math.cos(angle) * (nodeRadius + 8);
                    const pieceY = Math.sin(angle) * (nodeRadius + 8);

                    return (
                      <g
                        key={piece.id}
                        transform={`translate(${pieceX}, ${pieceY})`}
                      >
                        {renderPiece(piece, { x: pieceX, y: pieceY })}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
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
