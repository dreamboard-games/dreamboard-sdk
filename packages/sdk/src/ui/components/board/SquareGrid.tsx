/**
 * SVG-based square grid for grid-based games (Chess, Checkers, Go, Scrabble, Battleship).
 * All rendering controlled by parent via required render functions.
 */

import { useMemo, type ReactNode } from "react";
import { clsx } from "clsx";
import { handleKeyboardActivation } from "./interaction-accessibility.js";
import {
  GridZoomIndicator,
  useGridSvgFrame,
} from "./tiled-grid/use-grid-svg-frame.js";
import { InteractiveTargetLayerGroup } from "./tiled-grid/interactive-layer.js";
import { resolveBoardProp } from "./tiled-grid/resolve-board-prop.js";
import type {
  InteractiveTargetLayer,
  InteractiveTargetRenderState,
} from "./target-layer.js";
import type { SquarePieceState } from "../../types/player-state.js";
import {
  type AuthoredSquareBoardInput,
  type AnySquareBoardInput,
  type GeneratedSquareBoardInput,
  type NormalizedSquareBoard,
  type NormalizedSquareCellOf,
  type NormalizedSquareEdgeOf,
  type NormalizedSquarePieceOf,
  type NormalizedSquareVertexOf,
  normalizeSquareBoardInput,
} from "../../types/tiled-board.js";

export type {
  InteractiveTargetLayer,
  InteractiveTargetRenderState,
} from "./target-layer.js";

// ============================================================================
// Types
// ============================================================================

interface SquareCellWithId {
  id: string;
  row: number;
  col: number;
}

export interface SquareEdgePosition {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  angle: number;
}

export interface SquareVertexPosition {
  x: number;
  y: number;
}

export interface InteractiveSquareEdge<
  TBoard extends AnySquareBoardInput = AnySquareBoardInput,
> extends NormalizedSquareEdgeOf<TBoard> {
  position: SquareEdgePosition;
}

export interface InteractiveSquareVertex<
  TBoard extends AnySquareBoardInput = AnySquareBoardInput,
> extends NormalizedSquareVertexOf<TBoard> {
  position: SquareVertexPosition;
}

export type InteractiveSquareSpace<
  TBoard extends AnySquareBoardInput = AnySquareBoardInput,
> = NormalizedSquareCellOf<TBoard>;

interface SquareGeneratedGridInputProps {
  id?: string;
  layout?: "square";
  spaces: Extract<AnySquareBoardInput, { spaces: unknown }>["spaces"];
  pieces?: AnySquareBoardInput["pieces"];
  edges?: AnySquareBoardInput["edges"];
  vertices?: AnySquareBoardInput["vertices"];
}

interface SquareAuthoredGridInputProps {
  id?: string;
  layout?: "square";
  rows?: number;
  cols?: number;
  cells: Extract<AnySquareBoardInput, { cells: unknown }>["cells"];
  pieces?: readonly SquarePieceState[];
  edges?: AnySquareBoardInput["edges"];
  vertices?: AnySquareBoardInput["vertices"];
}

type SquareGridInputProps =
  | SquareGeneratedGridInputProps
  | SquareAuthoredGridInputProps;

type ResolvedSquareArrayProp<Value> =
  Exclude<Value, undefined> extends readonly unknown[]
    ? Exclude<Value, undefined>
    : readonly [];

type SquareBoardLikeOfProps<TProps extends SquareGridInputProps> =
  TProps extends {
    id?: infer Id;
    layout?: infer Layout;
    spaces: infer Spaces;
    pieces?: infer Pieces;
    edges?: infer Edges;
    vertices?: infer Vertices;
  }
    ? {
        id: Extract<Id, string> extends never ? string : Extract<Id, string>;
        layout?: Extract<Layout, "square">;
        spaces: Spaces;
        pieces: ResolvedSquareArrayProp<Pieces>;
        edges: ResolvedSquareArrayProp<Edges>;
        vertices: ResolvedSquareArrayProp<Vertices>;
      } & GeneratedSquareBoardInput
    : TProps extends {
          id?: infer Id;
          layout?: infer Layout;
          rows?: infer Rows;
          cols?: infer Cols;
          cells: infer Cells;
          pieces?: infer Pieces;
          edges?: infer Edges;
          vertices?: infer Vertices;
        }
      ? {
          id: Extract<Id, string> extends never ? string : Extract<Id, string>;
          layout?: Extract<Layout, "square">;
          rows: Extract<Rows, number> extends never
            ? number
            : Extract<Rows, number>;
          cols: Extract<Cols, number> extends never
            ? number
            : Extract<Cols, number>;
          cells: Cells;
          pieces: ResolvedSquareArrayProp<Pieces>;
          edges: ResolvedSquareArrayProp<Edges>;
          vertices: ResolvedSquareArrayProp<Vertices>;
        } & AuthoredSquareBoardInput
      : never;

export type SquareGridProps<
  TProps extends SquareGridInputProps = SquareGridInputProps,
> = TProps & {
  cellSize?: number;
  /** Receives row/col with transform centered at cell position */
  renderCell: (row: number, col: number) => ReactNode;
  /** Receives piece with transform centered at cell center */
  renderPiece: (
    piece: NormalizedSquarePieceOf<NoInfer<SquareBoardLikeOfProps<TProps>>>,
  ) => ReactNode;
  renderEdge?: (
    edge: NormalizedSquareEdgeOf<NoInfer<SquareBoardLikeOfProps<TProps>>>,
    position: SquareEdgePosition,
  ) => ReactNode;
  renderVertex?: (
    vertex: NormalizedSquareVertexOf<NoInfer<SquareBoardLikeOfProps<TProps>>>,
    position: SquareVertexPosition,
  ) => ReactNode;
  showCoordinates?: boolean;
  coordinateStyle?: "algebraic" | "numeric" | "none";
  width?: number | string;
  height?: number | string;
  enablePanZoom?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  interactiveSpaces?: InteractiveTargetLayer;
  interactiveEdges?: InteractiveTargetLayer;
  interactiveVertices?: InteractiveTargetLayer;
  renderInteractiveSpace?: (
    space: InteractiveSquareSpace<NoInfer<SquareBoardLikeOfProps<TProps>>>,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  renderInteractiveEdge?: (
    edge: InteractiveSquareEdge<NoInfer<SquareBoardLikeOfProps<TProps>>>,
    position: SquareEdgePosition,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  renderInteractiveVertex?: (
    vertex: InteractiveSquareVertex<NoInfer<SquareBoardLikeOfProps<TProps>>>,
    position: SquareVertexPosition,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
};

export interface SquareGridBoardProps<
  TBoard extends AnySquareBoardInput = AnySquareBoardInput,
> {
  board: TBoard;
  cellSize?: number;
  renderCell: (row: number, col: number) => ReactNode;
  renderPiece: (piece: NormalizedSquarePieceOf<NoInfer<TBoard>>) => ReactNode;
  renderEdge?: (
    edge: NormalizedSquareEdgeOf<NoInfer<TBoard>>,
    position: SquareEdgePosition,
  ) => ReactNode;
  renderVertex?: (
    vertex: NormalizedSquareVertexOf<NoInfer<TBoard>>,
    position: SquareVertexPosition,
  ) => ReactNode;
  showCoordinates?: boolean;
  coordinateStyle?: "algebraic" | "numeric" | "none";
  width?: number | string;
  height?: number | string;
  enablePanZoom?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
  interactiveSpaces?: InteractiveTargetLayer;
  interactiveEdges?: InteractiveTargetLayer;
  interactiveVertices?: InteractiveTargetLayer;
  renderInteractiveSpace?: (
    space: InteractiveSquareSpace<NoInfer<TBoard>>,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  renderInteractiveEdge?: (
    edge: InteractiveSquareEdge<NoInfer<TBoard>>,
    position: SquareEdgePosition,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
  renderInteractiveVertex?: (
    vertex: InteractiveSquareVertex<NoInfer<TBoard>>,
    position: SquareVertexPosition,
    state: InteractiveTargetRenderState,
  ) => ReactNode;
}

// ============================================================================
// Pre-built Helper Components
// ============================================================================

export interface DefaultGridCellProps {
  size: number;
  isLight?: boolean;
  lightColor?: string;
  darkColor?: string;
  isHighlighted?: boolean;
  highlightColor?: string;
  isSelected?: boolean;
  selectedColor?: string;
  isValidMove?: boolean;
  isCapture?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
}

/** Pre-built grid cell component for use in `renderCell`. */
export function DefaultGridCell({
  size,
  isLight = true,
  lightColor = "#f0d9b5",
  darkColor = "#b58863",
  isHighlighted = false,
  highlightColor = "rgba(250, 204, 21, 0.4)",
  isSelected = false,
  selectedColor = "rgba(59, 130, 246, 0.5)",
  isValidMove = false,
  isCapture = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
  className,
}: DefaultGridCellProps) {
  const baseColor = isLight ? lightColor : darkColor;

  return (
    <g
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-colors duration-100",
        onClick && "cursor-pointer",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Grid cell" : undefined}
    >
      {/* Base cell */}
      <rect width={size} height={size} fill={baseColor} />

      {/* Selected overlay */}
      {isSelected && (
        <rect
          width={size}
          height={size}
          fill={selectedColor}
          pointerEvents="none"
        />
      )}

      {/* Highlight overlay */}
      {isHighlighted && !isSelected && (
        <rect
          width={size}
          height={size}
          fill={highlightColor}
          pointerEvents="none"
        />
      )}

      {/* Valid move indicator (dot) */}
      {isValidMove && !isCapture && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.15}
          fill="rgba(34, 197, 94, 0.6)"
          pointerEvents="none"
        />
      )}

      {/* Capture indicator (ring) */}
      {isCapture && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.42}
          fill="none"
          stroke="rgba(239, 68, 68, 0.8)"
          strokeWidth={size * 0.08}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

export interface DefaultGridPieceProps {
  size: number;
  color?: string;
  strokeColor?: string;
  label?: string;
  isDragging?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  className?: string;
}

/** Pre-built grid piece component for use in `renderPiece`. */
export function DefaultGridPiece({
  size,
  color = "#94a3b8",
  strokeColor,
  label,
  isDragging = false,
  onClick,
  onPointerDown,
  className,
}: DefaultGridPieceProps) {
  const radius = size * 0.38;
  const effectiveStroke =
    strokeColor ??
    (color === "#f8fafc" || color === "#ffffff" ? "#1e293b" : "#f8fafc");

  return (
    <g
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        "transition-transform duration-150",
        (onClick || onPointerDown) && "cursor-pointer hover:scale-105",
        className,
      )}
      opacity={isDragging ? 0.8 : 1}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? (label ?? "Grid piece") : undefined}
    >
      <circle
        r={isDragging ? radius * 1.1 : radius}
        fill={color}
        stroke={effectiveStroke}
        strokeWidth={2}
        style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.4))" }}
      />
      {label && (
        <text
          y={4}
          textAnchor="middle"
          fill={effectiveStroke}
          fontSize={size * 0.35}
          fontWeight="bold"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export interface DefaultChessPieceProps {
  size: number;
  type: string;
  owner: "white" | "black";
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  className?: string;
}

const CHESS_SYMBOLS: Record<string, Record<string, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

/** Pre-built chess piece component using Unicode symbols. */
export function DefaultChessPiece({
  size,
  type,
  owner,
  onClick,
  onPointerDown,
  className,
}: DefaultChessPieceProps) {
  const symbol = CHESS_SYMBOLS[owner]?.[type] ?? "?";
  const textColor = owner === "white" ? "#f8fafc" : "#1e293b";
  const shadowFilter =
    owner === "white"
      ? "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))"
      : "drop-shadow(1px 1px 1px rgba(255,255,255,0.3))";

  return (
    <g
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={(event) => handleKeyboardActivation(event, onClick)}
      className={clsx(
        (onClick || onPointerDown) && "cursor-pointer",
        className,
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${owner} ${type}` : undefined}
    >
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.7}
        fill={textColor}
        style={{ filter: shadowFilter }}
      >
        {symbol}
      </text>
    </g>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert row/col to algebraic notation (a1, b2, etc.)
 */
export function toAlgebraic(
  row: number,
  col: number,
  totalRows: number,
): string {
  const file = String.fromCharCode(97 + col); // a, b, c, ...
  const rank = totalRows - row; // 8, 7, 6, ... (bottom to top)
  return `${file}${rank}`;
}

/**
 * Convert row/col to numeric notation (1,1, 2,3, etc.)
 */
export function toNumeric(row: number, col: number): string {
  return `${row + 1},${col + 1}`;
}

function getCellId(cell: { id: string }): string {
  return cell.id;
}

function edgePositionForCells(
  firstCell: { row: number; col: number },
  secondCell: { row: number; col: number },
  cellSize: number,
  labelMargin: number,
): SquareEdgePosition | null {
  if (
    Math.abs(firstCell.row - secondCell.row) +
      Math.abs(firstCell.col - secondCell.col) !==
    1
  ) {
    return null;
  }

  const minRow = Math.min(firstCell.row, secondCell.row);
  const minCol = Math.min(firstCell.col, secondCell.col);

  if (firstCell.row === secondCell.row) {
    const x = labelMargin + (minCol + 1) * cellSize;
    const y1 = minRow * cellSize;
    const y2 = y1 + cellSize;
    return {
      x1: x,
      y1,
      x2: x,
      y2,
      midX: x,
      midY: (y1 + y2) / 2,
      angle: 90,
    };
  }

  const y = (minRow + 1) * cellSize;
  const x1 = labelMargin + minCol * cellSize;
  const x2 = x1 + cellSize;
  return {
    x1,
    y1: y,
    x2,
    y2: y,
    midX: (x1 + x2) / 2,
    midY: y,
    angle: 0,
  };
}

function cornerKeysForCell(cell: {
  row: number;
  col: number;
}): Record<string, SquareVertexPosition> {
  return {
    [`${cell.col},${cell.row}`]: { x: cell.col, y: cell.row },
    [`${cell.col + 1},${cell.row}`]: { x: cell.col + 1, y: cell.row },
    [`${cell.col + 1},${cell.row + 1}`]: {
      x: cell.col + 1,
      y: cell.row + 1,
    },
    [`${cell.col},${cell.row + 1}`]: { x: cell.col, y: cell.row + 1 },
  };
}

function vertexPositionForCells(
  cells: readonly SquareCellWithId[],
  cellSize: number,
  labelMargin: number,
): SquareVertexPosition | null {
  if (cells.length === 0) {
    return null;
  }

  const candidateKeys = cells.map(
    (cell) => new Set(Object.keys(cornerKeysForCell(cell))),
  );
  const firstKeySet = candidateKeys[0];
  if (firstKeySet === undefined) {
    return null;
  }
  const sharedKeys = [...firstKeySet].filter((key) =>
    candidateKeys.every((keySet) => keySet.has(key)),
  );
  if (sharedKeys.length !== 1) {
    return null;
  }

  const sharedKey = sharedKeys[0];
  if (!sharedKey) {
    return null;
  }
  const [colToken, rowToken] = sharedKey.split(",");
  if (colToken === undefined || rowToken === undefined) {
    return null;
  }
  const col = Number(colToken);
  const row = Number(rowToken);
  if (!Number.isFinite(col) || !Number.isFinite(row)) {
    return null;
  }

  return {
    x: labelMargin + col * cellSize,
    y: row * cellSize,
  };
}

// ============================================================================
// Component
// ============================================================================

export interface SquareGridComponent {
  <const TBoard extends AnySquareBoardInput>(
    props: SquareGridBoardProps<TBoard>,
  ): ReactNode;
  <const TProps extends SquareGeneratedGridInputProps>(
    props: SquareGridProps<TProps>,
  ): ReactNode;
  <const TProps extends SquareAuthoredGridInputProps>(
    props: SquareGridProps<TProps>,
  ): ReactNode;
}

function SquareGridImpl(
  props:
    | SquareGridBoardProps<AnySquareBoardInput>
    | SquareGridProps<SquareGridInputProps>,
) {
  const {
    cellSize = 60,
    renderCell,
    renderPiece,
    renderEdge,
    renderVertex,
    showCoordinates = true,
    coordinateStyle = "algebraic",
    width,
    height,
    enablePanZoom = false,
    initialZoom = 1,
    minZoom = 0.5,
    maxZoom = 3,
    className,
    interactiveSpaces,
    interactiveEdges,
    interactiveVertices,
    renderInteractiveSpace,
    renderInteractiveEdge,
    renderInteractiveVertex,
  } = props;
  const board = resolveBoardProp<
    AnySquareBoardInput,
    SquareGridProps<SquareGridInputProps>
  >(
    props,
    (inlineProps) =>
      ("spaces" in inlineProps
        ? {
            id: "__square-grid__",
            spaces: inlineProps.spaces,
            pieces: inlineProps.pieces ?? [],
            edges: inlineProps.edges ?? [],
            vertices: inlineProps.vertices ?? [],
          }
        : {
            id: "__square-grid__",
            rows: inlineProps.rows ?? 0,
            cols: inlineProps.cols ?? 0,
            cells: inlineProps.cells,
            pieces: inlineProps.pieces ?? [],
            edges: inlineProps.edges ?? [],
            vertices: inlineProps.vertices ?? [],
          }) satisfies AnySquareBoardInput,
  );

  // Coordinate label margin
  const labelMargin = showCoordinates && coordinateStyle !== "none" ? 24 : 0;

  const normalizedBoard = useMemo<NormalizedSquareBoard<AnySquareBoardInput>>(
    () => normalizeSquareBoardInput(board),
    [board],
  );

  const rows = normalizedBoard.rows;
  const cols = normalizedBoard.cols;
  const resolvedEdges = normalizedBoard.edges as Array<
    NormalizedSquareEdgeOf<AnySquareBoardInput>
  >;
  const resolvedVertices = normalizedBoard.vertices as Array<
    NormalizedSquareVertexOf<AnySquareBoardInput>
  >;
  const resolvedPieces = normalizedBoard.pieces as Array<
    NormalizedSquarePieceOf<AnySquareBoardInput>
  >;

  // Calculate grid dimensions
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;
  const totalWidth = gridWidth + labelMargin;
  const totalHeight = gridHeight + labelMargin;

  const renderableCells = useMemo(() => {
    const result: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        result.push({ row, col });
      }
    }
    return result;
  }, [rows, cols]);

  const resolvedCells = useMemo<SquareCellWithId[]>(() => {
    if (normalizedBoard.cells.length > 0) {
      return normalizedBoard.cells.map((cell) => ({
        ...cell,
        id: getCellId(cell),
      }));
    }

    return renderableCells.map(({ row, col }) => ({
      id: `${row},${col}`,
      row,
      col,
    }));
  }, [normalizedBoard.cells, renderableCells]);

  const cellsById = useMemo(
    () => new Map(resolvedCells.map((cell) => [cell.id, cell] as const)),
    [resolvedCells],
  );

  const resolvedEdgePositions = useMemo(
    () =>
      resolvedEdges.flatMap((edge) => {
        if (edge.spaceIds.length < 2) {
          return [];
        }
        const firstCell = cellsById.get(edge.spaceIds[0] ?? "");
        const secondCell = cellsById.get(edge.spaceIds[1] ?? "");
        if (!firstCell || !secondCell) {
          return [];
        }
        const position = edgePositionForCells(
          firstCell,
          secondCell,
          cellSize,
          labelMargin,
        );
        return position
          ? [
              {
                edge,
                interactiveEdge: {
                  ...edge,
                  position,
                } as InteractiveSquareEdge<AnySquareBoardInput>,
              },
            ]
          : [];
      }),
    [cellSize, cellsById, resolvedEdges, labelMargin],
  );

  const resolvedVertexPositions = useMemo(
    () =>
      resolvedVertices.flatMap((vertex) => {
        const vertexCells = vertex.spaceIds.flatMap((spaceId) => {
          const cell = cellsById.get(spaceId);
          return cell ? [cell] : [];
        });
        const position = vertexPositionForCells(
          vertexCells,
          cellSize,
          labelMargin,
        );
        return position
          ? [
              {
                vertex,
                interactiveVertex: {
                  ...vertex,
                  position,
                } as InteractiveSquareVertex<AnySquareBoardInput>,
              },
            ]
          : [];
      }),
    [cellSize, cellsById, labelMargin, resolvedVertices],
  );

  // Determine SVG dimensions
  const svgWidth = width ?? totalWidth;
  const svgHeight = height ?? totalHeight;

  // Shared SVG frame: pan/zoom wiring, viewBox, and target hover state
  const {
    transform,
    bind,
    isDragging: isPanning,
    viewBox,
    viewBoxX,
    viewBoxY,
    viewBoxHeight,
    spaceHover,
    edgeHover,
    vertexHover,
  } = useGridSvgFrame({
    panZoomEnabled: enablePanZoom,
    initialZoom,
    minZoom,
    maxZoom,
    bounds: { minX: 0, minY: 0, width: totalWidth, height: totalHeight },
    viewBoxMode: "static-when-disabled",
  });

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={viewBox}
      className={clsx(
        "square-grid",
        enablePanZoom && "touch-none",
        isPanning && "cursor-grabbing",
        enablePanZoom && !isPanning && "cursor-grab",
        className,
      )}
      {...bind()}
      role="img"
      aria-label={`${rows}x${cols} game grid`}
    >
      <defs>
        {/* Drop shadow for pieces */}
        <filter id="pieceShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Cells layer */}
      <g className="cells" role="list" aria-label="Grid cells">
        {renderableCells.map(({ row, col }) => {
          const x = labelMargin + col * cellSize;
          const y = row * cellSize;

          return (
            <g
              key={`${row}-${col}`}
              transform={`translate(${x}, ${y})`}
              role="listitem"
              aria-label={
                coordinateStyle === "algebraic"
                  ? toAlgebraic(row, col, rows)
                  : toNumeric(row, col)
              }
            >
              {renderCell(row, col)}
            </g>
          );
        })}
      </g>

      {interactiveSpaces && (
        <InteractiveTargetLayerGroup
          layer={interactiveSpaces}
          targets={resolvedCells}
          getTargetId={(space) => space.id}
          targetKind="space"
          groupClassName="interactive-spaces"
          groupAriaLabel="Interactive spaces"
          browserAttributeOrder="after-transform"
          selectMode="layer-direct"
          hover={spaceHover}
          getTargetTransform={(space) =>
            `translate(${labelMargin + space.col * cellSize}, ${space.row * cellSize})`
          }
          renderTargetContent={(space, state, isSelectable) => (
            <>
              {isSelectable && (
                <rect
                  x={0}
                  y={0}
                  width={cellSize}
                  height={cellSize}
                  fill="rgba(255,255,255,0.001)"
                  pointerEvents="all"
                />
              )}
              {renderInteractiveSpace
                ? renderInteractiveSpace(space, state)
                : null}
            </>
          )}
        />
      )}

      {renderEdge && resolvedEdgePositions.length > 0 && (
        <g className="edges" aria-label="Board edges">
          {resolvedEdgePositions.map(({ edge, interactiveEdge }) => (
            <g key={edge.id}>{renderEdge(edge, interactiveEdge.position)}</g>
          ))}
        </g>
      )}

      {interactiveEdges && (
        <InteractiveTargetLayerGroup
          layer={interactiveEdges}
          targets={resolvedEdgePositions}
          getTargetId={({ interactiveEdge }) => interactiveEdge.id}
          targetKind="edge"
          groupClassName="interactive-edges"
          groupAriaLabel="Interactive edges"
          browserAttributeOrder="after-transform"
          selectMode="layer-direct"
          hover={edgeHover}
          renderTargetContent={({ interactiveEdge: edge }, state) =>
            renderInteractiveEdge ? (
              renderInteractiveEdge(edge, edge.position, state)
            ) : state.isEnabled && state.isEligible ? (
              <line
                x1={edge.position.x1}
                y1={edge.position.y1}
                x2={edge.position.x2}
                y2={edge.position.y2}
                stroke="rgba(255,255,255,0.001)"
                strokeWidth={Math.max(12, cellSize * 0.18)}
                pointerEvents="stroke"
              />
            ) : null
          }
        />
      )}

      {renderVertex && resolvedVertexPositions.length > 0 && (
        <g className="vertices" aria-label="Board vertices">
          {resolvedVertexPositions.map(({ vertex, interactiveVertex }) => (
            <g key={vertex.id}>
              {renderVertex(vertex, interactiveVertex.position)}
            </g>
          ))}
        </g>
      )}

      {interactiveVertices && (
        <InteractiveTargetLayerGroup
          layer={interactiveVertices}
          targets={resolvedVertexPositions}
          getTargetId={({ interactiveVertex }) => interactiveVertex.id}
          targetKind="vertex"
          groupClassName="interactive-vertices"
          groupAriaLabel="Interactive vertices"
          browserAttributeOrder="after-transform"
          selectMode="layer-direct"
          hover={vertexHover}
          renderTargetContent={({ interactiveVertex: vertex }, state) =>
            renderInteractiveVertex ? (
              renderInteractiveVertex(vertex, vertex.position, state)
            ) : state.isEnabled && state.isEligible ? (
              <circle
                cx={vertex.position.x}
                cy={vertex.position.y}
                r={Math.max(8, cellSize * 0.12)}
                fill="rgba(255,255,255,0.001)"
                pointerEvents="all"
              />
            ) : null
          }
        />
      )}

      {/* Coordinate labels */}
      {showCoordinates && coordinateStyle !== "none" && (
        <g className="coordinates" aria-hidden="true">
          {/* File labels (a-h) - bottom */}
          {Array.from({ length: cols }).map((_, col) => {
            const label =
              coordinateStyle === "algebraic"
                ? String.fromCharCode(97 + col)
                : String(col + 1);
            return (
              <text
                key={`file-${col}`}
                x={labelMargin + col * cellSize + cellSize / 2}
                y={gridHeight + 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize={12}
                fontWeight="500"
              >
                {label}
              </text>
            );
          })}
          {/* Rank labels (1-8) - left */}
          {Array.from({ length: rows }).map((_, row) => {
            const label =
              coordinateStyle === "algebraic"
                ? String(rows - row)
                : String(row + 1);
            return (
              <text
                key={`rank-${row}`}
                x={10}
                y={row * cellSize + cellSize / 2 + 4}
                textAnchor="middle"
                fill="#64748b"
                fontSize={12}
                fontWeight="500"
              >
                {label}
              </text>
            );
          })}
        </g>
      )}

      {/* Pieces layer */}
      <g className="pieces" role="list" aria-label="Game pieces">
        {resolvedPieces.map((piece) => {
          const x = labelMargin + piece.col * cellSize + cellSize / 2;
          const y = piece.row * cellSize + cellSize / 2;

          return (
            <g
              key={piece.id}
              transform={`translate(${x}, ${y})`}
              role="listitem"
              aria-label={`${piece.owner ?? ""} ${piece.typeId}`}
            >
              {renderPiece(piece)}
            </g>
          );
        })}
      </g>

      {/* Zoom indicator */}
      {enablePanZoom && transform.zoom !== 1 && (
        <GridZoomIndicator
          viewBoxX={viewBoxX}
          viewBoxY={viewBoxY}
          viewBoxHeight={viewBoxHeight}
          zoom={transform.zoom}
        />
      )}
    </svg>
  );
}

export const SquareGrid = SquareGridImpl as SquareGridComponent;
