import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sdkDir = path.join(root, "packages/sdk");
const removedLeafSpecifiers = [
  "@dreamboard-games/app-sdk",
  "@dreamboard-games/reducer-contract",
  "@dreamboard-games/sdk-types",
  "@dreamboard-games/testing",
  "@dreamboard-games/ui-runtime",
  "@dreamboard-games/ui-sdk",
  "@dreamboard-games/workspace-codegen",
];
const specifierPattern = new RegExp(
  removedLeafSpecifiers
    .map((specifier) => specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
);
const scannedExtensions = new Set([
  ".css",
  ".cjs",
  ".d.ts",
  ".js",
  ".json",
  ".mjs",
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout}${result.stderr}`,
    );
  }
  return result;
}

function shouldScan(filePath) {
  if (filePath.endsWith(".d.ts")) {
    return true;
  }
  return scannedExtensions.has(path.extname(filePath));
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile() && shouldScan(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "dreamboard-sdk-pack-"));
  try {
    const packResult = run(
      "npm",
      ["pack", "--json", "--pack-destination", tempRoot],
      {
        cwd: sdkDir,
      },
    );
    const packOutput = JSON.parse(packResult.stdout);
    const tarballName = packOutput[0]?.filename;
    if (!tarballName) {
      throw new Error(
        `npm pack did not report a tarball\n${packResult.stdout}`,
      );
    }
    const tarballPath = path.join(tempRoot, tarballName);
    const extractDir = path.join(tempRoot, "extract");
    await readdir(tempRoot);
    run("mkdir", ["-p", extractDir]);
    run("tar", ["-xzf", tarballPath, "-C", extractDir]);

    const files = await collectFiles(path.join(extractDir, "package"));
    const violations = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf8");
      if (specifierPattern.test(content)) {
        violations.push(
          path.relative(path.join(extractDir, "package"), filePath),
        );
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `SDK tarball references removed leaf package specifiers:\n${violations
          .map((filePath) => `  ${filePath}`)
          .join("\n")}`,
      );
    }

    console.log(
      `SDK tarball self-contained OK: scanned ${files.length} JS/CSS/declaration/metadata files`,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
