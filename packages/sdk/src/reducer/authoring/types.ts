import type { z } from "zod";
import type {
  BaseGameStateOfContract,
  GeneratedManifestContractLike,
  ManifestContractOf,
  ErrorCodeOfContract,
  PhaseDefinition,
  PlayerViewDefinition,
  RuntimeTableRecord,
  SchemaLike,
  SharedViewDefinition,
  StateDefinition,
} from "../model";

export type AnyReducerGameContract = {
  manifest: GeneratedManifestContractLike<RuntimeTableRecord>;
  state: StateDefinition<
    SchemaLike<object>,
    SchemaLike<object>,
    SchemaLike<object>
  >;
};

export type PhaseStateInput = SchemaLike<object> | object;

export type InferPhaseState<Input extends PhaseStateInput> =
  Input extends SchemaLike<infer Output>
    ? Output extends object
      ? Output
      : object
    : Input extends object
      ? Input
      : object;

export type ContractState<Contract extends AnyReducerGameContract> =
  BaseGameStateOfContract<Contract>;

export type ContractManifest<Contract extends AnyReducerGameContract> =
  ManifestContractOf<Contract>;

export type ContractErrorCode<Contract extends AnyReducerGameContract> =
  ErrorCodeOfContract<Contract>;

export type ScopedContractState<
  Contract extends AnyReducerGameContract,
  PhaseState extends object,
> = ContractState<Contract> & { phase: PhaseState };

export type ReducerPhaseDefinition<
  Contract extends AnyReducerGameContract,
  PhaseStateSchema extends SchemaLike<object>,
> = PhaseDefinition<
  PhaseStateSchema,
  ContractState<Contract>,
  ContractManifest<Contract>
>;

export type ReducerSharedViewDefinition<
  Contract extends AnyReducerGameContract,
  Projection = unknown,
> = SharedViewDefinition<
  ContractState<Contract>,
  ContractManifest<Contract>,
  Projection
>;

export type ReducerPlayerViewDefinition<
  Contract extends AnyReducerGameContract,
  SharedProjection = unknown,
  Projection = unknown,
> = PlayerViewDefinition<
  ContractState<Contract>,
  ContractManifest<Contract>,
  SharedProjection,
  Projection
>;

export type PhaseStateOfSchema<PhaseStateSchema extends SchemaLike<object>> =
  z.infer<PhaseStateSchema>;
