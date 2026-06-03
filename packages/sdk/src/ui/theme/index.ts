/**
 * Public theme surface for `@dreamboard-games/sdk/ui`.
 *
 * Authors who only consume the SDK never need to import from
 * sub-modules — `<ThemeProvider>`, `useTheme()`, and the preset ids
 * are the entire public API. Type-level exports cover advanced use
 * (custom themes, deep overrides) without leaking internal token shape
 * surfaces (CSS-var serializer, derive helpers) that may move.
 *
 * Module entry order is import-friendly: tokens (types) before
 * presets (values) before provider (consumes both).
 */

export type {
  ColorRamp,
  ComponentTokens,
  Elevation,
  FoundationColor,
  IntentColor,
  Motion,
  PlayerColor,
  Radius,
  SemanticColor,
  Space,
  Theme,
  ThemeMeta,
  ThemeOverride,
  Typography,
} from "./tokens.js";

export { mergeTheme } from "./tokens.js";

export { tabletopTheme } from "./presets/tabletop.js";
export { arcadeTheme } from "./presets/arcade.js";
export { studioTheme } from "./presets/studio.js";

export {
  ThemeProvider,
  resolveTheme,
  getThemePreset,
  useTheme,
  useThemeCssVars,
  type ThemeContextValue,
  type ThemePresetId,
  type ThemeProviderProps,
} from "./ThemeProvider.js";

export { themeToCssVars, cssVar, cssVarOr } from "./css-vars.js";

export {
  buttonStyle,
  chipStyle,
  surfaceStyle,
  intentForVariant,
  playerColor,
  motionDuration,
  type ButtonSize,
  type ButtonVariant,
} from "./derive.js";

export { useBoardTheme, deriveBoardTheme, type BoardTheme } from "./board.js";
