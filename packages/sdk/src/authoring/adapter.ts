import { createHash } from "node:crypto";
import type { GameTopologyManifest, JsonValue } from "@dreamboard-games/sdk-types";
import {
  AUTHORITATIVE_GENERATED_FILES,
  SEED_FILES,
  generateAuthoritativeFiles,
  generateSeedFiles,
  materializeManifestTable,
  validateManifestAuthoring,
} from "@dreamboard-games/workspace-codegen";
import { GENERATED_AUTHORING_METADATA } from "./generated-metadata.js";
import {
  createManifestConformanceCases,
  diagnosticCodesForValidationErrors,
} from "./manifest-conformance-cases.js";
import type {
  AuthoringValidationResultV1,
  GenerateTestArtifactsInputV1,
  GeneratedArtifactV1,
  ProjectAuthoringAdapterV1,
} from "./types.js";

const PLAYER_IDS = ["player-1", "player-2"] as const;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertManifest(manifest: unknown): GameTopologyManifest {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Expected a manifest object.");
  }
  return manifest as GameTopologyManifest;
}

function normalizeArtifact(
  path: string,
  content: string,
  ownership: GeneratedArtifactV1["ownership"],
): GeneratedArtifactV1 {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Generated artifact path '${path}' is not normalized.`);
  }
  return {
    path,
    ownership,
    content,
    contentSha256: sha256(content),
  };
}

function normalizeArtifacts(
  entries: Record<string, string>,
  ownership: GeneratedArtifactV1["ownership"],
): GeneratedArtifactV1[] {
  return Object.entries(entries)
    .map(([path, content]) => normalizeArtifact(path, content, ownership))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function validateNoDuplicateArtifactPaths(
  artifacts: readonly GeneratedArtifactV1[],
): void {
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.path)) {
      throw new Error(`Generated artifact path '${artifact.path}' was emitted twice.`);
    }
    seen.add(artifact.path);
    if (artifact.contentSha256 !== sha256(artifact.content)) {
      throw new Error(`Generated artifact '${artifact.path}' has a stale hash.`);
    }
  }
}

export function validateManifest(
  manifest: unknown,
): AuthoringValidationResultV1 {
  try {
    const result = validateManifestAuthoring(assertManifest(manifest));
    return {
      valid: result.errors.length === 0,
      errors: result.errors,
      warnings: result.warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

export function materializeManifest(manifest: unknown): JsonValue {
  return materializeManifestTable({
    manifest: assertManifest(manifest),
    playerIds: PLAYER_IDS,
    shuffleItems: (values) => [...values],
  }) as JsonValue;
}

export function generateWorkspaceArtifacts(
  manifest: unknown,
): readonly GeneratedArtifactV1[] {
  const gameManifest = assertManifest(manifest);
  const artifacts = [
    ...normalizeArtifacts(
      generateAuthoritativeFiles(gameManifest),
      "authoritative",
    ),
    ...normalizeArtifacts(generateSeedFiles(gameManifest), "seed"),
  ];
  validateNoDuplicateArtifactPaths(artifacts);
  return artifacts;
}

export function generateTestArtifacts(
  input: GenerateTestArtifactsInputV1,
): readonly GeneratedArtifactV1[] {
  const materialized = materializeManifest(input.manifest);
  return [
    normalizeArtifact(
      "test/generated/base-state.json",
      `${stableJson(materialized)}\n`,
      "derived-test",
    ),
  ];
}

export const GENERATED_WORKSPACE_PATHS = [
  ...AUTHORITATIVE_GENERATED_FILES,
  ...SEED_FILES,
] as const;

export const MANIFEST_CONFORMANCE_CASES = createManifestConformanceCases({
  materializeManifest,
  sha256,
  stableJson,
  validateManifest,
});

export const projectAuthoringAdapter: ProjectAuthoringAdapterV1 = {
  protocolVersion: 1,
  metadata: GENERATED_AUTHORING_METADATA,
  generatedPaths: GENERATED_WORKSPACE_PATHS,
  manifestConformanceCases: MANIFEST_CONFORMANCE_CASES,
  validateManifest,
  materializeManifest,
  generateWorkspaceArtifacts,
  generateTestArtifacts,
};

export { diagnosticCodesForValidationErrors, stableJson };
