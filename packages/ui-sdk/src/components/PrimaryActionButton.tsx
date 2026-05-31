/**
 * Theme-aware controlled primary CTA button — the dominant call-to-action on
 * the screen at any given moment ("Roll dice", "End turn", "Confirm
 * trade", "Place settlement").
 *
 * Visual contract (Laws of UX cross-references):
 *
 * - **Fitts** — defaults to `lg` size (min 56px tall, generous
 *   horizontal padding) so the dock target is easy to land on.
 *   Authors can opt down to `md`.
 * - **Von Restorff (isolation)** — uses `intent.primary.solid` with
 *   `elevation.lifted` and an animated halo when `attention="auto"`
 *   and `available` is true, so the button outranks every other
 *   element in its peripheral neighbourhood.
 * - **Peak-end** — when the action becomes available, the halo pulses for one breath cycle
 *   so the eye finds the change without re-scanning the screen.
 * - **Doherty / responsiveness** — clicks set an internal `pending`
 *   flag the moment submit fires so the button visibly absorbs the
 *   tap, even on slow networks. Throwing submitters are swallowed
 *   here for the same reason `<DefaultInteractionButton>` does:
 *   descriptor availability is authoritative.
 * - **Accessibility** — minimum 56×56 hit area satisfies WCAG 2.5.5.
 *   `prefers-reduced-motion` zeroes out the halo and press
 *   transitions through the theme's `motion.reducedMotion` token.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { useTheme } from "../theme/ThemeProvider.js";
import {
  intentForVariant,
  type ButtonSize,
  type ButtonVariant,
} from "../theme/derive.js";
import type { InteractionVisualState } from "../types/visual-state.js";
import { ThemedButton } from "./ThemedButton.js";

/** Attention-pulse policy for the trailing halo. */
export type PrimaryActionAttention = "auto" | "always" | "off";

export interface SubmittedActionConfig {
  label?: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
}

export interface PrimaryActionButtonProps extends InteractionVisualState {
  /**
   * Override the visual variant. Defaults to `primary` (which maps
   * to `intent.primary` regardless of the descriptor's `emphasis`
   * hint — the shell's primary slot is, by definition, primary).
   */
  variant?: ButtonVariant;
  /**
   * Sizing. Defaults to `lg` so the dock target is comfortable on
   * touch and visually outranks panel buttons sized `md`.
   */
  size?: ButtonSize;
  /**
   * Override the label inferred from `descriptor.label`. Use only
   * when the descriptor's label needs phase-specific copy that the
   * authoring layer can't express.
   */
  label?: ReactNode;
  /** Client-side draft readiness. Reducer availability remains authoritative. */
  ready?: boolean;
  /** Whether the action is currently available according to the caller. */
  available?: boolean;
  /** Optional reason rendered as the disabled tooltip. */
  unavailableReason?: string;
  /** External submission state. */
  submitting?: boolean;
  /** External submitted state. */
  submitted?: boolean;
  /** Copy and visual overrides once this interaction has been submitted. */
  whenSubmitted?: SubmittedActionConfig;
  /**
   * Optional leading icon override. When omitted, falls back to
   * `descriptor.icon` (an emoji glyph from the authoring spec).
   */
  icon?: ReactNode;
  /** Stable identifier for diagnostics and tests. */
  actionId?: string;
  /** Called when the controlled action is activated. */
  onAction?: () => void | Promise<void>;
  /**
   * Attention-halo policy. `auto` (default) pulses the halo for one
   * breath when the button transitions from disabled → enabled (so
   * the user sees the moment the action becomes available), then
   * settles into a slow ambient breath while the action remains
   * available. `always` keeps the breath running unconditionally.
   * `off` suppresses the halo entirely.
   *
   * Ignored when `theme.motion.reducedMotion === "true"`.
   */
  attention?: PrimaryActionAttention;
  /** Additional inline style merged after the resolved button style. */
  style?: CSSProperties;
  /** Optional className for downstream styling hooks. */
  className?: string;
}

/**
 * @see PrimaryActionButtonProps
 */
export function PrimaryActionButton({
  variant = "primary",
  size = "lg",
  label = "Action",
  ready = true,
  available: availableProp = true,
  unavailableReason,
  submitting: submittingProp = false,
  submitted = false,
  whenSubmitted,
  icon,
  actionId,
  onAction,
  attention = "auto",
  style,
  className,
}: PrimaryActionButtonProps) {
  const theme = useTheme();
  const reducedMotion = theme.motion.reducedMotion === "true";
  const [pending, setPending] = useState(false);

  const submitting = submittingProp || pending;
  const available = availableProp && ready && !submitted && !submitting;
  const resolvedVariant = submitted
    ? (whenSubmitted?.variant ?? "submitted")
    : variant;
  const disabled = !available;
  const intent = intentForVariant(theme, resolvedVariant);

  // Pulse the halo for one breath when availability flips on. After
  // the breath we settle into the ambient cadence (or stop, when
  // `attention` is `off`). Tracking the previous availability lets
  // us catch the transition without re-mounting the component.
  const previouslyAvailableRef = useRef(available);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (!previouslyAvailableRef.current && available) {
      setPulseKey((n) => n + 1);
    }
    previouslyAvailableRef.current = available;
  }, [available]);

  const haloEnabled =
    !reducedMotion && available && attention !== "off" && !submitted;

  const tooltip = available
    ? undefined
    : formatUnavailableReason(unavailableReason);

  const resolvedLabel: ReactNode = submitted
    ? (whenSubmitted?.label ?? label)
    : label;
  const resolvedIcon: ReactNode =
    submitted && whenSubmitted?.icon ? (
      <span aria-hidden style={{ fontSize: "1.15em" }}>
        {whenSubmitted.icon}
      </span>
    ) : (
      (icon ?? null)
    );

  return (
    <span
      data-dreamboard-primary-action
      data-available={available ? "true" : "false"}
      data-pending={submitting ? "true" : undefined}
      data-action-state={
        submitted
          ? "submitted"
          : submitting
            ? "submitting"
            : available
              ? "available"
              : "unavailable"
      }
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        // The halo overflows the button bounds; the wrapper reserves
        // a transparent buffer so it doesn't get clipped by the
        // dock's safe-area frame.
        padding: theme.space[1],
      }}
    >
      {haloEnabled ? (
        <>
          {/*
            Ambient breath — slow, low-amplitude, runs as long as the
            action is available. The outer `haloEnabled` already
            short-circuits when `attention === "off"`, so this layer
            is gated purely on the availability + reduced-motion
            checks.
          */}
          <motion.span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: theme.radius.md,
              background: intent.soft,
              opacity: 0.55,
              pointerEvents: "none",
            }}
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.45, 0.18, 0.45],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: "easeInOut",
            }}
          />
          {/*
            One-shot announce pulse keyed on `pulseKey` — re-mounts
            (and thus re-runs) every time availability flips on so the
            eye registers the change. We use a separate layer (rather
            than retriggering the ambient breath) so the announce is
            visibly louder than the steady-state cadence.
          */}
          <motion.span
            key={pulseKey}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: theme.radius.md,
              boxShadow: `0 0 0 0 ${intent.solid}`,
              pointerEvents: "none",
            }}
            initial={{ opacity: 0.7 }}
            animate={{
              boxShadow: [
                `0 0 0 0 ${withAlpha(intent.solid, 0.55)}`,
                `0 0 0 14px ${withAlpha(intent.solid, 0)}`,
              ],
              opacity: [0.7, 0],
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </>
      ) : null}
      <ThemedButton
        type="button"
        variant={resolvedVariant}
        size={size}
        pressed={submitting}
        className={className}
        aria-label={
          typeof resolvedLabel === "string" ? resolvedLabel : "Primary action"
        }
        aria-disabled={disabled || undefined}
        data-interaction-id={actionId}
        data-emphasis="primary"
        title={tooltip}
        disabled={disabled}
        style={{
          // Sit above the halo so clicks land on the button.
          position: "relative",
          zIndex: 1,
          boxShadow: disabled || submitted ? undefined : theme.elevation.lifted,
          ...style,
        }}
        onClick={async (event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          if (disabled) return;
          setPending(true);
          try {
            await onAction?.();
          } finally {
            setPending(false);
          }
        }}
      >
        {resolvedIcon}
        <span>{resolvedLabel}</span>
      </ThemedButton>
    </span>
  );
}

function formatUnavailableReason(
  reason: string | undefined,
): string | undefined {
  if (reason === "INSUFFICIENT_RESOURCES") {
    return "Insufficient resources";
  }
  return reason;
}

/**
 * Add an alpha channel to a CSS colour string. Supports `#rgb`,
 * `#rrggbb`, and any colour the browser can paint via a fallback to
 * `color-mix` (modern Safari/Chrome/Firefox all support this; older
 * runtimes get the original colour without alpha which is still
 * visible — the halo is decorative).
 */
function withAlpha(color: string, alpha: number): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      // `String.prototype.slice` always returns a string (possibly
      // empty) — never `undefined` — so duplicating each digit is
      // safe to feed to `parseInt` without further narrowing.
      const r = parseInt(hex.slice(0, 1).repeat(2), 16);
      const g = parseInt(hex.slice(1, 2).repeat(2), 16);
      const b = parseInt(hex.slice(2, 3).repeat(2), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  // Best-effort fallback for non-hex colours (rgb/hsl/named): use
  // `color-mix` with transparent. Safe to land in inline style — the
  // halo is purely decorative and will gracefully degrade.
  return `color-mix(in srgb, ${trimmed} ${Math.round(alpha * 100)}%, transparent)`;
}
