import type { CSSProperties } from "react";
import type { Theme } from "./tokens.js";

/**
 * CSS variable bridge for {@link Theme}.
 *
 * The {@link ThemeProvider} mounts a wrapper element and applies the
 * map returned by {@link themeToCssVars} as inline `style`, which
 * declares one CSS custom property per leaf token. Components inside
 * the provider can:
 *
 * 1. Read tokens via `useTheme()` (typed) and use them inline, or
 * 2. Read the CSS variable directly in Tailwind / className styling
 *    via the helpers in {@link var()} below.
 *
 * The variable naming scheme is `--db-<dot.path>` with `.` and any
 * non-identifier characters replaced by `-`. Example:
 *
 * - `theme.semantic.intent.primary.solid` → `--db-semantic-intent-primary-solid`
 * - `theme.player[0].solid`              → `--db-player-1-solid`
 * - `theme.color.brand.600`              → `--db-color-brand-600`
 *
 * The 1-based player suffix (rather than 0-based) keeps the variable
 * name aligned with how seats are labelled in product UI ("Player 1").
 */

const PREFIX = "--db";

/** Convert a token-tree path to a kebab-case CSS variable name. */
function toVarName(parts: ReadonlyArray<string | number>): string {
  const tail = parts
    .map((part) => String(part))
    .join("-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-");
  return `${PREFIX}-${tail}`;
}

/**
 * Walk the theme tree and produce a flat `{ "--db-...": value }` map.
 * Arrays are walked positionally with a 1-based index (so
 * `theme.player[0]` → `--db-player-1-...`).
 */
export function themeToCssVars(theme: Theme): CSSProperties {
  const out: Record<string, string> = {};
  walk(theme as unknown as Record<string, unknown>, [], out);
  return out as CSSProperties;
}

function walk(
  node: unknown,
  path: ReadonlyArray<string | number>,
  out: Record<string, string>,
): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string" || typeof node === "number") {
    out[toVarName(path)] = String(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, idx) => {
      // 1-based index for player slots, etc.
      walk(child, [...path, idx + 1], out);
    });
    return;
  }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(
      node as Record<string, unknown>,
    )) {
      walk(value, [...path, key], out);
    }
  }
}

/**
 * Build a `var(--db-...)` reference for a token path.
 *
 * @example
 * ```ts
 * cssVar("semantic", "intent", "primary", "solid")
 *   // => "var(--db-semantic-intent-primary-solid)"
 * cssVar("player", 1, "solid")
 *   // => "var(--db-player-1-solid)"
 * ```
 */
export function cssVar(...path: Array<string | number>): string {
  return `var(${toVarName(path)})`;
}

/**
 * Convenience for declaring a `var(--db-...)` with an inline fallback.
 *
 * @example
 * ```ts
 * cssVarOr("transparent", "semantic", "border", "default")
 *   // => "var(--db-semantic-border-default, transparent)"
 * ```
 */
export function cssVarOr(
  fallback: string,
  ...path: Array<string | number>
): string {
  return `var(${toVarName(path)}, ${fallback})`;
}
