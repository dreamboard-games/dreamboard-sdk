#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import {
  readJson,
  root,
  sha256File,
  writeJson,
} from "./ui/reference-games-lib.mjs";

function parseArgs(argv) {
  const options = { skipCheck: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (
      arg === "--out" ||
      arg === "--device-canary-receipt" ||
      arg === "--real-host-parity-receipt"
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a path.`);
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    if (arg === "--require-device-canary") {
      options.requireDeviceCanary = true;
      continue;
    }
    if (arg === "--skip-check") {
      options.skipCheck = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.`);
  }
  return options;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputRoot = path.resolve(
    root,
    options.out ?? "build/proofs/release/current",
  );
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  if (!options.skipCheck) {
    run("pnpm", ["check"]);
  } else {
    run("pnpm", ["build"]);
  }

  const candidateRoot = path.join(outputRoot, "candidate");
  run("node", [
    "scripts/pack-and-smoke-sdk.mjs",
    "--skip-build",
    "--out",
    path.relative(root, candidateRoot),
  ]);
  const candidateReceiptPath = path.join(candidateRoot, "receipt.json");
  const candidateReceipt = await readJson(candidateReceiptPath);
  if (
    candidateReceipt.schemaVersion !== 1 ||
    candidateReceipt.kind !== "dreamboard-sdk-package-candidate" ||
    typeof candidateReceipt.package?.tarball !== "string"
  ) {
    throw new Error(
      "Package verification did not write a valid candidate receipt.",
    );
  }
  const sdkTarball = path.join(candidateRoot, candidateReceipt.package.tarball);
  const sdkTarballSha256 = `sha256:${await sha256File(sdkTarball)}`;

  const uiRoot = path.join(outputRoot, "ui");
  const uiArgs = [
    "scripts/ui/create-ui-release-proof.mjs",
    "--sdk-tarball",
    path.relative(root, sdkTarball),
    "--out",
    path.relative(root, uiRoot),
  ];
  for (const option of ["device-canary-receipt", "real-host-parity-receipt"]) {
    if (options[option]) uiArgs.push(`--${option}`, options[option]);
  }
  if (options.requireDeviceCanary) uiArgs.push("--require-device-canary");
  run("node", uiArgs);

  const uiReceiptPath = path.join(uiRoot, "receipt.json");
  const uiReceipt = await readJson(uiReceiptPath);
  if (
    uiReceipt.kind !== "dreamboard-sdk-ui-release-proof" ||
    uiReceipt.tarballSha256 !== sdkTarballSha256
  ) {
    throw new Error("UI proof did not verify the package candidate tarball.");
  }

  const receipt = {
    schemaVersion: 1,
    kind: "dreamboard-sdk-release-candidate",
    checkedAt: new Date().toISOString(),
    package: {
      name: candidateReceipt.package.name,
      version: candidateReceipt.package.version,
      tarball: path.relative(root, sdkTarball),
      integrity: candidateReceipt.package.integrity,
      sha256: sdkTarballSha256,
      receipt: path.relative(root, candidateReceiptPath),
    },
    uiReceipt: path.relative(root, uiReceiptPath),
  };
  await writeJson(path.join(outputRoot, "receipt.json"), receipt);
  console.log(
    `wrote ${path.relative(root, path.join(outputRoot, "receipt.json"))}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
