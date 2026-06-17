#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sdkDir = path.join(root, "packages/sdk");

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
  const retainedRoot = process.env.AUTHORING_CANDIDATE_DIR
    ? path.resolve(process.env.AUTHORING_CANDIDATE_DIR)
    : null;
  const tempRoot =
    retainedRoot ??
    (await mkdtemp(path.join(tmpdir(), "dreamboard-sdk-pack-smoke-")));
  await mkdir(tempRoot, { recursive: true });
  try {
    const pack = run(
      "npm",
      ["pack", "--json", "--pack-destination", tempRoot],
      { cwd: sdkDir },
    );
    const packOutput = JSON.parse(pack.stdout);
    const tarballName = packOutput[0]?.filename;
    if (!tarballName) {
      throw new Error(`npm pack did not report a tarball\n${pack.stdout}`);
    }
    const tarballPath = path.join(tempRoot, tarballName);
    console.log(`Packed ${tarballPath}`);
    run("node", ["scripts/smoke-packed-sdk.mjs", tarballPath], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        ...(retainedRoot
          ? {
              AUTHORING_SMOKE_RECEIPT: path.join(
                retainedRoot,
                "sdk-authoring-candidate-receipt.json",
              ),
            }
          : {}),
      },
    });
  } finally {
    if (!retainedRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
