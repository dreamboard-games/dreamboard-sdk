/**
 * Disclosure that hides a list of low-salience actions behind a single
 * "More" toggle. Sized and styled by the active theme so it looks
 * consistent with neighbouring `<DefaultInteractionButton>` rows.
 *
 * Why not a popover or dropdown? Two reasons:
 *
 * 1. **Layout safety.** The default panel surface lives directly above
 *    the hand strip; a floating popover would be obscured by the
 *    hand's `overflow-x: auto` clipping. An inline expansion stays
 *    inside the panel container and pushes neighbouring rows down.
 * 2. **Discoverability.** Players miss menus that hide behind triple
 *    dots / chevrons. An expanded inline list still looks like a row
 *    of buttons (Jakob — same affordance as the always-visible row).
 *
 * The toggle reports its open state via `aria-expanded` and labels
 * the disclosed region via `aria-controls` so screen readers announce
 * "Expanded — More actions, region containing 3 buttons" naturally.
 */

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider.js";
import { ThemedButton } from "./ThemedButton.js";

export interface MoreActionsProps {
  /**
   * Items rendered inside the disclosure when expanded. Typically
   * `<DefaultInteractionButton>` instances for `salience: "tertiary"`
   * descriptors, but any `ReactNode` works (custom panel cards, etc.).
   */
  children: ReactNode;
  /**
   * Toggle label. Defaults to `"More"`. The descriptor count gets
   * appended automatically when {@link count} is supplied.
   */
  label?: string;
  /**
   * Number of hidden items, used to render the trailing "(N)" badge.
   * Omit when the count is irrelevant or already implied (e.g. when
   * the panel only has a fixed set of disclosed items).
   */
  count?: number;
  /**
   * Initial open state. Defaults to `false` — the disclosure is the
   * point. Authors who want it open by default for a specific seat
   * (e.g. tutorial mode) should pass `true`.
   */
  defaultOpen?: boolean;
  /** Additional inline style merged after the default container. */
  style?: CSSProperties;
}

export function MoreActions({
  children,
  label = "More",
  count,
  defaultOpen = false,
  style,
}: MoreActionsProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  // `useId` keeps the aria pairing stable across re-renders even when
  // many `<MoreActions>` exist on screen (rare, but easy to break).
  const regionId = `more-actions-${useId().replace(/:/g, "")}`;

  const showCount = typeof count === "number" && count > 0;

  return (
    <div
      data-shell-slot="more-actions"
      data-more-actions-open={open ? "true" : "false"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.space[2],
        alignItems: "stretch",
        // The disclosure is its own block so wrap behaviour upstream
        // doesn't interleave the toggle and the disclosed items.
        flex: "1 1 100%",
        minWidth: 0,
      }}
    >
      <ThemedButton
        type="button"
        variant="secondary"
        size="md"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: theme.space[1],
          ...style,
        }}
      >
        <MoreHorizontal size={16} aria-hidden />
        <span>{label}</span>
        {showCount ? (
          <span
            aria-hidden
            style={{
              fontVariantNumeric: "tabular-nums",
              opacity: 0.78,
            }}
          >
            ({count})
          </span>
        ) : null}
        <ChevronDown
          size={14}
          aria-hidden
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${theme.motion.duration.fast} ${theme.motion.easing.out}`,
          }}
        />
      </ThemedButton>
      {open ? (
        <div
          id={regionId}
          role="region"
          aria-label={label}
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.space[2],
            // Inset visually so the disclosed cluster reads as a
            // sub-region rather than a continuation of the main panel.
            paddingInline: theme.space[3],
            paddingBlock: theme.space[2],
            background: theme.semantic.surface.inset,
            borderRadius: theme.radius.lg,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
