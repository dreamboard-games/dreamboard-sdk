import type { z } from "zod";
import type {
  ExactManifestContractOf,
  SchemaLike,
  ScopedPhaseState,
  StageSpec,
  StaticViewDefinition,
  ViewDefinition,
} from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

export function defineView<Contract extends AnyReducerGameContract>() {
  return <Projection>(
    definition: ViewDefinition<
      ContractState<Contract>,
      ContractManifest<Contract>,
      Projection
    >,
  ): ViewDefinition<
    ContractState<Contract>,
    ContractManifest<Contract>,
    Projection
  > => definition;
}

/**
 * Factory for the session-scoped static view (see {@link StaticViewDefinition}).
 * Kept separate from {@link defineView} because the argument shape is
 * structurally different: it exposes only the manifest and generated static
 * queries, with no `state`, `playerId`, `runtime`, `fx`, `ops`, or
 * `accept/reject`. That shape is what prevents authors from accidentally
 * projecting per-tick state into the once-per-session payload.
 */
export function defineStaticView<Contract extends AnyReducerGameContract>() {
  return <Projection>(
    definition: StaticViewDefinition<
      ExactManifestContractOf<Contract>,
      Projection
    >,
  ): StaticViewDefinition<ExactManifestContractOf<Contract>, Projection> =>
    definition;
}

export function defineStage<Contract extends AnyReducerGameContract>() {
  return (
    definition: StageSpec<ContractState<Contract>, ContractManifest<Contract>>,
  ): StageSpec<ContractState<Contract>, ContractManifest<Contract>> =>
    definition;
}

export function definePhaseStage<
  Contract extends AnyReducerGameContract,
  PhaseStateSchema extends SchemaLike<object>,
>() {
  return (
    definition: StageSpec<
      ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
      ContractManifest<Contract>
    >,
  ): StageSpec<
    ScopedPhaseState<ContractState<Contract>, z.infer<PhaseStateSchema>>,
    ContractManifest<Contract>
  > => definition;
}
