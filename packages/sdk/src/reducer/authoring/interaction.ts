import type {
  InputCollector,
  InteractionRule,
  InteractionSpec,
} from "../model";
import type { ScopedPhaseState } from "../model/spec/runtime-args";
import type {
  AnyReducerGameContract,
  ContractErrorCode,
  ContractManifest,
  ContractState,
  InferPhaseState,
  PhaseStateInput,
} from "./types";
import { validateInteractionLikeDefinition } from "./validation";

export function defineInteraction<
  Contract extends AnyReducerGameContract,
  PhaseState extends PhaseStateInput = import("../model").SchemaLike<object>,
>() {
  return <Collectors extends Record<string, InputCollector>>(
    definition: InteractionSpec<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
      ContractManifest<Contract>,
      ContractErrorCode<Contract>
    >,
  ): InteractionSpec<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
    ContractManifest<Contract>,
    ContractErrorCode<Contract>
  > => {
    validateInteractionLikeDefinition(
      definition as {
        inputs?: Record<string, InputCollector>;
        commit?: { mode: string };
        paramsSchema?: unknown;
      },
      "defineInteraction",
    );
    return definition;
  };
}

export function defineInteractionRule<
  Contract extends AnyReducerGameContract,
  PhaseState extends PhaseStateInput = import("../model").SchemaLike<object>,
>() {
  return <
    Collectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
  >(
    definition: InteractionRule<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
      ContractManifest<Contract>,
      ContractErrorCode<Contract>
    >,
  ): InteractionRule<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
    ContractManifest<Contract>,
    ContractErrorCode<Contract>
  > => definition;
}
