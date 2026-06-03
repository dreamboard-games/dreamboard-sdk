import type { Theme } from "../tokens.js";

/**
 * `tabletop` — the default Dreamboard theme.
 *
 * Visual identity: warm paper backgrounds, deep ink-blue brand,
 * confident type, rounded but disciplined corners. Designed to feel
 * like a polished hobby-game client (Splendor digital, modern Catan
 * apps) without leaning into a specific game's IP.
 *
 * Picked deliberately for the default: a board game UI sitting on
 * cool grey or pure white reads as "spreadsheet"; warm parchment
 * cues "play" without sliding into kitsch.
 */
export const tabletopTheme: Theme = {
  meta: {
    id: "tabletop",
    name: "Tabletop",
    mode: "light",
  },
  color: {
    neutral: {
      50: "#fbf8f1",
      100: "#f4ecd8",
      200: "#e7dcc1",
      400: "#a89c84",
      600: "#5f5547",
      800: "#2f2a22",
      950: "#15120d",
    },
    brand: {
      50: "#eef3fb",
      100: "#d3e0f3",
      200: "#a7c1e7",
      400: "#5780bf",
      600: "#2d5da1",
      800: "#1a3c6b",
      950: "#0d1f37",
    },
    accent: {
      50: "#fff5e0",
      100: "#ffe5b3",
      200: "#fcd07a",
      400: "#f0a738",
      600: "#c87a16",
      800: "#7e4a08",
      950: "#3c2103",
    },
    success: {
      50: "#e8f6ec",
      100: "#c4ecd0",
      200: "#8fd6a3",
      400: "#3fae62",
      600: "#1f7d3e",
      800: "#0d4a23",
      950: "#062213",
    },
    warning: {
      50: "#fff5dc",
      100: "#ffe7a8",
      200: "#fad164",
      400: "#dca41a",
      600: "#9c6f06",
      800: "#5b4002",
      950: "#2b1d00",
    },
    danger: {
      50: "#fdecec",
      100: "#f9c7c7",
      200: "#f08e8e",
      400: "#d53f3f",
      600: "#a31d1d",
      800: "#5e0d0d",
      950: "#2a0404",
    },
    info: {
      50: "#e6f5fb",
      100: "#bfe3f4",
      200: "#7ec5e6",
      400: "#2f8fc4",
      600: "#0d5e8a",
      800: "#073650",
      950: "#021a26",
    },
  },
  semantic: {
    surface: {
      app: "#f6efe0",
      board: "#1a3552",
      hud: "#fbf8f1",
      card: "#ffffff",
      sheet: "#fbf8f1",
      overlay: "rgba(15, 23, 42, 0.55)",
      inset: "#f4ecd8",
    },
    text: {
      primary: "#2f2a22",
      muted: "#5f5547",
      onIntent: "#ffffff",
      accent: "#1a3c6b",
      disabled: "#a89c84",
    },
    border: {
      subtle: "#e7dcc1",
      default: "#a89c84",
      strong: "#5f5547",
      focus: "#2d5da1",
    },
    intent: {
      primary: {
        solid: "#2d5da1",
        on: "#ffffff",
        soft: "#d3e0f3",
        onSoft: "#1a3c6b",
        border: "#1a3c6b",
      },
      secondary: {
        solid: "#fbf8f1",
        on: "#2f2a22",
        soft: "#f4ecd8",
        onSoft: "#2f2a22",
        border: "#a89c84",
      },
      success: {
        solid: "#1f7d3e",
        on: "#ffffff",
        soft: "#c4ecd0",
        onSoft: "#0d4a23",
        border: "#0d4a23",
      },
      danger: {
        solid: "#a31d1d",
        on: "#ffffff",
        soft: "#f9c7c7",
        onSoft: "#5e0d0d",
        border: "#5e0d0d",
      },
      warning: {
        solid: "#dca41a",
        on: "#2f2a22",
        soft: "#ffe7a8",
        onSoft: "#5b4002",
        border: "#9c6f06",
      },
      info: {
        solid: "#0d5e8a",
        on: "#ffffff",
        soft: "#bfe3f4",
        onSoft: "#073650",
        border: "#073650",
      },
    },
  },
  radius: {
    none: "0px",
    sm: "6px",
    md: "10px",
    lg: "16px",
    hud: "20px",
    pill: "9999px",
  },
  space: {
    0: "0",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    6: "1.5rem",
    8: "2rem",
    12: "3rem",
  },
  typography: {
    fontFamily: {
      display:
        '"Fraunces", "Iowan Old Style", "Source Serif Pro", "Georgia", serif',
      body: '"Inter", "SF Pro Text", system-ui, -apple-system, sans-serif',
      tabular: '"JetBrains Mono", "SF Mono", "ui-monospace", monospace',
      mono: '"JetBrains Mono", "SF Mono", "ui-monospace", monospace',
    },
    fontSize: {
      xs: "0.6875rem",
      sm: "0.8125rem",
      md: "0.9375rem",
      lg: "1.0625rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "2rem",
    },
    fontWeight: {
      regular: "400",
      medium: "500",
      bold: "700",
    },
    lineHeight: {
      tight: "1.15",
      normal: "1.4",
      relaxed: "1.6",
    },
    letterSpacing: {
      tight: "-0.01em",
      normal: "0",
      wide: "0.04em",
      caps: "0.14em",
    },
  },
  elevation: {
    rest: "0 1px 0 rgba(15, 18, 13, 0.06), 0 2px 6px rgba(15, 18, 13, 0.05)",
    hover: "0 4px 0 rgba(15, 18, 13, 0.05), 0 8px 18px rgba(15, 18, 13, 0.12)",
    lifted:
      "0 12px 0 rgba(15, 18, 13, 0.05), 0 18px 36px rgba(15, 18, 13, 0.18)",
    overlay: "0 24px 64px rgba(15, 18, 13, 0.32)",
    inset: "inset 0 1px 0 rgba(15, 18, 13, 0.08)",
  },
  motion: {
    duration: {
      fast: "80ms",
      normal: "160ms",
      slow: "280ms",
      ambient: "1800ms",
    },
    easing: {
      out: "cubic-bezier(0.16, 1, 0.3, 1)",
      in: "cubic-bezier(0.4, 0, 1, 0.4)",
      inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
    reducedMotion: "false",
  },
  player: [
    { solid: "#d04848", soft: "#fcdedd", on: "#ffffff" },
    { solid: "#2d5da1", soft: "#d3e0f3", on: "#ffffff" },
    { solid: "#1f7d3e", soft: "#c4ecd0", on: "#ffffff" },
    { solid: "#c87a16", soft: "#ffe5b3", on: "#2f2a22" },
    { solid: "#7d4a8a", soft: "#e6d6ee", on: "#ffffff" },
    { solid: "#0d5e8a", soft: "#bfe3f4", on: "#ffffff" },
  ],
  component: {
    board: {
      frameBorder: "#a89c84",
      frameBackground: "#1a3552",
      hoverRing: "#f0a738",
      eligibleHint: "rgba(240, 167, 56, 0.55)",
    },
    card: {
      border: "#2f2a22",
      backBorder: "#1a3c6b",
      backBackground: "#2d5da1",
      selectedRing: "#d04848",
    },
    playerCard: {
      activeBackground: "#fff5e0",
      activeBorder: "#f0a738",
      activeGlow: "rgba(240, 167, 56, 0.32)",
      youBadgeBackground: "#d3e0f3",
      youBadgeForeground: "#1a3c6b",
    },
    toast: {
      successBackground: "#1f7d3e",
      errorBackground: "#a31d1d",
      infoBackground: "#0d5e8a",
      foreground: "#ffffff",
    },
  },
};
