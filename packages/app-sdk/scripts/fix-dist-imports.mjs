import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIST_ROOT = new URL("../dist/", import.meta.url);
const RELATIVE_IMPORT_PATTERN =
  /\b(from\s+["']|import\s+["'])(\.\.?\/[^"']+)(["'])/g;

function withJsExtension(specifier) {
  if (/\.(?:[cm]?js|json)$/.test(specifier)) {
    return specifier;
  }
  return `${specifier}.js`;
}

async function walk(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const distRoot = fileURLToPath(DIST_ROOT);
  const files = await walk(distRoot);

  await Promise.all(
    files.map(async (filePath) => {
      const original = await readFile(filePath, "utf8");
      const rewritten = original.replace(
        RELATIVE_IMPORT_PATTERN,
        (_match, prefix, specifier, suffix) =>
          `${prefix}${withJsExtension(specifier)}${suffix}`,
      );

      if (rewritten !== original) {
        await writeFile(filePath, rewritten);
      }
    }),
  );
}

await main();
