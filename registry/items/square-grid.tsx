import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type SquareCell = {
  id: string;
  x: number;
  y: number;
  fill?: string;
  label?: string;
};
export type SquareGridProps = Omit<ComponentProps<"svg">, "children"> & {
  label: string;
  cells: readonly SquareCell[];
  cellSize: number;
  children?: ReactNode;
};
export function SquareGrid({
  label,
  cells,
  cellSize,
  children,
  className = "",
  ...props
}: SquareGridProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      {...props}
      className={`db-grid ${className}`}
    >
      {cells.map((cell) => (
        <g key={cell.id} data-space-id={cell.id}>
          <rect
            className="db-grid-cell"
            x={cell.x}
            y={cell.y}
            width={cellSize}
            height={cellSize}
            fill={cell.fill ?? "var(--muted)"}
          />
          {cell.label && (
            <text
              className="db-grid-label"
              x={cell.x + cellSize / 2}
              y={cell.y + cellSize / 2}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {cell.label}
            </text>
          )}
        </g>
      ))}
      {children}
    </svg>
  );
}
