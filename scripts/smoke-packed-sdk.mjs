#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const [, , tarballArg] = process.argv;

if (!tarballArg) {
  console.error("Usage: node scripts/smoke-packed-sdk.mjs <sdk.tgz>");
  process.exit(2);
}

const tarballPath = path.resolve(tarballArg);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return result;
}

function packageSpecifier(subpath) {
  return subpath === "."
    ? "@dreamboard-games/sdk"
    : `@dreamboard-games/sdk/${subpath.slice(2)}`;
}

function getExportTarget(target) {
  return typeof target === "string"
    ? target
    : (target.import ?? target.default);
}

function publicExports(manifest) {
  const entries = Object.entries(manifest.exports ?? {}).filter(
    ([subpath]) => subpath !== "./package.json",
  );
  return {
    js: entries
      .filter(([, target]) => getExportTarget(target)?.endsWith(".js"))
      .map(([subpath]) => subpath)
      .sort(),
    css: entries
      .filter(([, target]) => getExportTarget(target)?.endsWith(".css"))
      .map(([subpath, target]) => ({
        subpath,
        target: getExportTarget(target),
      }))
      .sort((left, right) => left.subpath.localeCompare(right.subpath)),
  };
}

async function main() {
  const consumerDir = await mkdtemp(
    path.join(tmpdir(), "dreamboard-sdk-consumer-"),
  );
  try {
    await mkdir(consumerDir, { recursive: true });
    await writeFile(
      path.join(consumerDir, "package.json"),
      `${JSON.stringify(
        { name: "dreamboard-sdk-packed-smoke", private: true, type: "module" },
        null,
        2,
      )}\n`,
    );

    run(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
      { cwd: consumerDir },
    );

    const sdkRoot = path.join(
      consumerDir,
      "node_modules",
      "@dreamboard-games",
      "sdk",
    );
    const manifest = JSON.parse(
      await readFile(path.join(sdkRoot, "package.json"), "utf8"),
    );
    const exportsToSmoke = publicExports(manifest);
    const specifiers = exportsToSmoke.js.map(packageSpecifier);
    const probePath = path.join(consumerDir, "import-public-subpaths.mjs");
    await writeFile(
      probePath,
      [
        `const specifiers = ${JSON.stringify(specifiers, null, 2)};`,
        "const expectedRoot = '/node_modules/@dreamboard-games/sdk/';",
        "for (const specifier of specifiers) {",
        "  const resolved = await import.meta.resolve(specifier);",
        "  if (!resolved.includes(expectedRoot)) {",
        "    throw new Error(`${specifier} resolved outside packed consumer install: ${resolved}`);",
        "  }",
        "  const module = await import(specifier);",
        "  console.log(`${specifier} -> ${Object.keys(module).length} runtime exports`);",
        "}",
        "",
      ].join("\n"),
    );
    run("node", [probePath], { cwd: consumerDir });

    const cssFailures = [];
    for (const cssExport of exportsToSmoke.css) {
      const cssPath = path.resolve(sdkRoot, cssExport.target);
      const relative = path.relative(sdkRoot, cssPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        cssFailures.push(`${cssExport.subpath} resolves outside package`);
        continue;
      }
      const cssStat = await stat(cssPath).catch(() => null);
      if (!cssStat || cssStat.size === 0) {
        cssFailures.push(`${cssExport.subpath} missing or empty`);
        continue;
      }
      console.log(
        `${packageSpecifier(cssExport.subpath)} -> ${cssStat.size} bytes`,
      );
    }
    if (cssFailures.length > 0) {
      throw new Error(
        `CSS export smoke failures:\n  ${cssFailures.join("\n  ")}`,
      );
    }

    console.log(
      `\nOK: imported ${exportsToSmoke.js.length} JS subpaths and checked ${exportsToSmoke.css.length} CSS exports from ${path.basename(tarballPath)}`,
    );
  } finally {
    await rm(consumerDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
