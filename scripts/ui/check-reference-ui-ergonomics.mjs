#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = [
  "examples/reference-games",
  "fixtures/ui/reference-games/modules",
].map((relativePath) => path.join(repoRoot, relativePath));

const deprecatedPatterns = [
  {
    id: "renderSummary",
    pattern: /\brenderSummary\s*=/,
    message: "Use <hand.Summary> instead of renderSummary.",
  },
  {
    id: "renderActions",
    pattern: /\brenderActions\s*=/,
    message: "Use <hand.Actions> instead of renderActions.",
  },
  {
    id: "useMobileHandTrayActive",
    pattern: /\buseMobileHandTrayActive\s*\(/,
    message: "Use <Game.Viewport> overlay insets instead of tray state.",
  },
  {
    id: "local ActionPanel",
    pattern: /\bfunction\s+ActionPanel\s*\(/,
    message: "Use the SDK Panel primitive instead of local ActionPanel.",
  },
  {
    id: "manual root nest",
    pattern:
      /<UI\.Root[\s\S]*?<Game\.Root[\s\S]*?<Phase\.Switch|React\.createElement\(\s*UI\.Root[\s\S]*?React\.createElement\(\s*Game\.Root[\s\S]*?React\.createElement\(\s*Phase\.Switch/,
    message: "Use UI.defineGameUI instead of manual UI/Game/Phase nesting.",
  },
];

const hardCodedMobilePaddingPattern =
  /padding(?:Bottom|Top)?\s*[:=]\s*["'`][^"'`]*(?:mobile|hand|tray|safe-area-inset-bottom|92px)[^"'`]*["'`]/i;

async function collectFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (/\.(mjs|js|jsx|ts|tsx)$/.test(entry.name)) files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split("\n").length;
}

const failures = [];
for (const root of scanRoots) {
  for (const filePath of await collectFiles(root)) {
    const source = await readFile(filePath, "utf8");
    const relativePath = path.relative(repoRoot, filePath);
    for (const check of deprecatedPatterns) {
      const match = check.pattern.exec(source);
      if (match?.index !== undefined) {
        failures.push(
          `${relativePath}:${lineNumberFor(source, match.index)} ${check.id}: ${check.message}`,
        );
      }
    }
    const paddingMatch = hardCodedMobilePaddingPattern.exec(source);
    if (paddingMatch?.index !== undefined) {
      failures.push(
        `${relativePath}:${lineNumberFor(source, paddingMatch.index)} hard-coded mobile hand padding: Use <Game.Viewport>.`,
      );
    }
    if (
      /\bInteraction\.Dialog\b/.test(source) &&
      /\bDialog(Content|Title|Description|Header|Footer|Trigger)?\b/.test(
        source,
      )
    ) {
      failures.push(
        `${relativePath}:1 manual dialog lifecycle wrapper: Use generated form Dialog.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Reference UI ergonomics check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Reference UI ergonomics check passed.");
