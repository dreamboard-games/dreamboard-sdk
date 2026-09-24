import "./tokens.css";
import type { ComponentProps, ReactNode } from "react";
export type PileProps = Omit<ComponentProps<"figure">, "children"> & {
  count: number;
  label: string;
  children?: ReactNode;
};
export function Pile({
  count,
  label,
  children,
  className = "",
  ...props
}: PileProps) {
  return (
    <figure {...props} className={`db-pile ${className}`}>
      <div className="db-pile-top" data-empty={count === 0 || undefined}>
        {count === 0 ? <span>Empty</span> : children}
      </div>
      <figcaption>
        {label} <strong>{count}</strong>
      </figcaption>
    </figure>
  );
}
