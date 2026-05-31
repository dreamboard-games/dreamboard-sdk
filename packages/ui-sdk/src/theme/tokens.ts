/**
 * Token contract for `@dreamboard-games/ui-sdk`.
 *
 * The {@link Theme} object is the only thing components consume for
 * visual styling. Every preset (tabletop, arcade, studio) is just a
 * different fully-resolved {@link Theme}; every author override is a
 * deep partial of it. Components never inline hex codes, font stacks,
 * or shadow strings — they read from `useTheme()` (or, when written in
 * Tailwind, from CSS variables that the {@link ThemeProvider} writes
 * onto its wrapper element).
 *
 * Architectural rules:
 *
 * 1. **Foundation → Semantic → Component.** Foundation palette ramps
 *    (`color.neutral`, `color.brand`, …) are never read directly by
 *    components. Components read `semantic.*` (e.g. `surface.card`,
 *    `intent.primary`) which the preset maps from foundation tokens.
 * 2. **No optional deep keys.** Presets must supply every leaf so
 *    components don't need fallbacks. Author-supplied overrides are
 *    `DeepPartial<Theme>` and merged before the provider mounts.
 * 3. **Scalar leaves only.** Every leaf is a string (CSS-ready) so the
 *    serializer can emit a CSS variable for it without per-token
 *    formatting logic.
 */

/** Identity-only metadata. */
export interface ThemeMeta {
  /** Stable id used by `data-dreamboard-theme` and CSS-var scoping. */
  readonly id: string;
  /** Human-readable name for dev tools. */
  readonly name: string;
  /**
   * Render mode hint for components that need to choose between light
   * and dark sub-tokens. Presets pick one; authors don't toggle this.
   */
  readonly mode: "light" | "dark";
}

/** Foundation color ramp. Six stops keeps presets compact. */
export interface ColorRamp {
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 400: string;
  readonly 600: string;
  readonly 800: string;
  readonly 950: string;
}

/**
 * Per-player color tokens. The {@link Theme.player} array is indexed by
 * 0-based seat slot (`player[0]` = first seat). Each entry carries a
 * `solid` brand color, a `soft` tint usable as a background, and `on`
 * — the recommended foreground when text sits on `solid`.
 */
export interface PlayerColor {
  readonly solid: string;
  readonly soft: string;
  readonly on: string;
}

/**
 * Foundation palette. Components never read this directly; presets map
 * these into {@link SemanticTokens}. Exposed so authors who write a
 * full theme can compose without inventing their own palette type.
 */
export interface FoundationColor {
  readonly neutral: ColorRamp;
  readonly brand: ColorRamp;
  readonly accent: ColorRamp;
  readonly success: ColorRamp;
  readonly warning: ColorRamp;
  readonly danger: ColorRamp;
  readonly info: ColorRamp;
}

/**
 * Semantic colors consumed by every component. These are the *only*
 * color tokens components should reference. Names describe role
 * ("the surface a player card sits on"), not appearance ("light grey").
 */
export interface SemanticColor {
  readonly surface: {
    /** Outermost shell background. */
    readonly app: string;
    /** Board canvas background (behind tiles). */
    readonly board: string;
    /** HUD chrome panels (top bar, action bar, side rails). */
    readonly hud: string;
    /** Standalone cards (player cards, action cards, hand cards). */
    readonly card: string;
    /** Modal/sheet body. */
    readonly sheet: string;
    /** Scrim behind a blocker overlay. */
    readonly overlay: string;
    /** Subtle inset (resource pills, count badges, …). */
    readonly inset: string;
  };
  readonly text: {
    /** Default body and headline text on light surfaces. */
    readonly primary: string;
    /** De-emphasised metadata, hint copy, captions. */
    readonly muted: string;
    /** Text used on `intent.primary` solid backgrounds. */
    readonly onIntent: string;
    /** Brand-tinted text for emphasis (links, key numbers). */
    readonly accent: string;
    /** Disabled text (button labels in disabled state). */
    readonly disabled: string;
  };
  readonly border: {
    /** Hairline divider between sibling rows. */
    readonly subtle: string;
    /** Standard card / panel border. */
    readonly default: string;
    /** Outlined emphasis (hovered tiles, selected card). */
    readonly strong: string;
    /** Focus ring (keyboard nav). */
    readonly focus: string;
  };
  /**
   * Intent colours map to action emphasis. Components pick a slot
   * (`primary` for "do the main thing now", `danger` for destructive
   * confirms, etc.) and read both the surface and on-color from it.
   */
  readonly intent: {
    readonly primary: IntentColor;
    readonly secondary: IntentColor;
    readonly success: IntentColor;
    readonly danger: IntentColor;
    readonly warning: IntentColor;
    readonly info: IntentColor;
  };
}

/** A semantic intent (button background + matching foreground + soft tint). */
export interface IntentColor {
  /** Solid fill (button bg, badge bg). */
  readonly solid: string;
  /** Recommended text/icon color sitting on `solid`. */
  readonly on: string;
  /** Subtle tint (e.g. badge bg with `text` for foreground). */
  readonly soft: string;
  /** Suitable foreground when sitting on `soft`. */
  readonly onSoft: string;
  /** Border tint matched to this intent (e.g. focus ring on intent). */
  readonly border: string;
}

/** Border-radius ramp. */
export interface Radius {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  /** HUD chrome (top bar pieces, action-bar bar). */
  readonly hud: string;
  /** Fully-round badges/pills. */
  readonly pill: string;
}

/** Spacing ramp (rem-based by default). */
export interface Space {
  readonly 0: string;
  readonly 0.5: string;
  readonly 1: string;
  readonly 1.5: string;
  readonly 2: string;
  readonly 3: string;
  readonly 4: string;
  readonly 6: string;
  readonly 8: string;
  readonly 12: string;
}

/** Typography tokens. */
export interface Typography {
  readonly fontFamily: {
    /** Hero text — phase name, scoreboard headline, winner banner. */
    readonly display: string;
    /** Default UI body text. */
    readonly body: string;
    /** Numeric runs (scores, counters, tabular data). Tabular figures preferred. */
    readonly tabular: string;
    /** Source/code/raw-id rendering. */
    readonly mono: string;
  };
  readonly fontSize: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
    readonly "2xl": string;
    readonly "3xl": string;
  };
  readonly fontWeight: {
    readonly regular: string;
    readonly medium: string;
    readonly bold: string;
  };
  readonly lineHeight: {
    readonly tight: string;
    readonly normal: string;
    readonly relaxed: string;
  };
  readonly letterSpacing: {
    readonly tight: string;
    readonly normal: string;
    readonly wide: string;
    /** All-caps labels ("YOUR TURN"). */
    readonly caps: string;
  };
}

/** Drop-shadow elevation ramp. */
export interface Elevation {
  /** Resting state (cards, panels). */
  readonly rest: string;
  /** Hover-lift (interactive cards). */
  readonly hover: string;
  /** Selected / dragged element. */
  readonly lifted: string;
  /** Modal / overlay stack. */
  readonly overlay: string;
  /** Inner shadow (board canvas inset, resource pill well). */
  readonly inset: string;
}

/**
 * Motion tokens. Components import durations and easings from here so a
 * single `prefers-reduced-motion` switch zeroes everything out at the
 * provider, not per-component.
 */
export interface Motion {
  readonly duration: {
    /** Hover, focus, micro-press (~80ms). */
    readonly fast: string;
    /** Default — most state changes (~160ms). */
    readonly normal: string;
    /** Layout shifts, drawer open/close (~280ms). */
    readonly slow: string;
    /**
     * Looping ambient pulses — active-player breath, dice glow.
     * Components should respect `motion.reducedMotion` before kicking
     * off looping animations.
     */
    readonly ambient: string;
  };
  readonly easing: {
    /** Default for entering / settling. */
    readonly out: string;
    /** Default for exiting. */
    readonly in: string;
    /** Symmetric. */
    readonly inOut: string;
    /** Springy — selected card lift, active-player wobble. */
    readonly spring: string;
  };
  /**
   * `"true"` when the active client requests reduced motion. Components
   * should branch on this rather than forcing animations off via CSS,
   * because some animations (e.g. dice roll, shuffle) are critical for
   * conveying state and need a static fallback.
   */
  readonly reducedMotion: "true" | "false";
}

/**
 * Component-level token slots derived from semantic + foundation tokens.
 * Kept intentionally tiny — a slot is added here only when a component
 * needs to deviate from the semantic mapping in a way that authors
 * should be able to customise without re-skinning the whole intent
 * scale.
 */
export interface ComponentTokens {
  readonly board: {
    /** Outer ring around the board canvas. */
    readonly frameBorder: string;
    /** Inner board surface tint (overlays the canvas tile renderer). */
    readonly frameBackground: string;
    /** Highlight ring drawn on hovered interactive targets. */
    readonly hoverRing: string;
    /** Idle hint colour for eligible-but-unhovered targets. */
    readonly eligibleHint: string;
  };
  readonly card: {
    /** Border drawn around face-up cards. */
    readonly border: string;
    /** Border drawn around face-down cards. */
    readonly backBorder: string;
    /** Card-back fill colour. */
    readonly backBackground: string;
    /** Selected outline. */
    readonly selectedRing: string;
  };
  readonly playerCard: {
    /** Background of the active-player card. */
    readonly activeBackground: string;
    /** Border of the active-player card. */
    readonly activeBorder: string;
    /** Glow colour radiated by the active-player card. */
    readonly activeGlow: string;
    /** Background of the "you" badge. */
    readonly youBadgeBackground: string;
    /** Foreground of the "you" badge. */
    readonly youBadgeForeground: string;
  };
  readonly toast: {
    readonly successBackground: string;
    readonly errorBackground: string;
    readonly infoBackground: string;
    readonly foreground: string;
  };
}

/**
 * The complete theme contract. Every leaf is a CSS-ready string so the
 * provider can emit a CSS variable for each path without per-leaf
 * formatting. {@link DeepPartial} is exported for author overrides.
 */
export interface Theme {
  readonly meta: ThemeMeta;
  readonly color: FoundationColor;
  readonly semantic: SemanticColor;
  readonly radius: Radius;
  readonly space: Space;
  readonly typography: Typography;
  readonly elevation: Elevation;
  readonly motion: Motion;
  readonly player: readonly [
    PlayerColor,
    PlayerColor,
    PlayerColor,
    PlayerColor,
    PlayerColor,
    PlayerColor,
  ];
  readonly component: ComponentTokens;
}

/**
 * Recursive partial for theme overrides. Authors pass this to
 * `<ThemeProvider override={...}/>` (or to a preset's `extend`
 * helper) to tweak individual tokens without re-declaring the whole
 * tree.
 */
export type ThemeOverride = DeepPartial<Theme>;

type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends object
      ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/**
 * Deep merge for {@link Theme} overrides. Arrays (notably
 * {@link Theme.player}) are *replaced* rather than merged so callers
 * can't accidentally end up with mixed-preset palettes.
 */
export function mergeTheme(base: Theme, override?: ThemeOverride): Theme {
  if (!override) return base;
  return mergeDeep(base, override) as Theme;
}

function mergeDeep<T>(base: T, override: unknown): T {
  if (Array.isArray(override)) {
    // Arrays replace wholesale — see contract docs.
    return override as T;
  }
  if (
    base &&
    typeof base === "object" &&
    override &&
    typeof override === "object" &&
    !Array.isArray(base)
  ) {
    const result: Record<string, unknown> = {
      ...(base as Record<string, unknown>),
    };
    for (const [key, value] of Object.entries(
      override as Record<string, unknown>,
    )) {
      if (value === undefined) continue;
      const baseValue = (base as Record<string, unknown>)[key];
      result[key] = mergeDeep(baseValue, value);
    }
    return result as T;
  }
  return override === undefined ? base : (override as T);
}
