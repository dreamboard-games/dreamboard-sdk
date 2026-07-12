/**
 * Snapshot of the public export surface of the main facade entry points.
 *
 * This is a refactoring safety net: internal restructuring must never
 * add or drop a public name from these facades. Imports are relative to
 * source files (not package subpaths) so the test is independent of the
 * package.json `exports` map while files move around.
 */
import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const facades = {
  reducer: () => import("./reducer.js"),
  "reducer/advanced": () => import("./reducer/advanced.js"),
  runtime: () => import("./runtime.js"),
  "runtime/primitives": () => import("./runtime/primitives.js"),
  "runtime/workspace-contract": () => import("./runtime/workspace-contract.js"),
  "reference-games": () => import("./reference-games/index.js"),
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

  test("reducer facade stays within the agent-surface value budget", async () => {
    const names = Object.keys(await import("./reducer.js")).sort();

    expect(names.length).toBeLessThanOrEqual(80);
    expect(names).not.toContain("createClientParamSchemasByPhase");
    expect(names).not.toContain("createManifestRuntimeSchema");
    expect(names).not.toContain("applySetupBootstrap");
  });

  test("reducer declaration surface keeps advanced types off the author facade", () => {
    const result = Bun.spawnSync({
      cmd: [
        "node",
        `${repoRoot}/scripts/list-dts-exports.mjs`,
        `${packageRoot}/dist/reducer.d.ts`,
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).toBe(0);

    const names = result.stdout
      .toString()
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    expect(names.length).toBeLessThanOrEqual(145);
    expect(names).not.toContain("CardIdOfTable");
    expect(names).not.toContain("ClientParamsOfInteractionOfDefinition");
    expect(names).not.toContain("RuntimeCardData");
    expect(names).not.toContain("ResolvedContainerLocation");
    expect(names).not.toContain("InteractionActionabilityResult");
    expect(names).not.toContain("InteractionInputEnumerationResult");
  });

  test("testing facade keeps CLI runtime plumbing off the author path", async () => {
    const names = Object.keys(await import("./testing.js")).sort();

    expect(names).not.toContain("resolveScenarioCommandParams");
    expect(names).not.toContain("digestScenarioProjection");
    expect(names).not.toContain("scenarioProjectionInputMetadata");
    expect(names).not.toContain("scenarioProjectionParityFromInspectNode");
  });
});
