#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  expectedReferenceGameIds,
  referenceGamesRoot,
  root,
} from "./reference-games-lib.mjs";

const sourceExtensions = /\.(mjs|js|jsx|ts|tsx|json|yaml|yml|md)$/;

const deprecatedReferencePatterns = [
  {
    id: "renderSummary",
    pattern: /\brenderSummary\b/,
    message: "Use <hand.Summary> instead of renderSummary.",
  },
  {
    id: "renderActions",
    pattern: /\brenderActions\b/,
    message: "Use <hand.Actions> instead of renderActions.",
  },
  {
    id: "useMobileHandTrayActive",
    pattern: /\buseMobileHandTrayActive\b/,
    message: "Use <Game.Viewport> overlay insets instead of tray state.",
  },
  {
    id: "published sushi-go",
    pattern: /examples\/published\/sushi-go/,
    message: "Retired public examples must not return.",
  },
  {
    id: "wobbly notebook border",
    pattern: /\bwobbly-border(?:-[a-z]+)?\b/,
    message: "Use theme-derived Panel styling instead of retired notebook CSS.",
  },
  {
    id: "hard shadow",
    pattern: /\bhard-shadow(?:-[a-z]+)?\b/,
    message: "Use theme-derived Panel styling instead of retired shadow CSS.",
  },
  {
    id: "browser interaction protocol 2",
    pattern: /browserInteractionProtocol["']?\s*[:=]\s*["']2\.0\.0["']/,
    message: "Protocol 2.0.0 compatibility code is past the migration window.",
  },
];

const forbiddenDriverFallbacks = [
  /\bgetByText\s*\(/,
  /\bgetByLabel\s*\(/,
  /\bgetByRole\s*\(/,
  /\btext\s*[:=]\s*["'`]/,
  /\brole\s*[:=]\s*["'`]/,
  /dom[- ]order/i,
];

async function collectFiles(dir) {
  const files = [];
  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          !["node_modules", "dist", "storybook-static"].includes(entry.name)
        ) {
          await visit(absolute);
        }
        continue;
      }
      if (entry.isFile() && sourceExtensions.test(entry.name)) {
        files.push(absolute);
      }
    }
  }
  await visit(dir);
  return files.sort((left, right) => left.localeCompare(right));
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

async function scanPatterns({ files, patterns, failures }) {
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const relative = path.relative(root, filePath);
    for (const check of patterns) {
      const match = check.pattern.exec(source);
      if (match?.index !== undefined) {
        failures.push(
          `${relative}:${lineNumberFor(source, match.index)} ${check.id}: ${check.message}`,
        );
      }
    }
  }
}

async function assertReferenceGamesAbsentFromDemoRegistries(failures) {
  const files = await collectFiles(root);
  const registryFiles = files.filter((filePath) => {
    const relative = path.relative(root, filePath);
    return (
      !relative.startsWith("docs/exec-plans/") &&
      !relative.startsWith("examples/reference-games/") &&
      !relative.startsWith("fixtures/ui/") &&
      !relative.startsWith("scripts/ui/") &&
      /(demo|gallery|registry|route|deploy|published)/i.test(relative)
    );
  });
  for (const filePath of registryFiles) {
    const source = await readFile(filePath, "utf8");
    const relative = path.relative(root, filePath);
    for (const gameId of expectedReferenceGameIds) {
      if (
        source.includes(`examples/reference-games/${gameId}`) ||
        source.includes(`@dreamboard-reference/${gameId}`)
      ) {
        failures.push(
          `${relative}: reference game ${gameId} appears in a demo/deployment registry.`,
        );
      }
    }
  }
}

async function assertNoWorkspaceLinksInReferenceConsumers(failures) {
  const files = await collectFiles(referenceGamesRoot);
  for (const filePath of files.filter((file) =>
    /(?:package\.json|pnpm-lock\.yaml)$/.test(file),
  )) {
    const source = await readFile(filePath, "utf8");
    if (/workspace:|link:|file:\.\./.test(source)) {
      failures.push(
        `${path.relative(root, filePath)}: packed reference consumers must not contain workspace, link, or parent file links.`,
      );
    }
  }
}

async function assertRenderModulesStayExternalized(failures) {
  const files = await collectFiles(
    path.join(root, "fixtures/ui/reference-games/modules"),
  );
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const relative = path.relative(root, filePath);
    if (/node_modules\/(?:react|@dreamboard-games\/sdk)/.test(source)) {
      failures.push(
        `${relative}: fixture render module appears to bundle React or SDK code.`,
      );
    }
    if (!/\bfrom\s+["']react["']/.test(source)) {
      failures.push(
        `${relative}: fixture render module must keep React externalized.`,
      );
    }
  }
}

async function assertNoBrowserDriverFallbacks(failures) {
  const files = await collectFiles(
    path.join(root, "packages/ui-workbench/tests/driver"),
  );
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const relative = path.relative(root, filePath);
    for (const pattern of forbiddenDriverFallbacks) {
      const match = pattern.exec(source);
      if (match?.index !== undefined) {
        failures.push(
          `${relative}:${lineNumberFor(source, match.index)} forbidden browser-driver fallback ${pattern}.`,
        );
      }
    }
  }
}

async function main() {
  const failures = [];
  await scanPatterns({
    files: [
      ...(await collectFiles(path.join(root, "packages/sdk/src"))),
      ...(await collectFiles(path.join(root, "examples/reference-games"))),
      ...(await collectFiles(
        path.join(root, "fixtures/ui/reference-games/modules"),
      )),
      path.join(root, "packages/sdk/REFERENCE.md"),
      path.join(root, "docs/reference/agent-api.md"),
      path.join(root, "docs/ui-agent-iteration.md"),
      path.join(root, "docs/reference-games.md"),
    ],
    patterns: deprecatedReferencePatterns,
    failures,
  });
  await assertReferenceGamesAbsentFromDemoRegistries(failures);
  await assertNoWorkspaceLinksInReferenceConsumers(failures);
  await assertRenderModulesStayExternalized(failures);
  await assertNoBrowserDriverFallbacks(failures);

  if (failures.length > 0) {
    console.error("UI hard-cut guard failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("UI hard-cut guard passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
