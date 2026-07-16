import type { JsonValue } from "@dreamboard-games/sdk-types";

export type AuthoringMetadataV1 = {
  sdkVersion: string;
};

export type AuthoringValidationResultV1 = {
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
};

export type GeneratedArtifactV1 = {
  path: string;
  ownership: "authoritative" | "seed";
  content: string;
  contentSha256: string;
};

export type GeneratedPathPatternV1 = {
  prefix: string;
  suffix: string;
};

export type AuthoringManifestConformanceCaseV1 = {
  id: string;
  manifest: JsonValue;
  expected:
    | {
        valid: true;
        transportValid: true;
        materializedSha256: string;
      }
    | {
        valid: false;
        transportValid: boolean;
        diagnosticCodes: readonly string[];
      };
};

export type ProjectAuthoringAdapterV1 = {
  protocolVersion: 1;
  metadata: AuthoringMetadataV1;
  generatedPaths: readonly string[];
  generatedPathPatterns: readonly GeneratedPathPatternV1[];
  manifestConformanceCases: readonly AuthoringManifestConformanceCaseV1[];
  validateManifest(manifest: unknown): AuthoringValidationResultV1;
  materializeManifest(manifest: unknown): JsonValue;
  generateWorkspaceArtifacts(manifest: unknown): readonly GeneratedArtifactV1[];
};
