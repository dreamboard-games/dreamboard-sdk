/**
 * Minimally-styled primary action button.
 *
 * Visual styling now flows through {@link buttonStyle}: the background,
 * border, foreground, radius, typography and elevation all derive from
 * the active {@link useTheme}'s `intent.primary` slot. Override the
 * variant when a non-primary call site needs a different emphasis (the
 * underlying `<DefaultInteractionButton>` is the canonical button for
 * interaction-bound submission).
 */

import type { ButtonHTMLAttributes } from "react";
import type { ButtonSize, ButtonVariant } from "../theme/derive.js";
import type { InteractionVisualState } from "../types/visual-state.js";
import { ThemedButton } from "./ThemedButton.js";

export interface PrimaryButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    InteractionVisualState {
  /** Intent slot — defaults to `primary`. */
  variant?: ButtonVariant;
  /** Sizing token — defaults to `md`. */
  size?: ButtonSize;
}

export function PrimaryButton({
  children,
  disabled,
  style,
  variant = "primary",
  size = "md",
  ...rest
}: PrimaryButtonProps) {
  return (
    <ThemedButton
      type="button"
      disabled={disabled}
      variant={variant}
      size={size}
      style={style}
      {...rest}
    >
      {children}
    </ThemedButton>
  );
}
