import type {
  PhaseMapOf,
  ReducerGameDefinition,
  ReducerManifestContract,
  RuntimeTableRecord,
  SchemaLike,
  ViewMapOf,
} from "../model";
import { createContractAuthoring } from "./contract-authoring";
import {
  defineGameContract,
  type DefinedGameContract,
  type ReducerGameContractInput,
} from "./contract";
import type { AnyReducerGameContract } from "./types";
import {
  validateDefineGamePhaseNames,
  validateDefineGameSimultaneousPhases,
  validateDefineGameZoneWiring,
} from "./validation";

export function defineGameDefinition<
  const Contract extends AnyReducerGameContract,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: { contract: Contract } & Omit<
    ReducerGameDefinition<NoInfer<Contract>, Definitions, Views>,
    "contract"
  >,
): ReducerGameDefinition<Contract, Definitions, Views> {
  validateDefineGamePhaseNames(definition);
  validateDefineGameSimultaneousPhases(definition);
  validateDefineGameZoneWiring(definition);
  return definition;
}

/**
 * Defines the complete game through two deliberate inference stages.
 *
 * The model argument establishes manifest ids, state schemas, phase names,
 * phase-state schemas, and error codes. The implementation callback then
 * receives helpers bound to that fixed model. Authors may keep the callback
 * in one file or pass the bound helpers to any module structure they prefer.
 */
export function defineGame<
  Table extends RuntimeTableRecord,
  const Manifest extends ReducerManifestContract<
    Table,
    string,
    string,
    string,
    string,
    string
  >,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  const Phases extends Record<string, SchemaLike<object>>,
  const Errors extends Record<string, string> | undefined = undefined,
  Contract extends DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  > = DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  >,
  Definitions extends PhaseMapOf<Contract> = PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract> = ViewMapOf<Contract>,
>(
  model: ReducerGameContractInput<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  >,
  implement: (
    game: import("./contract-authoring").ContractAuthoring<Contract>,
  ) => Omit<ReducerGameDefinition<Contract, Definitions, Views>, "contract">,
): ReducerGameDefinition<Contract, Definitions, Views> {
  const contract = defineGameContract(model) as Contract;
  const authoring = createContractAuthoring(contract);
  return defineGameDefinition({
    contract,
    ...implement(authoring),
  });
}
