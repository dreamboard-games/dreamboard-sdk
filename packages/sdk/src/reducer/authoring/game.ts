import type { RuntimeRecord } from "../model/table";
import { compileManifest } from "../manifest/compiler";
import type {
  AuthoredManifest,
  CompiledManifest,
  ManifestTable,
} from "../manifest/types";
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
  const Manifest extends AuthoredManifest,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  const Phases extends Record<string, SchemaLike<object>>,
  const Errors extends Record<string, string> | undefined = undefined,
  OptionsSchema extends SchemaLike<RuntimeRecord> = SchemaLike<
    Record<string, never>
  >,
>(model: {
  manifest: Manifest;
  state: { public: PublicSchema; private: PrivateSchema; hidden: HiddenSchema };
  phases: Phases;
  errors?: Errors;
  options?: OptionsSchema;
}): import("./contract-authoring").GameAuthoring<
  DefinedGameContract<
    ManifestTable<Manifest>,
    CompiledManifest<Manifest>,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors,
    OptionsSchema
  >
>;

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
  OptionsSchema extends SchemaLike<RuntimeRecord> = SchemaLike<
    Record<string, never>
  >,
>(
  model: ReducerGameContractInput<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors,
    OptionsSchema
  >,
): import("./contract-authoring").GameAuthoring<
  DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors,
    OptionsSchema
  >
>;
export function createGame(
  model:
    | ReducerGameContractInput<
        RuntimeTableRecord,
        ReducerManifestContract<
          RuntimeTableRecord,
          string,
          string,
          string,
          string,
          string
        >,
        SchemaLike<object>,
        SchemaLike<object>,
        SchemaLike<object>,
        Record<string, SchemaLike<object>>,
        Record<string, string> | undefined,
        SchemaLike<RuntimeRecord>
      >
    | {
        manifest: AuthoredManifest;
        state: {
          public: SchemaLike<object>;
          private: SchemaLike<object>;
          hidden: SchemaLike<object>;
        };
        phases: Record<string, SchemaLike<object>>;
        errors?: Record<string, string>;
        options?: SchemaLike<RuntimeRecord>;
      },
): unknown {
  const manifest =
    "literals" in model.manifest
      ? model.manifest
      : compileManifest(model.manifest);
  return createContractAuthoring(defineGameContract({ ...model, manifest }));
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
  OptionsSchema extends SchemaLike<RuntimeRecord> = SchemaLike<
    Record<string, never>
  >,
  Contract extends DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors,
    OptionsSchema
  > = DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors,
    OptionsSchema
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
    Errors,
    OptionsSchema
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
