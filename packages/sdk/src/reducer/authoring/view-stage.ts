import type { z } from "zod";
import type {
  ExactManifestContractOf,
  SchemaLike,
  StageSpec,
  StaticViewDefinition,
  EmptyViewDefinition,
  PlayerViewDefinition,
  SharedViewDefinition,
} from "../model";
import type { ScopedPhaseState } from "../model/spec/runtime-args";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

export function defineSharedView<Contract extends AnyReducerGameContract>() {
  return <Projection>(
    definition: SharedViewDefinition<
      ContractState<Contract>,
      ContractManifest<Contract>,
      Projection
    >,
  ): SharedViewDefinition<
    ContractState<Contract>,
    ContractManifest<Contract>,
    Projection
  > => definition;
}

export function definePlayerView<Contract extends AnyReducerGameContract>() {
  return <SharedProjection = unknown, Projection = unknown>(
    definition: PlayerViewDefinition<
      ContractState<Contract>,
      ContractManifest<Contract>,
      SharedProjection,
      Projection
    >,
  ): PlayerViewDefinition<
    ContractState<Contract>,
    ContractManifest<Contract>,
    SharedProjection,
    Projection
  > => definition;
}

export function defineEmptyView<
  Contract extends AnyReducerGameContract,
>(): EmptyViewDefinition<ContractState<Contract>, ContractManifest<Contract>> {
  return {
    project: () => ({}),
  } as EmptyViewDefinition<ContractState<Contract>, ContractManifest<Contract>>;
}

/**
 * Factory for the session-scoped static view (see {@link StaticViewDefinition}).
 * Kept separate from dynamic view helpers because the argument shape is
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
