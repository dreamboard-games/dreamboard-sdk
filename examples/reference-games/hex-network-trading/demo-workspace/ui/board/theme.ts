import type { GameView } from "#dreamboard/ui-contract";

type Terrain = GameView["spaces"][number]["terrain"];
type LandTerrain = Exclude<Terrain, "borderland">;

// Hand-drawn design tokens.
//
// The wider Dreamboard brand is a warm-paper notebook: pencil-black
// strokes on Warm Paper with Post-it accents. The board used to render
// as a dark sci-fi panel that clashed with that language, so the whole
// palette is framed here in pastel pencil-and-ink terms.
export const PAPER = "#fdfbf7";
export const PAPER_MUTED = "#e5e0d8";
export const PENCIL = "#2d2d2d";
export const POSTIT = "#fff9c4";
export const ACCENT_RED = "#ff4d4d";
export const HAND_FONT = "Patrick Hand, Caveat, ui-sans-serif, cursive";

export const TERRAIN_THEME: Record<
  LandTerrain,
  {
    readonly label: string;
    readonly icon: string;
    readonly fill: string;
    readonly inner: string;
    readonly accent: string;
  }
> = {
  timberGrove: {
    label: "Timber Grove",
    icon: "🌲",
    fill: "#dfecd5",
    inner: "#cbdfbd",
    accent: "#5a8a4a",
  },
  clayPit: {
    label: "Clay Pit",
    icon: "🧱",
    fill: "#f5dcc7",
    inner: "#edc9ac",
    accent: "#c2714a",
  },
  grainField: {
    label: "Grain Field",
    icon: "🌾",
    fill: "#f7edbf",
    inner: "#eadc94",
    accent: "#b8972e",
  },
  ironHills: {
    label: "Iron Hills",
    icon: "⛏️",
    fill: "#dcecf5",
    inner: "#c6dfec",
    accent: "#4a8eb8",
  },
  flaxMeadow: {
    label: "Flax Meadow",
    icon: "🧵",
    fill: "#ece4f5",
    inner: "#ddd0ee",
    accent: "#8b6bcf",
  },
  badlands: {
    label: "Badlands",
    icon: "🌵",
    fill: "#f3d8d8",
    inner: "#e8c3c3",
    accent: "#b05a5a",
  },
};

// Resource-tinted pastels for 2:1 port sticky notes. 3:1 generic ports
// use plain Post-it yellow so the trading rate reads before the good.
export const PORT_TINT: Record<string, string> = {
  "3:1": POSTIT,
  iron: "#dcecf5",
  grain: "#f7edbf",
  cloth: "#ece4f5",
  timber: "#dfecd5",
  clay: "#f5dcc7",
};

export const PORT_ACCENT: Record<string, string> = {
  "3:1": "#c2a13a",
  iron: "#4a8eb8",
  grain: "#b8972e",
  cloth: "#8b6bcf",
  timber: "#5a8a4a",
  clay: "#c2714a",
};

export const PORT_LABEL: Record<string, string> = {
  "3:1": "3:1",
  iron: "Fe",
  grain: "GR",
  cloth: "CL",
  timber: "TB",
  clay: "CY",
};
