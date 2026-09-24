import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
/** Geometry is supplied by the board owner; this component never infers adjacency. */
export type HexTile = {
  id: string;
  points: string;
  fill?: string;
  label?: string;
  center: { x: number; y: number };
};
export type HexGridProps = Omit<ComponentProps<"svg">, "children"> & {
  label: string;
  tiles: readonly HexTile[];
  children?: ReactNode;
};
export function HexGrid({
  label,
  tiles,
  children,
  className = "",
  ...props
}: HexGridProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      {...props}
      className={`db-grid ${className}`}
    >
      {tiles.map((tile) => (
        <g key={tile.id} data-space-id={tile.id}>
          <polygon
            className="db-grid-cell"
            points={tile.points}
            fill={tile.fill ?? "var(--muted)"}
          />
          {tile.label && (
            <text
              className="db-grid-label"
              x={tile.center.x}
              y={tile.center.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {tile.label}
            </text>
          )}
        </g>
      ))}
      {children}
    </svg>
  );
}
