export const SCENARIO_ASSERTION_ERROR_CODE =
  "SCENARIO_ASSERTION_FAILED" as const;

/** A failed SDK matcher or probe expectation authored in `scenario.then`. */
export class ScenarioAssertionError extends Error {
  readonly code = SCENARIO_ASSERTION_ERROR_CODE;

  constructor(message: string) {
    super(message);
    this.name = "ScenarioAssertionError";
  }
}

export function scenarioAssertionFailure(message: string): never {
  throw new ScenarioAssertionError(message);
}
