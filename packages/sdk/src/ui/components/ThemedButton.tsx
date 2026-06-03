import type { ComponentProps } from "react";
import { clsx } from "clsx";
import { Button as ShadcnButton } from "../internal/ui/button.js";
import {
  buttonStyle,
  type ButtonSize,
  type ButtonVariant,
} from "../theme/derive.js";
import { useTheme } from "../theme/ThemeProvider.js";
import {
  visualStateDataAttributes,
  type InteractionVisualState,
} from "../types/visual-state.js";

type ShadcnButtonProps = ComponentProps<typeof ShadcnButton>;

export interface ThemedButtonProps
  extends Omit<ShadcnButtonProps, "variant" | "size">, InteractionVisualState {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the pressed/active visual treatment without changing variant. */
  pressed?: boolean;
  /** Render the in-flight loading state and disable activation. */
  loading?: boolean;
}

export function ThemedButton({
  variant = "primary",
  size = "md",
  pressed = false,
  loading = false,
  eligible,
  selected,
  disabled,
  invalid,
  submitted,
  previewing,
  intentProgress,
  className,
  style,
  ...props
}: ThemedButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading || submitted;
  const dataAttributes = visualStateDataAttributes({
    eligible,
    selected,
    disabled: isDisabled,
    invalid,
    submitted,
    previewing,
    intentProgress,
  });
  return (
    <ShadcnButton
      variant={toShadcnVariant(submitted ? "submitted" : variant)}
      size={toShadcnSize(size)}
      disabled={isDisabled}
      data-dreamboard-button
      data-dreamboard-button-variant={submitted ? "submitted" : variant}
      data-dreamboard-button-size={size}
      data-pressed={pressed ? "true" : undefined}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
      aria-pressed={selected ? true : pressed ? true : undefined}
      aria-invalid={invalid || undefined}
      {...dataAttributes}
      className={clsx("font-sans", className)}
      style={{
        ...buttonStyle(theme, {
          variant: submitted ? "submitted" : variant,
          size,
          disabled: isDisabled,
          pressed,
        }),
        ...style,
      }}
      {...props}
    />
  );
}

function toShadcnVariant(
  variant: ButtonVariant,
): NonNullable<ShadcnButtonProps["variant"]> {
  switch (variant) {
    case "danger":
      return "destructive";
    case "ghost":
      return "ghost";
    case "secondary":
      return "secondary";
    case "primary":
    case "submitted":
    case "success":
    case "warning":
    case "info":
      return "default";
  }
}

function toShadcnSize(
  size: ButtonSize,
): NonNullable<ShadcnButtonProps["size"]> {
  switch (size) {
    case "sm":
      return "sm";
    case "md":
      return "default";
    case "lg":
      return "lg";
  }
}
