import type {
  DispatchTraceEntry,
  TrustedReducerDispatchResult,
  TrustedRuntimeInput,
} from "../core/types";
import type { RuntimeInstructionForState } from "../core/runtime-instruction";

export function createRuntimeInstructionEngine<
  State,
  PlayerId extends string,
  Input extends TrustedRuntimeInput<PlayerId>,
>({
  reduce,
  resolveInstruction,
  afterInput,
}: {
  reduce: (
    state: State,
    input: Input,
  ) =>
    | { type: "reject"; errorCode: string; message?: string }
    | {
        type: "accept";
        state: State;
        instructions?: RuntimeInstructionForState<State>[];
      };
  resolveInstruction: (
    state: State,
    instruction: RuntimeInstructionForState<State>,
  ) => {
    state: State;
    queuedInputs: Input[];
    queuedInstructions: RuntimeInstructionForState<State>[];
    trace: DispatchTraceEntry<State, PlayerId, Input>[];
  };
  afterInput?: (
    state: State,
    input: Input,
  ) => {
    state: State;
    trace: DispatchTraceEntry<State, PlayerId, Input>[];
  };
}) {
  function drainInstructions(
    state: State,
    instructionsToDrain: RuntimeInstructionForState<State>[],
  ): State {
    let workingState = state;
    const instructionQueue = [...instructionsToDrain];
    const systemQueue: Input[] = [];

    while (instructionQueue.length > 0 || systemQueue.length > 0) {
      while (instructionQueue.length > 0) {
        const instruction = instructionQueue.shift();
        if (instruction === undefined) break;
        const resolved = resolveInstruction(workingState, instruction);
        workingState = resolved.state;
        if (resolved.queuedInstructions.length > 0) {
          instructionQueue.unshift(...resolved.queuedInstructions);
        }
        systemQueue.push(...resolved.queuedInputs);
      }

      while (systemQueue.length > 0) {
        const input = systemQueue.shift();
        if (input === undefined) break;
        const result = reduce(workingState, input);
        if (result.type === "reject") {
          throw new Error(
            result.message ??
              `Reducer rejected internal input '${input.kind}'.`,
          );
        }
        workingState = result.state;
        instructionQueue.push(...(result.instructions ?? []));
      }
    }

    return workingState;
  }

  function dispatch(
    state: State,
    input: Input,
  ): TrustedReducerDispatchResult<State, PlayerId> {
    let workingState = state;
    const pendingInputs: Input[] = [input];
    const trace: DispatchTraceEntry<State, PlayerId, Input>[] = [
      {
        type: "acceptedClientInput",
        input,
      },
    ];

    while (pendingInputs.length > 0) {
      const pendingInput = pendingInputs.shift();
      if (pendingInput === undefined) break;
      const result = reduce(workingState, pendingInput);
      if (result.type === "reject") {
        if (pendingInput === input) {
          return result;
        }
        throw new Error(
          result.message ??
            `Reducer rejected internal input '${pendingInput.kind}'.`,
        );
      }

      workingState = result.state;

      if (afterInput) {
        const afterInputResult = afterInput(workingState, pendingInput);
        workingState = afterInputResult.state;
        trace.push(...afterInputResult.trace);
      }

      const instructionQueue = [...(result.instructions ?? [])];
      const continuationQueue: Input[] = [];
      while (instructionQueue.length > 0 || continuationQueue.length > 0) {
        while (instructionQueue.length > 0) {
          const instruction = instructionQueue.shift();
          if (instruction === undefined) break;
          trace.push({
            type: "appliedInstruction",
            instruction,
          });
          const resolved = resolveInstruction(workingState, instruction);
          workingState = resolved.state;
          trace.push(...resolved.trace);
          if (resolved.queuedInstructions.length > 0) {
            instructionQueue.unshift(...resolved.queuedInstructions);
          }
          continuationQueue.push(...resolved.queuedInputs);
        }

        while (continuationQueue.length > 0) {
          const queued = continuationQueue.shift();
          if (queued === undefined) break;
          pendingInputs.push(queued);
        }
      }
    }

    return {
      type: "accept",
      state: workingState,
      trace,
    };
  }

  return {
    dispatch,
    drainInstructions,
  };
}
