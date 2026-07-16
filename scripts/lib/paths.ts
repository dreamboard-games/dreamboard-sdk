import path from "node:path";

export const rootDir = path.resolve(import.meta.dirname, "../..");
export const packagesDir = path.join(rootDir, "packages");
export const sdkDir = path.join(packagesDir, "sdk");
export const referenceGamesDir = path.join(rootDir, "examples/reference-games");
export const releaseCandidateDir = path.join(
  rootDir,
  "build/release/candidate",
);
