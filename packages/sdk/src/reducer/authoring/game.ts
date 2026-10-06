import type { RuntimeRecord } from "../model/table";
import type {
  CompiledManifest,
  CompiledManifestWitness,
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
/** Bind a compiler-produced manifest to state schemas, phases and game assembly. */
export function createGame<
  Table extends RuntimeTableRecord,
  const Manifest extends ReducerManifestContract<
    Table,
    string,
    string,
    string,
    string
  > &
    CompiledManifestWitness<CompiledManifest<unknown>>,
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
> {
  return createContractAuthoring(defineGameContract(model));
}
