import type { TrustedRuntimeInput } from "./runtime-input";
import type { GameEvent, GameOutcome } from "../model/runtime";

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
      type: "phaseEntered";
      from: import("../model").PhaseNameOfState<State>;
      to: import("../model").PhaseNameOfState<State>;
    }
  | {
      type: "rngConsumption";
      version: 2;
      operation: string;
      drawIndex: number;
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
      terminal?: GameOutcome<PlayerId>;
      events?: readonly GameEvent[];
    };

export type {
  DecodedReducerInput,
  TrustedInteractionInput,
  TrustedRuntimeInput,
} from "./runtime-input";
