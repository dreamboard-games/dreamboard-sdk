/**
 * Smoke-test the published SDK snapshot: install the exact version recorded
 * by `publish-local-snapshot.mjs` from the local registry into a throwaway
 * project, then `import()` every public JS subpath and stat the CSS asset.
 *
 * Usage:
 *   node scripts/publish-local-snapshot.mjs   # publish first
 *   node scripts/smoke-subpath-imports.mjs    # then smoke
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const JS_SUBPATHS = [
  ".",
  "./package-set",
  "./types",
  "./reducer",
  "./ui",
  "./ui/components",
  "./ui/defaults",
  "./ui/player-state",
  "./runtime",
  "./runtime/primitives",
  "./runtime/workspace-contract",
  "./runtime/runtime-api",
  "./codegen",
  "./reducer-contract",
  "./testing",
  "./browser-interaction",
];
const CSS_SUBPATH = "./ui/plugin-styles.css";

/**
 * Subpaths whose source is 100% `type`/`interface` exports — the compiled JS
 * correctly has zero runtime exports, so the smoke only asserts that the
 * specifier resolves and evaluates.
 */
const TYPE_ONLY_SUBPATHS = new Set(["./ui/player-state", "./runtime/runtime-api"]);

async function main() {
  const receiptPath = path.join(
    root,
    ".dreamboard-dev",
    "local-registry",
    "sdk-package-set.json",
  );
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const version = receipt.packages["@dreamboard-games/sdk"];
  if (!version) {
    throw new Error(`no @dreamboard-games/sdk version in ${receiptPath}`);
  }

  const smokeDir = path.join(root, ".dreamboard-dev", "smoke", version);
  await rm(smokeDir, { recursive: true, force: true });
  await mkdir(smokeDir, { recursive: true });
  await writeFile(
    path.join(smokeDir, "package.json"),
    `${JSON.stringify({ name: "sdk-smoke", private: true, type: "module" }, null, 2)}\n`,
  );

  const install = spawnSync(
    "npm",
    [
      "install",
      `@dreamboard-games/sdk@${version}`,
      "--registry",
      receipt.registryUrl,
      "--no-audit",
      "--no-fund",
    ],
    { cwd: smokeDir, stdio: "inherit" },
  );
  if (install.status !== 0) {
    throw new Error("npm install failed");
  }

  const sdkRoot = path.join(smokeDir, "node_modules", "@dreamboard-games/sdk");
  const manifest = JSON.parse(
    await readFile(path.join(sdkRoot, "package.json"), "utf8"),
  );
  const exportKeys = Object.keys(manifest.exports).filter(
    (key) => key !== "./package.json",
  );
  const expected = [...JS_SUBPATHS, CSS_SUBPATH].sort();
  const actual = [...exportKeys].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      `exports map drifted from smoke list.\nexpected: ${expected.join(", ")}\nactual:   ${actual.join(", ")}`,
    );
  }

  const failures = [];
  for (const subpath of JS_SUBPATHS) {
    const specifier =
      subpath === "."
        ? "@dreamboard-games/sdk"
        : `@dreamboard-games/sdk/${subpath.slice(2)}`;
    const typeOnly = TYPE_ONLY_SUBPATHS.has(subpath);
    const probe = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `const m = await import(${JSON.stringify(specifier)});` +
          (typeOnly
            ? `console.log(${JSON.stringify(specifier)}, "->", Object.keys(m).length, "exports (type-only)");`
            : `if (Object.keys(m).length === 0) { throw new Error("no exports"); }` +
              `console.log(${JSON.stringify(specifier)}, "->", Object.keys(m).length, "exports");`),
      ],
      { cwd: smokeDir, stdio: "inherit" },
    );
    if (probe.status !== 0) {
      failures.push(specifier);
    }
  }

  const cssPath = path.join(sdkRoot, "dist", "ui", "plugin-styles.css");
  const cssStats = await stat(cssPath).catch(() => null);
  if (!cssStats || cssStats.size === 0) {
    failures.push(`@dreamboard-games/sdk/${CSS_SUBPATH.slice(2)} (missing dist asset)`);
  } else {
    console.log(`@dreamboard-games/sdk/ui/plugin-styles.css -> ${cssStats.size} bytes`);
  }

  if (failures.length > 0) {
    throw new Error(`subpath smoke failures:\n  ${failures.join("\n  ")}`);
  }
  console.log(
    `\nOK: ${JS_SUBPATHS.length} JS subpaths import cleanly + CSS asset present (${version})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
