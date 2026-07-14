#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sdkDir = path.join(root, "packages/sdk");

function parseArgs(argv) {
  const options = { skipBuild: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out requires a directory.");
      options.out = path.resolve(root, value);
      index += 1;
      continue;
    }
    if (arg === "--skip-build") {
      options.skipBuild = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.skipBuild) {
    run("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  }
  const outputRoot =
    options.out ??
    (await mkdtemp(path.join(tmpdir(), "dreamboard-sdk-pack-smoke-")));
  if (options.out) {
    await rm(outputRoot, { recursive: true, force: true });
  }
  await mkdir(outputRoot, { recursive: true });
  try {
    const pack = run(
      "npm",
      ["pack", "--json", "--pack-destination", outputRoot],
      { cwd: sdkDir },
    );
    const packOutput = JSON.parse(pack.stdout);
    const tarballName = packOutput[0]?.filename;
    if (!tarballName) {
      throw new Error(`npm pack did not report a tarball\n${pack.stdout}`);
    }
    const tarballPath = path.join(outputRoot, tarballName);
    console.log(`Packed ${tarballPath}`);
    run(
      "node",
      ["scripts/assert-sdk-tarball-self-contained.mjs", tarballPath],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    run("node", ["scripts/smoke-packed-sdk.mjs", tarballPath], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        AUTHORING_SMOKE_RECEIPT: path.join(outputRoot, "receipt.json"),
      },
    });
    console.log(`Candidate receipt: ${path.join(outputRoot, "receipt.json")}`);
  } finally {
    if (!options.out) {
      await rm(outputRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
