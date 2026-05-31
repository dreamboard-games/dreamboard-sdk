import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "bun:test";
import * as sdk from "./index.js";

const repoRoot = path.resolve(import.meta.dir, "../../..");

async function walkFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    for (const entry of await readdir(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist") {
          stack.push(fullPath);
        }
        continue;
      }
      if (entry.isFile() && /\.(ts|tsx|json)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function collectPublicExportGraph(
  entrypoints: string[],
): Promise<string[]> {
  const visited = new Set<string>();
  const stack = entrypoints.map((entrypoint) =>
    path.join(repoRoot, "packages/ui-sdk/src", entrypoint),
  );

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const content = await readFile(current, "utf8");
    for (const specifier of findRelativePublicSpecifiers(content)) {
      const resolved = await resolveSourceSpecifier(current, specifier);
      if (resolved && !visited.has(resolved)) {
        stack.push(resolved);
      }
    }
  }

  return [...visited].sort((left, right) => left.localeCompare(right));
}

function findRelativePublicSpecifiers(content: string): string[] {
  return [
    ...content.matchAll(
      /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g,
    ),
    ...content.matchAll(
      /\bimport\s+(?:type\s+)?(?:[^"']+\s+from\s+)?["']([^"']+)["']/g,
    ),
  ]
    .map((match) => match[1])
    .filter((specifier): specifier is string =>
      Boolean(specifier?.startsWith(".")),
    );
}

async function resolveSourceSpecifier(
  importerPath: string,
  specifier: string,
): Promise<string | null> {
  const basePath = path.resolve(path.dirname(importerPath), specifier);
  const withoutJs = basePath.replace(/\.js$/, "");
  for (const candidate of [
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    path.join(withoutJs, "index.ts"),
    path.join(withoutJs, "index.tsx"),
  ]) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // Try the next source extension.
    }
  }
  return null;
}

test("ui-sdk root does not export runtime construction or provider names", () => {
  for (const exportName of [
    "PluginRuntime",
    "RuntimeProvider",
    "PluginStateProvider",
    "InteractionDescriptor",
    "PluginStateSnapshot",
    "RuntimeAPI",
    "useInteractionHandle",
    "useInteractionByKey",
    "createDreamboardUI",
    "createWorkspaceUIContract",
    "GameActiveActionState",
    "GameChromeState",
    "GamePendingInputState",
  ]) {
    expect(exportName in sdk).toBe(false);
  }
});

test("ui-sdk package exports no runtime or generated-contract subpaths", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repoRoot, "packages/ui-sdk/package.json"), "utf8"),
  ) as { exports?: Record<string, unknown> };

  expect(Object.keys(packageJson.exports ?? {}).sort()).not.toContain(
    "./reducer",
  );
  expect(Object.keys(packageJson.exports ?? {}).sort()).not.toContain(
    "./primitives",
  );
  expect(Object.keys(packageJson.exports ?? {}).sort()).not.toContain(
    "./internal",
  );
  expect(Object.keys(packageJson.exports ?? {}).sort()).not.toContain(
    "./workspace-contract",
  );
  expect(Object.keys(packageJson.exports ?? {}).sort()).not.toContain(
    "./types/runtime-api",
  );
});

test("ui-sdk public root does not re-export runtime primitive modules", async () => {
  const index = await readFile(
    path.join(repoRoot, "packages/ui-sdk/src/index.ts"),
    "utf8",
  );

  expect(index).not.toContain('from "./primitives/index.js"');
  expect(index).not.toContain('from "./reducer.js"');
  expect(index).not.toContain('from "./ui-contract.js"');
  expect(index).not.toContain('from "./workspace-contract.js"');
});

test("public ui-sdk export graph does not bind Dreamboard runtime modules", async () => {
  const files = await collectPublicExportGraph([
    "index.ts",
    "components/index.ts",
    "defaults/index.ts",
  ]);
  const forbiddenFragments = [
    "@dreamboard/manifest-contract",
    "../hooks/useInteractionHandle",
    "../primitives/interaction-submit",
    "../types/plugin-state",
    "../types/runtime-api",
    "../utils/interaction-inputs",
    "../utils/interaction-labels",
    "../../utils/interaction-inputs",
    "../../types/plugin-state",
    "../primitives/index.js",
    "./primitives/index.js",
    "./ui-contract.js",
    "./workspace-contract.js",
    "./reducer.js",
    "useSeatInbox",
    "useInteractionPrimitiveContext",
    "useZonePrimitiveContext",
  ];
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    for (const fragment of forbiddenFragments) {
      if (content.includes(fragment)) {
        offenders.push(
          `${path.relative(path.join(repoRoot, "packages/ui-sdk/src"), filePath)}: ${fragment}`,
        );
      }
    }
  }

  expect(offenders).toEqual([]);
});

test("ui-runtime owns generated-contract construction imports", async () => {
  const seed = await readFile(
    path.join(repoRoot, "packages/workspace-codegen/src/seeds.ts"),
    "utf8",
  );

  expect(seed).toContain('from "@dreamboard-games/ui-runtime";');
  expect(seed).toContain(
    'from "@dreamboard-games/ui-runtime/workspace-contract";',
  );
  expect(seed).not.toContain(
    'from "@dreamboard-games/ui-sdk/workspace-contract";',
  );
  expect(seed).toContain('declare module "@dreamboard-games/ui-runtime"');
});

test("ui-runtime depends on ui-sdk and ui-sdk does not depend on ui-runtime", async () => {
  const uiSdkPackageJson = JSON.parse(
    await readFile(path.join(repoRoot, "packages/ui-sdk/package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const uiRuntimePackageJson = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages/ui-runtime/package.json"),
      "utf8",
    ),
  ) as { dependencies?: Record<string, string> };

  expect(uiRuntimePackageJson.dependencies?.["@dreamboard-games/ui-sdk"]).toBe(
    "workspace:*",
  );
  expect(uiSdkPackageJson.dependencies?.["@dreamboard-games/ui-runtime"]).toBe(
    undefined,
  );
});

test("authored static fixture imports ui-sdk visuals without runtime providers", async () => {
  const fixture = await readFile(
    path.join(
      repoRoot,
      "packages/ui-sdk/src/__fixtures__/static-typecheck/board-typing-smoke.tsx",
    ),
    "utf8",
  );

  expect(fixture).toContain('from "@dreamboard-games/ui-sdk";');
  expect(fixture).not.toContain("@dreamboard-games/ui-runtime");
  expect(fixture).not.toContain("PluginRuntime");
});

test("ui-sdk root and package metadata do not import ui-runtime", async () => {
  const files = await walkFiles(path.join(repoRoot, "packages/ui-sdk/src"));
  const offenders: string[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(
      path.join(repoRoot, "packages/ui-sdk/src"),
      filePath,
    );
    if (
      relativePath.endsWith(".test.ts") ||
      relativePath.endsWith(".test.tsx")
    ) {
      continue;
    }
    const content = await readFile(filePath, "utf8");
    if (content.includes("@dreamboard-games/ui-runtime")) {
      offenders.push(relativePath);
    }
  }

  expect(offenders).toEqual([]);
});

test("ui-sdk source no longer ships Dreamboard-aware runtime modules", async () => {
  const removedPaths = [
    "internal.ts",
    "reducer.ts",
    "ui-contract.ts",
    "workspace-contract.ts",
    "context",
    "runtime",
    "components/PluginRuntime.tsx",
    "components/InteractionForm.tsx",
    "components/surfaces",
    "primitives/board.tsx",
    "primitives/game.tsx",
    "primitives/game-ui-provider.tsx",
    "primitives/interaction.tsx",
    "primitives/interaction-form-binding.tsx",
    "primitives/interaction-submit.ts",
    "primitives/phase.tsx",
    "primitives/player-roster.tsx",
    "primitives/prompt.tsx",
    "primitives/ui.tsx",
    "primitives/zone.tsx",
    "primitives/index.ts",
    "hooks/useActivePlayers.ts",
    "hooks/useBoardInteractions.ts",
    "hooks/useGameSelector.ts",
    "hooks/useGameView.ts",
    "hooks/useInteractionByKey.ts",
    "hooks/useInteractionHandle.ts",
    "hooks/useIsMyTurn.ts",
    "hooks/useLobby.ts",
    "hooks/useMe.ts",
    "hooks/usePlayerInfo.ts",
    "hooks/usePlayerTurnOrder.ts",
    "hooks/usePluginRuntime.ts",
    "hooks/useSeatInbox.ts",
    "hooks/useSimultaneousPhase.ts",
    "types/plugin-state.ts",
    "types/runtime-api.ts",
    "types/reducer-state.ts",
    "utils/interaction-router.ts",
    "utils/interaction-inputs.ts",
    "utils/interaction-status.ts",
    "utils/interaction-labels.ts",
  ];
  const offenders: string[] = [];
  for (const removedPath of removedPaths) {
    const fullPath = path.join(repoRoot, "packages/ui-sdk/src", removedPath);
    const exists = await readFile(fullPath, "utf8")
      .then(() => true)
      .catch(() => false);
    if (exists) offenders.push(removedPath);
  }
  expect(offenders).toEqual([]);
});

test("ui-runtime generated-contract code does not bind sdk runtime primitives", async () => {
  const files = [
    "packages/ui-runtime/src/ui-contract.ts",
    "packages/ui-runtime/src/workspace-contract.ts",
  ];
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await readFile(path.join(repoRoot, filePath), "utf8");
    if (content.includes("@dreamboard-games/ui-sdk/primitives")) {
      offenders.push(filePath);
    }
  }

  expect(offenders).toEqual([]);
});
