export type StaleContractArtifactKind = "session-state";

export type StaleContractArtifactErrorOptions = {
  artifact: StaleContractArtifactKind;
  expected: string;
  found: string;
  remedy?: string;
};

const DEFAULT_REMEDY_BY_ARTIFACT: Record<StaleContractArtifactKind, string> = {
  "session-state": "reset the dev session and start it again.",
};

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
      `session state was generated for contract ${options.found} but the current contract is ${
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
