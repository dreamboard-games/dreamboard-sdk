import { useDropArea, useGame } from "@game";
import type { ComponentProps, CSSProperties } from "react";
import "./tokens.css";
export type DropAreaBinding = Parameters<typeof useDropArea>[0];
export type DropAreaProps = ComponentProps<"section"> & {
  /** A board target, or the interaction a dropped card runs, such as `{ interaction: "play.discard" }`. */
  binding: DropAreaBinding;
  label: string;
} & (
    | NonNullable<Parameters<typeof useDropArea>[1]>
    | { zone?: never; visibility?: never; index?: never }
  );
/**
 * Where a dragged card can land. It outlines itself while it can take the
 * card, and fills while the card is over it; a pile inside counts the cards
 * that would land on it.
 */
export function DropArea({
  binding,
  label,
  className = "",
  zone,
  visibility,
  index,
  ...props
}: DropAreaProps) {
  const area = useDropArea(
    binding,
    zone ? { zone, visibility, index } : undefined,
  );
  const incoming = useGame((game) => game.drag.active?.cardIds.length ?? 0);
  return (
    <section
      {...props}
      {...area.props}
      aria-label={label}
      className={`db-drop-area ${className}`}
      style={
        {
          ...props.style,
          "--drop-incoming": area.isOver ? incoming : 0,
        } as CSSProperties
      }
    />
  );
}
