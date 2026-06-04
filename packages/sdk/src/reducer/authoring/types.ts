import type { z } from "zod";
import type {
  BaseGameStateOfContract,
  ManifestContract,
  ManifestContractOf,
  PhaseDefinition,
  RuntimeTableRecord,
  SchemaLike,
  StateDefinition,
  ViewDefinition,
} from "../model";

/**
 * Structural upper bound for reducer game contracts accepted by the
 * authoring-level `define*` factories. The `manifest` slot admits any
 * contract-generated manifest shape (tables, players, decks, etc. vary per
 * contract); `state` is pinned to the base {@link StateDefinition} so the
 * authoring helpers can infer public/private/hidden schemas from it.
 */
export type AnyReducerGameContract = {
  manifest: ManifestContract<RuntimeTableRecord>;
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
  Projection = unknown,
> = ViewDefinition<
  ContractState<Contract>,
  ContractManifest<Contract>,
  Projection
>;

export type PhaseStateOfSchema<PhaseStateSchema extends SchemaLike<object>> =
  z.infer<PhaseStateSchema>;
