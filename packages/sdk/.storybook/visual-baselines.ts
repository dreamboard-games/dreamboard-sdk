/**
 * Stable story IDs that participate in deterministic visual regression.
 *
 * Stories listed here are screenshotted by `storybook:test:visual` (driven by
 * the test-runner) and compared against checked-in baselines. Animation-driven
 * or non-deterministic stories must NOT appear in this list — capture them as
 * documentation only.
 *
 * Each entry pairs a story id (`title--name` kebab-cased by Storybook) with the
 * viewports it must be captured at. Phase 4 will append more mobile-fan
 * variants once the gesture pipeline lands.
 */

export interface VisualBaseline {
  storyId: string;
  viewports: ReadonlyArray<"phonePortrait" | "tabletPortrait" | "desktop">;
}

export const VISUAL_BASELINES: ReadonlyArray<VisualBaseline> = [
  // Theme presets — desktop only is enough since they paint full-bleed.
  { storyId: "themes--tabletop", viewports: ["desktop"] },
  { storyId: "themes--arcade", viewports: ["desktop"] },
  { storyId: "themes--studio", viewports: ["desktop"] },
  { storyId: "themes--preset-matrix", viewports: ["desktop"] },
  { storyId: "themes--reduced-motion", viewports: ["desktop"] },
  { storyId: "themes--semantic-state-comparison", viewports: ["desktop"] },

  // CardFace — coverage of every controlled state and size.
  { storyId: "cards-cardface--default-content", viewports: ["desktop"] },
  { storyId: "cards-cardface--sizes", viewports: ["desktop"] },
  { storyId: "cards-cardface--face-down", viewports: ["desktop"] },
  { storyId: "cards-cardface--eligible", viewports: ["desktop"] },
  { storyId: "cards-cardface--selected", viewports: ["desktop"] },
  { storyId: "cards-cardface--disabled", viewports: ["desktop"] },
  { storyId: "cards-cardface--invalid", viewports: ["desktop"] },
  { storyId: "cards-cardface--submitted", viewports: ["desktop"] },
  { storyId: "cards-cardface--previewing", viewports: ["desktop"] },

  // HandView — required mobile/desktop fan/strip/tray geometry.
  { storyId: "hands-handview--empty", viewports: ["desktop", "phonePortrait"] },
  {
    storyId: "hands-handview--five-card-fan",
    viewports: ["desktop", "phonePortrait"],
  },
  {
    storyId: "hands-handview--thirteen-card-fan-desktop",
    viewports: ["desktop"],
  },
  {
    storyId: "hands-handview--thirteen-card-compressed-fan",
    viewports: ["desktop"],
  },
  {
    storyId: "hands-handview--phone-portrait-thirteen",
    viewports: ["phonePortrait"],
  },
  { storyId: "hands-handview--tray-layout", viewports: ["phonePortrait"] },
  {
    storyId: "hands-handview--narrow-width-falls-back-to-tray",
    viewports: ["phonePortrait"],
  },
  {
    storyId: "hands-handview--comfortable-width-renders-fan",
    viewports: ["desktop"],
  },
  { storyId: "hands-handview--selected-many", viewports: ["desktop"] },
  {
    storyId: "hands-handview--drag-to-target-surface-layout",
    viewports: ["phonePortrait"],
  },
  {
    storyId: "hands-handview--drag-to-target-selection-staging",
    viewports: ["phonePortrait"],
  },

  // Buttons.
  { storyId: "buttons--themed-variants", viewports: ["desktop"] },
  { storyId: "buttons--themed-sizes", viewports: ["desktop"] },
  { storyId: "buttons--action-button-states", viewports: ["desktop"] },

  // Panels — mobile bottom sheet specifically.
  { storyId: "panels--compact-panel", viewports: ["desktop"] },
  { storyId: "panels--mobile-bottom-sheet", viewports: ["phonePortrait"] },

  // Resource / status.
  { storyId: "resource-status--resource-compact", viewports: ["desktop"] },
  { storyId: "resource-status--resource-zero-hidden", viewports: ["desktop"] },
  { storyId: "resource-status--cost", viewports: ["desktop"] },
  {
    storyId: "resource-status--active-self-phase",
    viewports: ["desktop"],
  },

  // Board target visuals.
  { storyId: "board-targets--eligible-targets", viewports: ["desktop"] },
  {
    storyId: "board-targets--claimed-and-disabled",
    viewports: ["desktop"],
  },
];
