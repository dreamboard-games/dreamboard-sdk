/**
 * Snapshot of the public export surface of the main facade entry points.
 *
 * This is a refactoring safety net: internal restructuring must never
 * add or drop a public name from these facades. Imports are relative to
 * source files (not package subpaths) so the test is independent of the
 * package.json `exports` map while files move around.
 */
import { describe, expect, test } from "vitest";

const facades = {
  root: () => import("./index.js"),
  react: () => import("./react.js"),
  reducer: () => import("./reducer.js"),
  testing: () => import("./testing.js"),
} as const;

describe("public export surface", () => {
  for (const [name, load] of Object.entries(facades)) {
    test(`${name} export names are stable`, async () => {
      const module = await load();
      expect(Object.keys(module).sort()).toMatchSnapshot();
    });
  }

  test("reducer facade stays within the agent-surface value budget", async () => {
    const names = Object.keys(await import("./reducer.js")).sort();

    expect(names.length).toBeLessThanOrEqual(80);
    expect(names).not.toContain("createClientParamSchemasByPhase");
    expect(names).not.toContain("createManifestRuntimeSchema");
    expect(names).not.toContain("applySetupBootstrap");
  });

  test("testing facade keeps CLI runtime plumbing off the author path", async () => {
    const names = Object.keys(await import("./testing.js")).sort();

    expect(names).not.toContain("resolveScenarioCommandParams");
    expect(names).not.toContain("digestScenarioProjection");
    expect(names).not.toContain("scenarioProjectionInputMetadata");
    expect(names).not.toContain("scenarioProjectionParityFromInspectNode");
  });
});
