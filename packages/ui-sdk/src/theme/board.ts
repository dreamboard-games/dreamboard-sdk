/**
 * Board theming helpers.
 *
 * The SDK's board renderers (`<HexGrid>`, `<SquareGrid>`,
 * `<NetworkGraph>`, `<ZoneMap>`, `<TrackBoard>`, `<SlotSystem>`) need a
 * tiny but consistent set of visual tokens — frame border, frame fill,
 * eligible-target hint, and active hover ring — so authors don't have
 * to re-pick colours per board. {@link useBoardTheme} exposes those
 * tokens, derived from the active {@link Theme}.
 */

import { useMemo } from "react";
import { useTheme } from "./ThemeProvider.js";
import type { Theme } from "./tokens.js";

/**
 * Resolved board tokens consumed by board renderers and per-tile
 * default renderers. All values are CSS-ready strings.
 */
export interface BoardTheme {
  /** Border drawn around the board's outer frame. */
  readonly frameBorder: string;
  /** Background painted under the tile renderer (visible at tile gaps). */
  readonly frameBackground: string;
  /** Hover-state ring drawn over an interactive target. */
  readonly hoverRing: string;
  /** Idle hint colour for an eligible-but-unhovered target. */
  readonly eligibleHint: string;
  /** Border drawn on inactive tiles (matches semantic.border.default). */
  readonly tileBorder: string;
  /** Subtle dotted border for non-interactive scaffolding (e.g. ports). */
  readonly tileBorderSubtle: string;
  /** Foreground used for board labels (numbers, port ratios). */
  readonly tileText: string;
  /** Recommended ring stroke width in px for hover/eligible markers. */
  readonly ringWidth: number;
}

/**
 * Derive a {@link BoardTheme} from the active theme. Memoised on the
 * theme reference so consumers can pass it straight to a board's
 * `defaultTileProps` / `defaultEdgeProps` slots.
 */
export function useBoardTheme(): BoardTheme {
  const theme = useTheme();
  return useMemo(() => deriveBoardTheme(theme), [theme]);
}

/** Standalone derivation for renderers that already hold a {@link Theme}. */
export function deriveBoardTheme(theme: Theme): BoardTheme {
  return {
    frameBorder: theme.component.board.frameBorder,
    frameBackground: theme.component.board.frameBackground,
    hoverRing: theme.component.board.hoverRing,
    eligibleHint: theme.component.board.eligibleHint,
    tileBorder: theme.semantic.border.default,
    tileBorderSubtle: theme.semantic.border.subtle,
    tileText: theme.semantic.text.primary,
    ringWidth: 3,
  };
}
