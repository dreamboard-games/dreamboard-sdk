import { spawnSync } from "node:child_process";
import path from "node:path";
import { sdkPackages } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");

const buildResult = spawnSync(
  "pnpm",
  ["--filter", "@dreamboard-games/sdk", "build"],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

for (const pkg of sdkPackages) {
  console.log(`\n==> npm pack --dry-run ${pkg.name}`);
  const result = spawnSync("npm", ["pack", "--dry-run"], {
    cwd: path.join(root, pkg.dir),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const selfContainedResult = spawnSync(
  "node",
  ["scripts/assert-sdk-tarball-self-contained.mjs"],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (selfContainedResult.status !== 0) {
  process.exit(selfContainedResult.status ?? 1);
}
