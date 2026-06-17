export {
  GENERATED_WORKSPACE_PATHS,
  GENERATED_WORKSPACE_PATH_PATTERNS,
  MANIFEST_CONFORMANCE_CASES,
  diagnosticCodesForValidationErrors,
  generateTestArtifacts,
  generateWorkspaceArtifacts,
  materializeManifest,
  projectAuthoringAdapter,
  validateManifest,
} from "./adapter.js";
export type {
  AuthoringManifestConformanceCaseV1,
  AuthoringValidationResultV1,
  GenerateTestArtifactsInputV1,
  GeneratedArtifactV1,
  GeneratedAuthoringMetadataV1,
  GeneratedPathPatternV1,
  ProjectAuthoringAdapterV1,
} from "./types.js";
