import type { ViewData } from "../model/spec/views";
import type { z } from "zod";
import type {
  BaseGameStateOfContract,
  ReducerManifestContractLike,
  ManifestContractOf,
  ErrorCodeOfContract,
  PhaseDefinition,
  ViewDefinition,
  RuntimeTableRecord,
  SchemaLike,
  StateDefinition,
} from "../model";

export type AnyReducerGameContract = {
  manifest: ReducerManifestContractLike<RuntimeTableRecord>;
  options: SchemaLike<import("../model").RuntimeRecord>;
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

export type ReducerViewDefinition<
  Contract extends AnyReducerGameContract,
  Projection extends ViewData = ViewData,
> = ViewDefinition<
  ContractState<Contract>,
  ContractManifest<Contract>,
  Projection
>;

export type PhaseStateOfSchema<PhaseStateSchema extends SchemaLike<object>> =
  z.infer<PhaseStateSchema>;
