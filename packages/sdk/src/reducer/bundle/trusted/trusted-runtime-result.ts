import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import type { ReducerReject, ReducerResult, TerminalOutcome } from "../../model";

export function acceptResult<State>(
  state: State,
  instructions: Array<RuntimeInstructionForState<State>> = [],
) {
  return {
    type: "accept" as const,
    state,
    instructions,
  };
}

export function endGameResult<State, PlayerId extends string = string>(
  state: State,
  outcome: TerminalOutcome<PlayerId>,
  instructions: Array<RuntimeInstructionForState<State>> = [],
) {
  return {
    type: "accept" as const,
    state,
    instructions,
    terminal: outcome,
  };
}

export function rejectResult(
  errorCode: string,
  message?: string,
): ReducerReject {
  return {
    type: "reject",
    errorCode,
    message,
  };
}

export function normalizeResult<State>(
  result: ReducerResult<State> | void,
  fallbackState: State,
): ReducerResult<State> {
  if (result === undefined || result === null) {
    return acceptResult(fallbackState);
  }
  return result;
}

export const runtimeResultHelpers = {
  accept: acceptResult,
  endGame: endGameResult,
  reject: rejectResult,
};
