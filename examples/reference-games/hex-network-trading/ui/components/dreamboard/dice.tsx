import "./tokens.css";
import type { ComponentProps } from "react";
export type DieDisplay = { id: string; value: string | number; label: string };
export type DiceProps = ComponentProps<"ul"> & { dice: readonly DieDisplay[] };
/** Displays supplied results; rolling and animation belong to the caller. */
export function Dice({ dice, className = "", ...props }: DiceProps) {
  return (
    <ul aria-label="Dice results" {...props} className={`db-dice ${className}`}>
      {dice.map((die) => (
        <li key={die.id} aria-label={`${die.label}: ${die.value}`}>
          <span aria-hidden="true">{die.value}</span>
        </li>
      ))}
    </ul>
  );
}
