import { readFile } from "node:fs/promises";
import path from "node:path";
import { sdkPackages } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const versions = new Map();

for (const pkg of sdkPackages) {
  const packageJsonPath = path.join(root, pkg.dir, "package.json");
  const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  if (manifest.name !== pkg.name) {
    throw new Error(
      `${packageJsonPath} declares ${manifest.name}; expected ${pkg.name}`,
    );
  }
  if (manifest.private === true) {
    throw new Error(`${pkg.name} is marked private`);
  }
  versions.set(pkg.name, manifest.version);
}

const uniqueVersions = new Set(versions.values());
if (uniqueVersions.size !== 1) {
  const detail = [...versions]
    .map(([name, version]) => `  ${name}: ${version}`)
    .join("\n");
  throw new Error(`SDK package versions drifted:\n${detail}`);
}

console.log(`SDK fixed version OK: ${[...uniqueVersions][0]}`);
