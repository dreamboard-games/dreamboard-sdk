import { spawnSync } from "node:child_process";
import path from "node:path";
import { sdkPackages } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");

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
