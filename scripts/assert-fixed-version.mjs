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
const generatedMetadataSourcePath = path.join(
  root,
  "packages",
  "sdk",
  "src",
  "authoring",
  "generated-metadata.ts",
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
const generatedMetadataSource = await readFile(
  generatedMetadataSourcePath,
  "utf8",
);
const generatedVersionMatch = generatedMetadataSource.match(
  /sdkVersion: "([^"]+)"/,
);
if (!generatedVersionMatch) {
  throw new Error(
    `${generatedMetadataSourcePath} must contain generated sdkVersion metadata`,
  );
}
if (generatedVersionMatch[1] !== fixedVersion) {
  throw new Error(
    `Generated sdkVersion drifted from packages/sdk/package.json: ${generatedVersionMatch[1]} !== ${fixedVersion}`,
  );
}
if (
  !sdkPackageSetSource.includes(
    "export const DREAMBOARD_SDK_VERSION = GENERATED_AUTHORING_METADATA.sdkVersion;",
  )
) {
  throw new Error(
    `${sdkPackageSetSourcePath} must derive DREAMBOARD_SDK_VERSION from generated authoring metadata`,
  );
}

console.log(`SDK fixed version OK: ${fixedVersion}`);
