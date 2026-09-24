import { z } from "zod";
import type {
  AnyInteractionSpec,
  InputCollector,
  PhaseDefinition,
  OptionsOfContract,
  SchemaLike,
} from "../model";
import type { ScopedPhaseState } from "../model/spec/runtime-args";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

export function definePhase<Contract extends AnyReducerGameContract>() {
  return <
    PhaseStateSchema extends SchemaLike<object>,
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Interactions extends Record<
      string,
      AnyInteractionSpec<
        ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
        ContractManifest<Contract>
      >
    > = Record<string, never>,
  >(
    definition: PhaseDefinition<
      PhaseStateSchema,
      ContractState<Contract>,
      ContractManifest<Contract>,
      SubmitCollectors,
      Interactions,
      OptionsOfContract<Contract>
    >,
  ): PhaseDefinition<
    PhaseStateSchema,
    ContractState<Contract>,
    ContractManifest<Contract>,
    SubmitCollectors,
    Interactions,
    OptionsOfContract<Contract>
  > => {
    return definition;
  };
}
