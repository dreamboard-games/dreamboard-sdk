import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { themeToCssVars } from "./css-vars.js";
import { arcadeTheme } from "./presets/arcade.js";
import { studioTheme } from "./presets/studio.js";
import { tabletopTheme } from "./presets/tabletop.js";
import { mergeTheme, type Theme, type ThemeOverride } from "./tokens.js";

/**
 * The set of preset theme ids ships in `@dreamboard-games/ui-sdk`. Authors
 * may register additional ones by passing a fully-resolved {@link Theme}
 * instead of an id.
 */
export type ThemePresetId = "tabletop" | "arcade" | "studio";

const PRESETS: Readonly<Record<ThemePresetId, Theme>> = {
  tabletop: tabletopTheme,
  arcade: arcadeTheme,
  studio: studioTheme,
};

/**
 * Resolve a preset id (or a full theme) into a {@link Theme}.
 *
 * Used internally by {@link ThemeProvider}; exported so authors who
 * compose at the call site (e.g. for a side-by-side preview) can do
 * the same resolution without mounting a provider.
 */
export function resolveTheme(input: ThemePresetId | Theme | undefined): Theme {
  if (!input) return tabletopTheme;
  if (typeof input === "string") {
    const preset = PRESETS[input];
    if (!preset) {
      throw new Error(
        `[ui-sdk] Unknown theme preset "${input}". Pass a full Theme object or one of: ${Object.keys(
          PRESETS,
        ).join(", ")}.`,
      );
    }
    return preset;
  }
  return input;
}

/** Look up a registered preset by id. Returns `undefined` if missing. */
export function getThemePreset(id: ThemePresetId): Theme | undefined {
  return PRESETS[id];
}

/**
 * Subset returned by {@link useTheme} — the resolved theme plus a
 * stable copy of its CSS-variable map so consumers can reuse it (for
 * example, to apply tokens to a portal that escapes the provider).
 */
export interface ThemeContextValue {
  /** Fully resolved theme. */
  readonly theme: Theme;
  /** CSS-var map consumable as `style` on a wrapper. */
  readonly cssVars: CSSProperties;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  /**
   * Preset id, a full {@link Theme}, or omitted to use the `tabletop`
   * default.
   */
  theme?: ThemePresetId | Theme;
  /**
   * Deep-partial overrides merged onto the resolved base theme. Use
   * for one-off tweaks (e.g. swapping the player palette per game)
   * without writing a full theme.
   */
  override?: ThemeOverride;
  /**
   * Render mode for reduced-motion enforcement.
   *
   * - `auto` (default): respect the user's OS-level preference via
   *   `prefers-reduced-motion: reduce`.
   * - `force`: force `motion.reducedMotion = "true"` regardless of the
   *   OS preference (useful for screenshot CI).
   * - `ignore`: never override motion (use only when the embedding
   *   shell already decides motion behaviour).
   */
  reducedMotion?: "auto" | "force" | "ignore";
  /**
   * Where to mount the wrapper. `block` (default) renders a `div` and
   * applies the CSS variables to it. `none` skips the wrapper entirely
   * — only useful when the parent is already a Dreamboard provider and
   * just needs to publish a different sub-tree (rare).
   */
  as?: "block" | "none";
  /** Extra style merged after the CSS-var map. */
  style?: CSSProperties;
  /** Extra className for the wrapper. */
  className?: string;
  children: ReactNode;
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(media.matches);
    const handle = (event: MediaQueryListEvent) => setPrefers(event.matches);
    media.addEventListener("change", handle);
    return () => media.removeEventListener("change", handle);
  }, []);
  return prefers;
}

/**
 * Mounts a Dreamboard theme. The provider:
 *
 * 1. Resolves the preset (or accepts a full theme).
 * 2. Applies any deep-partial `override`.
 * 3. Optionally clamps `motion.reducedMotion` to `"true"` based on the
 *    OS-level preference (or a forced override).
 * 4. Serialises the resolved theme into CSS variables on a wrapper
 *    element so descendants can read tokens via `useTheme()` *or* via
 *    `var(--db-...)` references in their own CSS / Tailwind.
 *
 * Defaults such as `<GameLayout>` mount this for you with the configured
 * theme; mount it manually only when you need a sub-tree to use a different
 * theme (e.g. a dark sheet over a light layout).
 */
export function ThemeProvider({
  theme: themeInput,
  override,
  reducedMotion = "auto",
  as = "block",
  style,
  className,
  children,
}: ThemeProviderProps) {
  const prefersReduced = usePrefersReducedMotion();

  const value = useMemo<ThemeContextValue>(() => {
    const base = resolveTheme(themeInput);
    const merged = mergeTheme(base, override);
    const motionResolved =
      reducedMotion === "force"
        ? "true"
        : reducedMotion === "ignore"
          ? merged.motion.reducedMotion
          : prefersReduced
            ? "true"
            : merged.motion.reducedMotion;
    const final: Theme =
      motionResolved === merged.motion.reducedMotion
        ? merged
        : {
            ...merged,
            motion: { ...merged.motion, reducedMotion: motionResolved },
          };
    return { theme: final, cssVars: themeToCssVars(final) };
  }, [themeInput, override, reducedMotion, prefersReduced]);

  if (as === "none") {
    return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
  }

  const wrapperStyle: CSSProperties = {
    ...themeToShadcnVars(value.theme),
    ...value.cssVars,
    fontFamily: value.theme.typography.fontFamily.body,
    ...style,
  };

  return (
    <ThemeCtx.Provider value={value}>
      <div
        data-dreamboard-theme={value.theme.meta.id}
        data-dreamboard-mode={value.theme.meta.mode}
        data-dreamboard-reduced-motion={value.theme.motion.reducedMotion}
        className={className}
        style={wrapperStyle}
      >
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

/**
 * Read the active {@link Theme} from a {@link ThemeProvider} ancestor.
 *
 * Falls back to the `tabletop` preset (with no overrides) when called
 * outside a provider — components remain renderable in isolated tests
 * and Storybook/Cosmos fixtures without a wrapping shell.
 */
export function useTheme(): Theme {
  const ctx = useContext(ThemeCtx);
  return ctx?.theme ?? tabletopTheme;
}

/**
 * Read the {@link CSSProperties} that publish the active theme as CSS
 * variables. Useful when porting a theme into a portal or drawer that
 * is rendered outside the provider's DOM subtree.
 */
export function useThemeCssVars(): CSSProperties {
  const ctx = useContext(ThemeCtx);
  if (ctx) return { ...themeToShadcnVars(ctx.theme), ...ctx.cssVars };
  // Match the fallback theme exposed by `useTheme()`.
  return {
    ...themeToShadcnVars(tabletopTheme),
    ...themeToCssVars(tabletopTheme),
  };
}

export { ThemeCtx };

type CssVariableStyle = CSSProperties & {
  [K in `--${string}`]?: string | number;
};

function themeToShadcnVars(theme: Theme): CSSProperties {
  const vars: CssVariableStyle = {
    "--background": theme.semantic.surface.app,
    "--foreground": theme.semantic.text.primary,
    "--card": theme.semantic.surface.card,
    "--card-foreground": theme.semantic.text.primary,
    "--popover": theme.semantic.surface.sheet,
    "--popover-foreground": theme.semantic.text.primary,
    "--primary": theme.semantic.intent.primary.solid,
    "--primary-foreground": theme.semantic.intent.primary.on,
    "--secondary": theme.semantic.intent.secondary.solid,
    "--secondary-foreground": theme.semantic.intent.secondary.on,
    "--muted": theme.semantic.surface.inset,
    "--muted-foreground": theme.semantic.text.muted,
    "--accent": theme.semantic.intent.info.soft,
    "--accent-foreground": theme.semantic.intent.info.onSoft,
    "--destructive": theme.semantic.intent.danger.solid,
    "--destructive-foreground": theme.semantic.intent.danger.on,
    "--border": theme.semantic.border.default,
    "--input": theme.semantic.border.default,
    "--ring": theme.semantic.border.focus,
    "--font-sans": theme.typography.fontFamily.body,
    "--font-display": theme.typography.fontFamily.display,
  };
  return vars;
}
