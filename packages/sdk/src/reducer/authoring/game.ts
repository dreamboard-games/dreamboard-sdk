import type {
  PhaseMapOf,
  PhaseNameOfContract,
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
 * Creates the bound authoring object for a model without assembling the game.
 *
 * This is the module-level primitive behind {@link defineGame}: the returned
 * value is the type leaf (`typeof game.types.State`), the factory namespace
 * (`game.phase(name)`, `game.views.*`), and the assembler (`game.assemble`).
 * Phase files import it directly, so no factory wrappers or `*AuthoringOf`
 * parameter types are needed.
 */
export function createGame<
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
): import("./contract-authoring").GameAuthoring<
  DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  >
> {
  return createContractAuthoring(defineGameContract(model));
}

/**
 * Rejects phase keys that the model did not declare. `PhaseMapOf<Contract>`
 * already requires every declared phase; this closes the other direction so
 * an extra key fails at the `defineGame` return instead of at runtime.
 */
type NoUndeclaredPhases<Contract, Definitions> = {
  [Name in Exclude<
    keyof Definitions,
    PhaseNameOfContract<Contract>
  >]: `Phase '${Name & string}' is not declared in model.phases`;
};

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
    game: import("./contract-authoring").GameAuthoring<Contract>,
  ) => Omit<ReducerGameDefinition<Contract, Definitions, Views>, "contract"> & {
    phases: NoUndeclaredPhases<Contract, Definitions>;
  },
): ReducerGameDefinition<Contract, Definitions, Views> {
  const contract = defineGameContract(model) as Contract;
  const authoring = createContractAuthoring(contract);
  // The intersection with `NoUndeclaredPhases` only exists to reject extra
  // keys at the call site; the assembled definition keeps the inferred map.
  const implemented: Omit<
    ReducerGameDefinition<Contract, Definitions, Views>,
    "contract"
  > = implement(authoring);
  return defineGameDefinition<Contract, Definitions, Views>({
    contract,
    ...implemented,
  });
}
