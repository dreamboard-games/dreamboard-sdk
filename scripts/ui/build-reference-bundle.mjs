#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

import {
  buildRoot,
  readJson,
  repoCommandEnv,
  root,
  sha256File,
  writeJson,
} from "./reference-games-lib.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env:
      command === "git"
        ? repoCommandEnv(options.env)
        : (options.env ?? process.env),
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd ?? root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

async function findSourceBundle() {
  const sourceRoot = path.join(buildRoot, "source");
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const receiptPaths = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      path.join(sourceRoot, entry.name, "materialization-receipt.json"),
    )
    .sort();
  if (receiptPaths.length !== 1) {
    throw new Error(
      `Expected exactly one admitted source bundle in ${path.relative(root, sourceRoot)}, found ${receiptPaths.length}.`,
    );
  }

  const receipt = await readJson(receiptPaths[0]);
  if (
    receipt.schemaVersion !== 2 ||
    typeof receipt.sourceFingerprint !== "string" ||
    typeof receipt.manifestSha256 !== "string" ||
    typeof receipt.archiveSha256 !== "string" ||
    typeof receipt.output !== "string"
  ) {
    throw new Error("Admitted source materialization receipt is invalid.");
  }
  const archivePath = path.join(
    root,
    receipt.output,
    "reference-game-source.tar.gz",
  );
  const manifestPath = path.join(
    root,
    receipt.output,
    "reference-game-source-manifest.json",
  );
  const archiveSha256 = `sha256:${await sha256File(archivePath)}`;
  const manifestSha256 = `sha256:${await sha256File(manifestPath)}`;
  if (
    archiveSha256 !== receipt.archiveSha256 ||
    manifestSha256 !== receipt.manifestSha256
  ) {
    throw new Error("Admitted source bundle digests do not match its receipt.");
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.schemaVersion !== 3 ||
    manifest.sourceFingerprint !== receipt.sourceFingerprint
  ) {
    throw new Error(
      "Admitted reference-game source must remain a schemaVersion 3 transport manifest.",
    );
  }
  return { receipt, archivePath };
}

async function main() {
  await rm(buildRoot, { recursive: true, force: true });
  await mkdir(buildRoot, { recursive: true });

  run("pnpm", ["reference-games:source:materialize"], {
    stdio: "inherit",
  });
  const sourceBundle = await findSourceBundle();

  const sdkPackDir = path.join(buildRoot, "sdk");
  await mkdir(sdkPackDir, { recursive: true });
  const sdkPack = run(
    "npm",
    ["pack", "--json", "--pack-destination", sdkPackDir],
    { cwd: path.join(root, "packages/sdk") },
  );
  const sdkTarballName = JSON.parse(sdkPack.stdout)[0]?.filename;
  if (!sdkTarballName) {
    throw new Error(
      `npm pack did not report an SDK tarball\n${sdkPack.stdout}`,
    );
  }
  const sdkTarballPath = path.join(sdkPackDir, sdkTarballName);
  const sdkCommit = run("git", [
    "rev-parse",
    "--short=12",
    "HEAD",
  ]).stdout.trim();

  const lock = {
    schemaVersion: 2,
    sdkCommit,
    sdkTarballSha256: `sha256:${await sha256File(sdkTarballPath)}`,
    referenceBundle: {
      kind: "dreamboard.reference-game-source",
      url: `artifact://dreamboard-sdk/reference-games/${sourceBundle.receipt.sourceFingerprint}.tar.gz`,
      path: path.relative(root, sourceBundle.archivePath),
      sha256: sourceBundle.receipt.archiveSha256,
      sourceFingerprint: sourceBundle.receipt.sourceFingerprint,
      manifestSha256: sourceBundle.receipt.manifestSha256,
    },
  };
  await writeJson(path.join(buildRoot, "reference-bundle.lock.json"), lock);
  console.log(JSON.stringify(lock, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
