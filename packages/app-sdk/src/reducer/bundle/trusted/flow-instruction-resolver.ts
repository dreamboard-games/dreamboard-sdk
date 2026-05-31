import type { DispatchTraceEntry } from "../../core/types";
import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ViewMapOf,
} from "../../model";
import type { createLifecycleRunner } from "./lifecycle-runner";
import type {
  TrustedInput,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedState,
} from "./runtime-scope";

type LifecycleRunnerFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createLifecycleRunner<Contract, Definitions, Views>>;

export function createFlowInstructionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(lifecycle: LifecycleRunnerFor<Contract, Definitions, Views>) {
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  function resolveTransition(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "flow.transition" }
    >,
  ): {
    state: State;
    queuedInputs: ReducerInput[];
    queuedInstructions: RuntimeInstructionForState<State>[];
    trace: DispatchTraceEntry<State, PlayerId, ReducerInput>[];
  } {
    const initialized = lifecycle.initializePhaseResult(
      {
        ...state,
        flow: {
          ...state.flow,
          currentPhase:
            instruction.to as unknown as State["flow"]["currentPhase"],
        },
        runtime: {
          ...state.runtime,
          lastTransition: {
            from: state.flow.currentPhase,
            to: instruction.to,
          },
        } as State["runtime"],
      },
      instruction.to as PhaseName,
    );
    return {
      state: initialized.state,
      queuedInputs: [],
      queuedInstructions: initialized.instructions,
      trace: [],
    };
  }

  return {
    resolveTransition,
  };
}
