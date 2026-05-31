import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import type { ReducerReject, ReducerResult } from "../../model";

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
  reject: rejectResult,
};
