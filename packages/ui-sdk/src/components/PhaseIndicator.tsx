/**
 * Surfaces the dominant turn-state question — "is this me?" / "who am I
 * waiting for?" — as a single headline, with the phase label demoted to
 * secondary copy underneath.
 *
 * The previous design rendered three peer chips (`Waiting`, `Roll dice`,
 * `Player 3`) which fragmented one piece of information across three
 * UI atoms. The redesign collapses them into a single status line:
 *
 *   ◐ Waiting for Player 3…
 *      Roll dice
 *
 *   ● Your turn
 *      Build, trade, or end your turn.
 *
 * Both states get a leading status indicator that animates so the eye
 * picks up the "live" cue immediately. Animations are skipped when the
 * theme reports `motion.reducedMotion === "true"`.
 *
 * Prop API is unchanged so existing callers (Catan, Things-in-Rings,
 * tests) keep working without edits. The `variant` knob still toggles
 * surface treatment (`badge` is layout-only, `bar` wraps the headline
 * in an inset HUD strip, `minimal` collapses to a single underlined
 * label for tight HUDs).
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";
import { useTheme } from "../theme/ThemeProvider.js";
import { surfaceStyle } from "../theme/derive.js";
import type { Theme } from "../theme/tokens.js";

export interface PhaseIndicatorProps {
  currentPhase: string;
  phaseLabels?: Record<string, string>;
  isMyTurn?: boolean;
  activePlayerNames?: string[];
  variant?: "badge" | "bar" | "minimal";
  className?: string;
}

export function PhaseIndicator({
  currentPhase,
  phaseLabels,
  isMyTurn,
  activePlayerNames,
  variant = "badge",
  className,
}: PhaseIndicatorProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";

  const label = phaseLabels?.[currentPhase] ?? formatPhase(currentPhase);

  if (variant === "minimal") {
    return (
      <span
        className={className}
        style={{
          fontFamily: theme.typography.fontFamily.body,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.semantic.text.muted,
          textDecoration: "underline",
          textDecorationStyle: "wavy",
          textDecorationColor: theme.semantic.border.subtle,
          textUnderlineOffset: "4px",
        }}
        role="status"
        aria-label={`Current phase: ${label}`}
      >
        {label}
      </span>
    );
  }

  // Decide which state we're in. Only one is active at a time so the
  // headline is unambiguous.
  const state: "your-turn" | "waiting" | "phase-only" =
    isMyTurn === true
      ? "your-turn"
      : isMyTurn === false && activePlayerNames && activePlayerNames.length > 0
        ? "waiting"
        : "phase-only";

  const containerStyle: React.CSSProperties =
    variant === "bar"
      ? {
          ...surfaceStyle(theme, { tone: "inset", radius: "hud" }),
          padding: theme.space[3],
          boxShadow: theme.elevation.inset,
          fontFamily: theme.typography.fontFamily.body,
        }
      : { fontFamily: theme.typography.fontFamily.body };

  const headline = renderHeadline({
    state,
    activePlayerNames,
    label,
    theme,
    reducedMotion,
  });
  const ariaLabel =
    state === "your-turn"
      ? `Your turn — ${label}`
      : state === "waiting"
        ? `Waiting for ${formatPlayerList(activePlayerNames ?? [])} — ${label}`
        : label;

  return (
    <div
      className={clsx("flex items-center gap-3 flex-wrap", className)}
      style={containerStyle}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
    >
      {headline}
    </div>
  );
}

function formatPhase(phase: string): string {
  const formatted = phase
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
  return formatted === "Player Turn" ? "Turn" : formatted;
}

function formatPlayerList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

interface HeadlineArgs {
  state: "your-turn" | "waiting" | "phase-only";
  activePlayerNames: readonly string[] | undefined;
  label: string;
  theme: Theme;
  reducedMotion: boolean;
}

function renderHeadline({
  state,
  activePlayerNames,
  label,
  theme,
  reducedMotion,
}: HeadlineArgs) {
  if (state === "phase-only") {
    return (
      <div style={textBlockStyle(theme)}>
        <span style={titleTextStyle(theme)}>{label}</span>
      </div>
    );
  }

  const isYourTurn = state === "your-turn";
  const intent = isYourTurn
    ? theme.semantic.intent.success
    : theme.semantic.intent.info;
  const titleText = isYourTurn
    ? "Your turn"
    : `Waiting for ${formatPlayerList(activePlayerNames ?? [])}…`;

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.space[3],
      }}
    >
      <StatusIndicator
        intent={intent}
        kind={isYourTurn ? "pulse" : "spinner"}
        reducedMotion={reducedMotion}
      />
      <div style={textBlockStyle(theme)}>
        <span style={titleTextStyle(theme)}>{titleText}</span>
        <span style={subtitleTextStyle(theme)}>{label}</span>
      </div>
    </motion.div>
  );
}

function textBlockStyle(theme: Theme): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.space[0.5],
    minWidth: 0,
  };
}

function titleTextStyle(theme: Theme): React.CSSProperties {
  return {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: theme.typography.letterSpacing.tight,
    lineHeight: theme.typography.lineHeight.tight,
    color: theme.semantic.text.primary,
  };
}

function subtitleTextStyle(theme: Theme): React.CSSProperties {
  return {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    letterSpacing: theme.typography.letterSpacing.caps,
    textTransform: "uppercase",
    color: theme.semantic.text.muted,
  };
}

interface StatusIndicatorProps {
  intent: Theme["semantic"]["intent"]["success"];
  kind: "pulse" | "spinner";
  reducedMotion: boolean;
}

/**
 * Animated status indicator sized to sit next to a body-font headline.
 *
 * Kept intentionally chip-less so it shares the chrome strip's
 * understated treatment (the rest of the chrome uses bare typography
 * and lets intent colour live in chips, dots, and borders — not in
 * full-saturation surfaces). The colour comes from one
 * {@link Theme}-supplied intent ramp so swapping themes keeps the
 * indicator consistent with chips, toasts, and buttons that use the
 * same intent.
 *
 * - `pulse` — soft halo radiating outward from a solid centre dot.
 *   Used for the player's own active turn.
 * - `spinner` — thin partial ring rotating around a soft-filled
 *   centre. Reads as the standard "in flight / live" affordance.
 */
function StatusIndicator({
  intent,
  kind,
  reducedMotion,
}: StatusIndicatorProps) {
  const size = 16;

  if (kind === "pulse") {
    return (
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <motion.span
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: "9999px",
            background: intent.soft,
          }}
          animate={
            reducedMotion
              ? undefined
              : { scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }
          }
          transition={{
            repeat: reducedMotion ? 0 : Infinity,
            duration: 1.6,
            ease: "easeOut",
          }}
        />
        <span
          style={{
            position: "relative",
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "9999px",
            background: intent.solid,
          }}
        />
      </span>
    );
  }

  // "spinner" — partial ring rotating around an inset soft fill.
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "9999px",
          background: intent.soft,
        }}
      />
      <motion.span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          border: "2px solid transparent",
          borderTopColor: intent.solid,
          borderRightColor: intent.solid,
        }}
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={{
          repeat: reducedMotion ? 0 : Infinity,
          duration: 1.2,
          ease: "linear",
        }}
      />
    </span>
  );
}
