import { describe, expect, test } from "vitest";
import {
  arcadeTheme,
  buttonStyle,
  chipStyle,
  cssVar,
  cssVarOr,
  getThemePreset,
  intentForVariant,
  mergeTheme,
  motionDuration,
  playerColor,
  resolveTheme,
  studioTheme,
  surfaceStyle,
  tabletopTheme,
  themeToCssVars,
  type Theme,
  type ThemeOverride,
} from "./index.js";

const PRESETS: ReadonlyArray<{ id: string; theme: Theme }> = [
  { id: "tabletop", theme: tabletopTheme },
  { id: "arcade", theme: arcadeTheme },
  { id: "studio", theme: studioTheme },
];

/**
 * The token contract is a public surface — every preset must carry
 * the same shape so any author override that compiles against
 * `tabletop` also works against `arcade`/`studio`. A structural diff
 * here catches preset drift before it reaches downstream components.
 */
describe("preset structural parity", () => {
  function shape(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(shape);
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        out[key] = shape((value as Record<string, unknown>)[key]);
      }
      return out;
    }
    // Replace scalar leaves with their type so identical structures
    // compare equal regardless of token *values*.
    return typeof value;
  }

  const expected = shape(tabletopTheme);
  for (const preset of PRESETS) {
    test(`${preset.id} matches the canonical token shape`, () => {
      expect(shape(preset.theme)).toEqual(expected);
    });
  }

  test("every preset declares exactly six player colors", () => {
    for (const preset of PRESETS) {
      expect(preset.theme.player).toHaveLength(6);
    }
  });

  test("preset meta.id is unique across presets", () => {
    const ids = PRESETS.map((p) => p.theme.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveTheme", () => {
  test("returns the tabletop preset by default", () => {
    expect(resolveTheme(undefined)).toBe(tabletopTheme);
  });

  test("looks up presets by id", () => {
    expect(resolveTheme("tabletop")).toBe(tabletopTheme);
    expect(resolveTheme("arcade")).toBe(arcadeTheme);
    expect(resolveTheme("studio")).toBe(studioTheme);
  });

  test("passes through a fully-resolved theme", () => {
    expect(resolveTheme(tabletopTheme)).toBe(tabletopTheme);
  });

  test("throws for an unknown preset id", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolveTheme("nope" as any),
    ).toThrow(/unknown theme preset/i);
  });

  test("getThemePreset returns the same value as resolveTheme(id)", () => {
    expect(getThemePreset("arcade")).toBe(arcadeTheme);
  });
});

describe("mergeTheme deep override semantics", () => {
  test("scalar overrides replace the matching leaf without touching siblings", () => {
    const override: ThemeOverride = {
      semantic: {
        intent: {
          primary: { solid: "#ff0000" },
        },
      },
    };
    const merged = mergeTheme(tabletopTheme, override);
    expect(merged.semantic.intent.primary.solid).toBe("#ff0000");
    // Sibling token preserved.
    expect(merged.semantic.intent.primary.on).toBe(
      tabletopTheme.semantic.intent.primary.on,
    );
    // Sibling intent preserved.
    expect(merged.semantic.intent.danger).toEqual(
      tabletopTheme.semantic.intent.danger,
    );
    // Original is not mutated.
    expect(tabletopTheme.semantic.intent.primary.solid).not.toBe("#ff0000");
  });

  test("undefined override values fall through to the base theme", () => {
    const merged = mergeTheme(tabletopTheme, {
      meta: { name: undefined },
    });
    expect(merged.meta.name).toBe(tabletopTheme.meta.name);
  });

  test("array overrides replace wholesale rather than merging element-wise", () => {
    const customPlayers: ThemeOverride["player"] = [
      { solid: "#111", soft: "#222", on: "#fff" },
      { solid: "#333", soft: "#444", on: "#fff" },
      { solid: "#555", soft: "#666", on: "#fff" },
      { solid: "#777", soft: "#888", on: "#fff" },
      { solid: "#999", soft: "#aaa", on: "#fff" },
      { solid: "#bbb", soft: "#ccc", on: "#fff" },
    ];
    const merged = mergeTheme(tabletopTheme, { player: customPlayers });
    expect(merged.player).toHaveLength(6);
    expect(merged.player[0].solid).toBe("#111");
    // Wholesale replacement: first base player slot (red) is gone.
    expect(merged.player[0].solid).not.toBe(tabletopTheme.player[0].solid);
  });

  test("returns the same reference when override is undefined (no allocation)", () => {
    expect(mergeTheme(tabletopTheme, undefined)).toBe(tabletopTheme);
  });
});

describe("themeToCssVars serializer", () => {
  test("emits a flat record of --db-* variables", () => {
    const vars = themeToCssVars(tabletopTheme) as Record<string, string>;
    for (const key of Object.keys(vars)) {
      expect(key.startsWith("--db-")).toBe(true);
    }
  });

  test("converts dotted token paths to kebab-case", () => {
    const vars = themeToCssVars(tabletopTheme) as Record<string, string>;
    expect(vars["--db-semantic-intent-primary-solid"]).toBe(
      tabletopTheme.semantic.intent.primary.solid,
    );
    expect(vars["--db-color-brand-600"]).toBe(tabletopTheme.color.brand[600]);
    expect(vars["--db-radius-md"]).toBe(tabletopTheme.radius.md);
  });

  test("uses 1-based indices for player array entries", () => {
    const vars = themeToCssVars(tabletopTheme) as Record<string, string>;
    expect(vars["--db-player-1-solid"]).toBe(tabletopTheme.player[0].solid);
    expect(vars["--db-player-6-solid"]).toBe(tabletopTheme.player[5].solid);
    expect(vars["--db-player-0-solid"]).toBeUndefined();
  });

  test("scalar leaves are stringified (no nested objects in output)", () => {
    const vars = themeToCssVars(tabletopTheme) as Record<string, string>;
    for (const value of Object.values(vars)) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("cssVar / cssVarOr helpers", () => {
  test("cssVar builds the canonical --db-* reference", () => {
    expect(cssVar("semantic", "intent", "primary", "solid")).toBe(
      "var(--db-semantic-intent-primary-solid)",
    );
    expect(cssVar("player", 1, "solid")).toBe("var(--db-player-1-solid)");
  });

  test("cssVarOr injects a fallback value", () => {
    expect(cssVarOr("transparent", "semantic", "border", "default")).toBe(
      "var(--db-semantic-border-default, transparent)",
    );
  });
});

describe("derived style helpers", () => {
  test("buttonStyle picks intent colours for the requested variant", () => {
    const style = buttonStyle(tabletopTheme, { variant: "danger" });
    expect(style.background).toBe(tabletopTheme.semantic.intent.danger.solid);
    expect(style.color).toBe(tabletopTheme.semantic.intent.danger.on);
  });

  test("buttonStyle disabled drops to the inset surface and disabled text", () => {
    const style = buttonStyle(tabletopTheme, {
      variant: "primary",
      disabled: true,
    });
    expect(style.background).toBe(tabletopTheme.semantic.surface.inset);
    expect(style.color).toBe(tabletopTheme.semantic.text.disabled);
    expect(style.cursor).toBe("not-allowed");
    expect(style.boxShadow).toBe("none");
  });

  test("buttonStyle ghost variant has no fill or border colour", () => {
    const style = buttonStyle(tabletopTheme, { variant: "ghost" });
    expect(style.background).toBe("transparent");
    expect(style.boxShadow).toBe("none");
    expect(style.color).toBe(tabletopTheme.semantic.text.primary);
  });

  test("chipStyle reads the soft intent slot for tinted backgrounds", () => {
    const style = chipStyle(tabletopTheme, { variant: "success" });
    expect(style.background).toBe(tabletopTheme.semantic.intent.success.soft);
    expect(style.color).toBe(tabletopTheme.semantic.intent.success.onSoft);
  });

  test("surfaceStyle defaults to the card surface and rest elevation", () => {
    const style = surfaceStyle(tabletopTheme);
    expect(style.background).toBe(tabletopTheme.semantic.surface.card);
    expect(style.boxShadow).toBe(tabletopTheme.elevation.rest);
  });

  test("intentForVariant ghost falls back to the secondary intent slot", () => {
    expect(intentForVariant(tabletopTheme, "ghost")).toBe(
      tabletopTheme.semantic.intent.secondary,
    );
  });

  test("playerColor wraps slot indices around the palette length", () => {
    expect(playerColor(tabletopTheme, 0)).toBe(tabletopTheme.player[0]);
    expect(playerColor(tabletopTheme, tabletopTheme.player.length)).toBe(
      tabletopTheme.player[0],
    );
    expect(playerColor(tabletopTheme, -1)).toBe(
      tabletopTheme.player[tabletopTheme.player.length - 1],
    );
  });

  test("motionDuration zeroes out durations when reducedMotion is true", () => {
    const reduced = mergeTheme(tabletopTheme, {
      motion: { reducedMotion: "true" },
    });
    expect(motionDuration(tabletopTheme, "normal")).toBe(
      tabletopTheme.motion.duration.normal,
    );
    expect(motionDuration(reduced, "normal")).toBe("0ms");
    expect(motionDuration(reduced, "ambient")).toBe("0ms");
  });
});
