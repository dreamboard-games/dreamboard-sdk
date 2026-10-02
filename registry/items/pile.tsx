import "./tokens.css";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
export type PileProps = Omit<ComponentProps<"figure">, "children"> & {
  count: number;
  label: string;
  /** The top card. */
  children?: ReactNode;
};
/** A stack of cards: edges below the top card grow with the count, an outline when empty. */
export function Pile({
  count,
  label,
  children,
  className = "",
  ...props
}: PileProps) {
  // One edge per six cards, up to four.
  const depth = Math.min(4, Math.ceil(count / 6));
  return (
    <figure
      {...props}
      data-empty={count === 0 || undefined}
      className={`db-pile ${className}`}
      style={{ "--depth": depth, ...props.style } as CSSProperties}
    >
      <div className="db-pile-stack">
        {Array.from({ length: depth }, (_, index) => (
          <span
            key={index}
            className="db-pile-edge"
            style={{ "--edge": depth - index } as CSSProperties}
          />
        ))}
        {count > 0 && children}
        {count > 0 && (
          <span className="db-pile-count" aria-hidden="true">
            {count}
          </span>
        )}
      </div>
      <figcaption>
        {label}
        <span className="sr-only">
          {count === 0 ? "empty" : `${count} ${count === 1 ? "card" : "cards"}`}
        </span>
      </figcaption>
    </figure>
  );
}
