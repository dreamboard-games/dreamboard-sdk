import { useDropArea } from "@game";
import type { ComponentProps } from "react";
import "./tokens.css";
export type DropAreaBinding = Parameters<typeof useDropArea>[0];
export type DropAreaProps = ComponentProps<"section"> & {
  /** A board target, or the interaction a dropped card runs, such as `{ interaction: "play.discard" }`. */
  binding: DropAreaBinding;
  label: string;
};
/** Where a dragged card can land. It outlines itself while it can take the card, and fills while the card is over it. */
export function DropArea({
  binding,
  label,
  className = "",
  ...props
}: DropAreaProps) {
  const area = useDropArea(binding);
  return (
    <section
      {...props}
      {...area.props}
      aria-label={label}
      className={`db-drop-area ${className}`}
    />
  );
}
