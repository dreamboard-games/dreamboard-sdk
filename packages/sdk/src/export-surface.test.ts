/**
 * Snapshot of the public export surface of the main facade entry points.
 *
 * This is a refactoring safety net: internal restructuring must never
 * add or drop a public name from these facades. Imports are relative to
 * source files (not package subpaths) so the test is independent of the
 * package.json `exports` map while files move around.
 */
import { describe, expect, test } from "bun:test";

const facades = {
  reducer: () => import("./reducer.js"),
  runtime: () => import("./runtime.js"),
  "runtime/primitives": () => import("./runtime/primitives.js"),
  "runtime/workspace-contract": () => import("./runtime/workspace-contract.js"),
  ui: () => import("./ui.js"),
  types: () => import("./types.js"),
  testing: () => import("./testing.js"),
  "browser-interaction": () => import("./browser-interaction.js"),
} as const;

describe("public export surface", () => {
  for (const [name, load] of Object.entries(facades)) {
    test(`${name} export names are stable`, async () => {
      const module = await load();
      expect(Object.keys(module).sort()).toMatchSnapshot();
    });
  }
});
