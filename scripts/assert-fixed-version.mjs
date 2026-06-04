import { readFile } from "node:fs/promises";
import path from "node:path";
import { sdkPackages } from "./sdk-packages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const versions = new Map();
const sdkPackageSetSourcePath = path.join(
  root,
  "packages",
  "sdk",
  "src",
  "package-set.ts",
);

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

const [fixedVersion] = uniqueVersions;
const sdkPackageSetSource = await readFile(sdkPackageSetSourcePath, "utf8");
const sourceVersionMatch = sdkPackageSetSource.match(
  /export const DREAMBOARD_SDK_VERSION = "([^"]+)";/,
);

if (!sourceVersionMatch) {
  throw new Error(
    `${sdkPackageSetSourcePath} must export a literal DREAMBOARD_SDK_VERSION`,
  );
}

const sourceVersion = sourceVersionMatch[1];
if (sourceVersion !== fixedVersion) {
  throw new Error(
    `DREAMBOARD_SDK_VERSION drifted from packages/sdk/package.json: ${sourceVersion} !== ${fixedVersion}`,
  );
}

console.log(`SDK fixed version OK: ${fixedVersion}`);
