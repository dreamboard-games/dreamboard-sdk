import "./tokens.css";
import type { ComponentProps } from "react";

export type CardProps = ComponentProps<"div"> & {
  state?: "idle" | "eligible" | "selected" | "invalid";
};
/** A visual card face. Compose inside a button when the card is actionable. */
export function Card({ state = "idle", className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      data-card-state={state}
      className={`db-card ${className}`}
    />
  );
}
export function CardBack({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      role="img"
      aria-label="Face-down card"
      {...props}
      className={`db-card db-card-back ${className}`}
    />
  );
}
