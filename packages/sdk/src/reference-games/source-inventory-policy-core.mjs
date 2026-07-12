export const CANONICAL_REFERENCE_GAME_IDS = Object.freeze([
  "automa-river-rival",
  "deck-building-market",
  "hearts",
  "hex-network-trading",
  "multiplayer-ranking-and-ties",
  "roll-and-write-scorecard",
  "simultaneous-card-drafting",
  "solo-countdown-puzzle",
  "worker-placement-tableau",
]);

export function createReferenceGameSourceInventoryPolicy(ownership) {
  return Object.freeze({
    schemaVersion: 1,
    workspaceOwnershipVersion: ownership.version,
    excludedGameRelativePaths: Object.freeze(
      [...ownership.dynamic.generatedFiles].sort(),
    ),
    excludedGameRelativePrefixes: Object.freeze(
      [
        ".dreamboard/",
        ".turbo/",
        "build/",
        "coverage/",
        "dist/",
        "node_modules/",
        "playwright-report/",
        "test-results/",
        "test/bases/",
        "test/generated/",
        "test/screenshots/",
      ].sort(),
    ),
  });
}

export function referenceGamePathIdentity(repositoryPath) {
  const prefix = "examples/reference-games/";
  if (!repositoryPath.startsWith(prefix)) return null;
  const remainder = repositoryPath.slice(prefix.length);
  const separator = remainder.indexOf("/");
  if (separator < 1) return null;
  const gameId = remainder.slice(0, separator);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(gameId)) return null;
  return { gameId, relativePath: remainder.slice(separator + 1) };
}

export function classifyReferenceGameSourcePath(repositoryPath, policy) {
  const identity = referenceGamePathIdentity(repositoryPath);
  if (!identity) return "included";
  if (policy.excludedGameRelativePaths.includes(identity.relativePath)) {
    return "workspace-generated";
  }
  const matchedPrefix = policy.excludedGameRelativePrefixes.find((prefix) =>
    identity.relativePath.startsWith(prefix),
  );
  if (!matchedPrefix) return "included";
  if (matchedPrefix === "test/generated/") return "test-generated";
  if (matchedPrefix === "test/bases/") return "test-base";
  if (matchedPrefix === "test/screenshots/") return "obsolete-screenshot";
  return "derived-output";
}

export function shouldDescendIntoReferenceGameDirectory(
  repositoryPath,
  policy,
) {
  const normalized = repositoryPath.endsWith("/")
    ? repositoryPath
    : `${repositoryPath}/`;
  const identity = referenceGamePathIdentity(normalized);
  if (!identity) return true;
  return !policy.excludedGameRelativePrefixes.some((prefix) =>
    identity.relativePath.startsWith(prefix),
  );
}
