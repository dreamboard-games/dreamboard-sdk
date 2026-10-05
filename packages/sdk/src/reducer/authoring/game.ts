import type { GameTopologyManifest } from "../../shared/domain/manifest";
import type { RuntimeRecord } from "../model/table";
import { compileManifest, type ManifestInput } from "../manifest/compiler";
import type {
  AuthoredManifest,
  AuthoredOf,
  ValidatedManifest,
  CompiledManifest,
  ManifestTable,
} from "../manifest/types";
import type {
  ReducerManifestContract,
  RuntimeTableRecord,
  SchemaLike,
} from "../model";
import { createContractAuthoring } from "./contract-authoring";
import {
  defineGameContract,
  type DefinedGameContract,
  type ReducerGameContractInput,
} from "./contract";
/**
 * Creates the bound authoring object for a model without assembling the game.
 *
 * The returned value is the type leaf (`typeof game.types.State`), the factory namespace
 * (`game.phase(name)`, `game.view`), and the assembler (`game.assemble`).
 * Phase files import it directly, so no factory wrappers or `*AuthoringOf`
 * parameter types are needed.
 */
export function createGame<
  const Manifest extends
    AuthoredManifest | ValidatedManifest | GameTopologyManifest,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  const Phases extends Record<string, SchemaLike<object>>,
  const Errors extends Record<string, string> | undefined = undefined,
  OptionsSchema extends SchemaLike<RuntimeRecord> = SchemaLike<
    Record<string, never>
  >,
>(model: {
  manifest: ManifestInput<Manifest>;
  state: { public: PublicSchema; private: PrivateSchema; hidden: HiddenSchema };
  phases: Phases;
  errors?: Errors;
  options?: OptionsSchema;
}): import("./contract-authoring").GameAuthoring<
  DefinedGameContract<
    ManifestTable<AuthoredOf<Manifest>>,
    CompiledManifest<AuthoredOf<Manifest>>,
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
        manifest: AuthoredManifest | ValidatedManifest | GameTopologyManifest;
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
