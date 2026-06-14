import type { RuntimeInstructionForState } from "./runtime-instruction";
import type { TrustedRuntimeInput } from "./runtime-input";
import type { TerminalOutcome } from "../model/runtime";

export type DispatchTraceEntry<
  State,
  PlayerId extends string = string,
  Input extends TrustedRuntimeInput<PlayerId> = TrustedRuntimeInput<PlayerId>,
> =
  | {
      type: "acceptedClientInput";
      input: Input;
    }
  | {
      type: "appliedInstruction";
      instruction: RuntimeInstructionForState<State>;
    }
  | {
      type: "rngConsumption";
      operation: string;
      traceEntry: string;
    };

export type TrustedReducerDispatchResult<State, PlayerId extends string> =
  | {
      type: "reject";
      errorCode: string;
      message?: string;
    }
  | {
      type: "accept";
      state: State;
      trace: DispatchTraceEntry<State, PlayerId>[];
      terminal?: TerminalOutcome<PlayerId>;
    };

export type TrustedInstructionResolutionResult<
  State,
  PlayerId extends string,
  Input extends TrustedRuntimeInput<PlayerId> = TrustedRuntimeInput<PlayerId>,
> = {
  state: State;
  queuedInputs: Input[];
  queuedInstructions: RuntimeInstructionForState<State>[];
  trace: DispatchTraceEntry<State, PlayerId, Input>[];
};

export type TrustedReducerEngine<State, PlayerId extends string> = {
  dispatch: (
    state: State,
    input: TrustedRuntimeInput<PlayerId>,
  ) => TrustedReducerDispatchResult<State, PlayerId>;
  drainInstructions: (
    state: State,
    instructions: RuntimeInstructionForState<State>[],
  ) => State;
};

export type {
  DecodedReducerInput,
  TrustedContinuationInput,
  TrustedInteractionInput,
  TrustedRuntimeInput,
} from "./runtime-input";
