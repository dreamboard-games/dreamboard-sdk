export type StaleContractArtifactKind = "base-states" | "session-state";

export type StaleContractArtifactErrorOptions = {
  artifact: StaleContractArtifactKind;
  expected: string;
  found: string;
  remedy?: string;
};

const DEFAULT_REMEDY_BY_ARTIFACT: Record<StaleContractArtifactKind, string> = {
  "base-states": "run `dreamboard test generate`, then re-run the tests.",
  "session-state": "reset the dev session or run `dreamboard test generate`.",
};

function artifactLabel(artifact: StaleContractArtifactKind): string {
  return artifact === "base-states" ? "base states" : "session state";
}

function artifactVerb(artifact: StaleContractArtifactKind): string {
  return artifact === "base-states" ? "were" : "was";
}

export class StaleContractArtifactError extends Error {
  readonly code = "STALE_CONTRACT_ARTIFACT";
  readonly artifact: StaleContractArtifactKind;
  readonly expected: string;
  readonly found: string;
  readonly remedy: string;

  constructor(options: StaleContractArtifactErrorOptions) {
    const remedy =
      options.remedy ?? DEFAULT_REMEDY_BY_ARTIFACT[options.artifact];
    super(
      `${artifactLabel(options.artifact)} ${artifactVerb(
        options.artifact,
      )} generated for contract ${options.found} but the current contract is ${
        options.expected
      }. ` +
        `Your state or phase schemas changed since the artifact was created. ` +
        `Remedy: ${remedy}`,
    );
    this.name = "StaleContractArtifactError";
    this.artifact = options.artifact;
    this.expected = options.expected;
    this.found = options.found;
    this.remedy = remedy;
  }
}

export function isStaleContractArtifactError(
  error: unknown,
): error is StaleContractArtifactError {
  return (
    error instanceof StaleContractArtifactError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { code?: unknown }).code === "STALE_CONTRACT_ARTIFACT")
  );
}
