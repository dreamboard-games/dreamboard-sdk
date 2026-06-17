import type { GameTopologyManifest, JsonValue } from "@dreamboard-games/sdk-types";

export type GeneratedAuthoringMetadataV1 = {
  sdkVersion: string;
  codegenVersion: string;
  manifestSchemaVersion: number;
  generatedArtifactSchemaVersion: number;
};

export type AuthoringValidationResultV1 = {
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
};

export type GeneratedArtifactV1 = {
  path: string;
  ownership: "authoritative" | "seed" | "derived-test";
  content: string;
  contentSha256: string;
};

export type GenerateTestArtifactsInputV1 = {
  manifest: GameTopologyManifest;
};

export type AuthoringManifestConformanceCaseV1 = {
  id: string;
  manifest: JsonValue;
  expected:
    | { valid: true; materializedSha256: string }
    | { valid: false; diagnosticCodes: readonly string[] };
};

export type ProjectAuthoringAdapterV1 = {
  protocolVersion: 1;
  metadata: GeneratedAuthoringMetadataV1;
  generatedPaths: readonly string[];
  manifestConformanceCases: readonly AuthoringManifestConformanceCaseV1[];
  validateManifest(manifest: unknown): AuthoringValidationResultV1;
  materializeManifest(manifest: unknown): JsonValue;
  generateWorkspaceArtifacts(manifest: unknown): readonly GeneratedArtifactV1[];
  generateTestArtifacts(
    input: GenerateTestArtifactsInputV1,
  ): readonly GeneratedArtifactV1[];
};
