import type { CSSProperties } from "react";
import type { IntentColor, Theme } from "./tokens.js";

/**
 * Helpers that derive component-specific style fragments from a
 * resolved {@link Theme}. They live alongside the theme module (rather
 * than in each component) so that:
 *
 * - There is one canonical mapping of "intent → button style", "intent →
 *   chip style", etc.
 * - Component visuals stay aligned automatically when an author tweaks
 *   the theme; nobody has to remember to update a bespoke calc inside
 *   `<CardFace>` or `<ThemedButton>`.
 *
 * Each helper returns a plain {@link CSSProperties} fragment so the
 * caller can spread it into an inline style (or pass it through to
 * Framer Motion's `style` prop).
 */

/** Button visual variants derived from semantic intent slots. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "submitted"
  | "success"
  | "warning"
  | "info"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Compute the inline style for a button in `variant`/`size` from the
 * theme. `disabled` and `pressed` are visual-only — they affect colour
 * intensity and elevation but never touch interactivity (the consuming
 * component owns `aria-disabled` and event wiring).
 */
export function buttonStyle(
  theme: Theme,
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    pressed?: boolean;
  } = {},
): CSSProperties {
  const { variant = "primary", size = "md", disabled, pressed } = options;
  const intent = intentForVariant(theme, variant);
  const sizing = BUTTON_SIZE[size];
  const visuallyDisabled = disabled && variant !== "submitted";

  const baseShadow =
    variant === "ghost"
      ? "none"
      : pressed
        ? theme.elevation.rest
        : theme.elevation.hover;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space[2],
    minHeight: sizing.minHeight,
    paddingBlock: sizing.paddingBlock,
    paddingInline: sizing.paddingInline,
    borderRadius: theme.radius.md,
    border:
      variant === "ghost"
        ? "1px solid transparent"
        : `1px solid ${visuallyDisabled ? theme.semantic.border.subtle : intent.border}`,
    background:
      variant === "ghost"
        ? "transparent"
        : visuallyDisabled
          ? theme.semantic.surface.inset
          : intent.solid,
    color: visuallyDisabled
      ? theme.semantic.text.disabled
      : variant === "ghost"
        ? theme.semantic.text.primary
        : intent.on,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: sizing.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.tight,
    letterSpacing: theme.typography.letterSpacing.normal,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : baseShadow,
    transition: `background-color ${theme.motion.duration.fast} ${theme.motion.easing.out}, transform ${theme.motion.duration.fast} ${theme.motion.easing.out}, box-shadow ${theme.motion.duration.normal} ${theme.motion.easing.out}`,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  };
}

const BUTTON_SIZE: Record<
  ButtonSize,
  {
    minHeight: number;
    paddingBlock: string;
    paddingInline: string;
    fontSize: string;
  }
> = {
  sm: {
    minHeight: 32,
    paddingBlock: "0.25rem",
    paddingInline: "0.625rem",
    fontSize: "0.8125rem",
  },
  md: {
    minHeight: 40,
    paddingBlock: "0.5rem",
    paddingInline: "0.875rem",
    fontSize: "0.9375rem",
  },
  lg: {
    minHeight: 52,
    paddingBlock: "0.75rem",
    paddingInline: "1.125rem",
    fontSize: "1.0625rem",
  },
};

/**
 * Soft-intent chip ("Your turn", "Largest army", "Waiting…"). Reads
 * `intent.<variant>.soft` for background and `.onSoft` for text.
 */
export function chipStyle(
  theme: Theme,
  options: {
    variant?: Exclude<ButtonVariant, "ghost">;
    size?: "sm" | "md";
  } = {},
): CSSProperties {
  const { variant = "secondary", size = "sm" } = options;
  const intent = intentForVariant(theme, variant);
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.space[1],
    paddingBlock: size === "md" ? "0.25rem" : "0.125rem",
    paddingInline: size === "md" ? "0.625rem" : "0.5rem",
    borderRadius: theme.radius.pill,
    border: `1px solid ${intent.border}`,
    background: intent.soft,
    color: intent.onSoft,
    fontFamily: theme.typography.fontFamily.body,
    fontSize:
      size === "md"
        ? theme.typography.fontSize.sm
        : theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: theme.typography.letterSpacing.wide,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

/**
 * Standard surface card (player card, action panel, hand drawer). The
 * `tone` selects which `surface.*` slot to read; `interactive` adds
 * the hover-elevation transition baseline.
 */
export function surfaceStyle(
  theme: Theme,
  options: {
    tone?: keyof Theme["semantic"]["surface"];
    interactive?: boolean;
    /** Override radius to one of the theme tokens. Defaults to `lg`. */
    radius?: keyof Theme["radius"];
  } = {},
): CSSProperties {
  const { tone = "card", interactive, radius = "lg" } = options;
  return {
    background: theme.semantic.surface[tone],
    color: theme.semantic.text.primary,
    border: `1px solid ${theme.semantic.border.subtle}`,
    borderRadius: theme.radius[radius],
    boxShadow: theme.elevation.rest,
    transition: interactive
      ? `box-shadow ${theme.motion.duration.normal} ${theme.motion.easing.out}, transform ${theme.motion.duration.normal} ${theme.motion.easing.out}`
      : undefined,
  };
}

/** Resolve a {@link ButtonVariant} to its underlying {@link IntentColor}. */
export function intentForVariant(
  theme: Theme,
  variant: ButtonVariant,
): IntentColor {
  switch (variant) {
    case "primary":
      return theme.semantic.intent.primary;
    case "secondary":
      return theme.semantic.intent.secondary;
    case "danger":
      return theme.semantic.intent.danger;
    case "submitted":
      return theme.semantic.intent.success;
    case "success":
      return theme.semantic.intent.success;
    case "warning":
      return theme.semantic.intent.warning;
    case "info":
      return theme.semantic.intent.info;
    case "ghost":
      return theme.semantic.intent.secondary;
  }
}

/**
 * Pick a {@link Theme.player} entry by 0-based seat slot, wrapping
 * around when there are more players than palette entries (so a
 * 7-player game cycles back to player 1's palette).
 */
export function playerColor(theme: Theme, slot: number) {
  const length = theme.player.length;
  const idx = ((slot % length) + length) % length;
  // The {@link Theme.player} contract pins length === 6 at the type
  // level, but indexing by a runtime-computed value widens the result
  // to `PlayerColor | undefined`. Falling back to slot 0 (also typed
  // `PlayerColor`) keeps the return type narrow without a non-null
  // assertion.
  return theme.player[idx] ?? theme.player[0];
}

/**
 * Returns `theme.motion.duration.<key>` zeroed out when the theme has
 * `motion.reducedMotion === "true"`. Use this in any component that
 * starts an animation so `prefers-reduced-motion` is honoured uniformly.
 */
export function motionDuration(
  theme: Theme,
  key: keyof Theme["motion"]["duration"],
): string {
  if (theme.motion.reducedMotion === "true") return "0ms";
  return theme.motion.duration[key];
}
