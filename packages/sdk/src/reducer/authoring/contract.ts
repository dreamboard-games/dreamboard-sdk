import { z } from "zod";
import { createManifestStringLiteralSchema } from "../model/manifest";
import type {
  ReducerGameContract,
  ReducerManifestContract,
  RuntimeTableRecord,
  SchemaLike,
  StateDefinition,
} from "../model";
import {
  type ManifestIdSchemasOf,
  validateStateSchemaIdBranding,
} from "./validation";

/**
 * Narrows a manifest's `literals.phaseNames` and `ids.phaseName` to the
 * author-supplied phase-name tuple. Lets `defineGameContract` override the
 * codegen-emitted `phaseNames: readonly string[]` / `phaseName: z.string()`
 * placeholders so `PhaseNameOfContract<Contract>` resolves to a literal
 * union and flows through `fx.transition`, `PhaseMapOf`, and the flow
 * state's `currentPhase`.
 */
export type NarrowManifestPhaseNames<
  Manifest,
  PhaseNames extends readonly string[],
> = Manifest & {
  literals: Manifest extends { literals: infer L }
    ? Omit<L, "phaseNames"> & { phaseNames: PhaseNames }
    : { phaseNames: PhaseNames };
  ids: Manifest extends { ids: infer I }
    ? Omit<I, "phaseName"> & { phaseName: z.ZodType<PhaseNames[number]> }
    : { phaseName: z.ZodType<PhaseNames[number]> };
};

export type ReducerGameContractInput<
  Table extends RuntimeTableRecord,
  Manifest extends ReducerManifestContract<
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
  Phases extends Record<string, SchemaLike<object>>,
  Errors extends Record<string, string> | undefined = undefined,
> = {
  manifest: Manifest;
  state: StateDefinition<PublicSchema, PrivateSchema, HiddenSchema>;
  phases: Phases;
  errors?: Errors;
};

export type DefinedGameContract<
  Table extends RuntimeTableRecord,
  Manifest extends ReducerManifestContract<
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
  Phases extends Record<string, SchemaLike<object>>,
  Errors extends Record<string, string> | undefined = undefined,
> = ReducerGameContract<
  Table,
  NarrowManifestPhaseNames<Manifest, readonly (keyof Phases & string)[]>,
  PublicSchema,
  PrivateSchema,
  HiddenSchema,
  Phases,
  Errors
> & {
  readonly phases: Phases;
  readonly errors: Errors;
  readonly phaseNames: readonly (keyof Phases & string)[];
  readonly schemas: ManifestIdSchemasOf<
    NarrowManifestPhaseNames<
      Manifest,
      readonly (keyof Phases & string)[]
    >["ids"]
  >;
};

function validateErrorMap(errors: Record<string, string> | undefined): void {
  if (!errors) return;
  const codePattern = /^[A-Z][A-Z0-9_]*$/;
  for (const [code, message] of Object.entries(errors)) {
    if (!codePattern.test(code)) {
      throw new Error(
        `defineGameContract: error code '${code}' must use UPPER_SNAKE_CASE.`,
      );
    }
    if (typeof message !== "string" || message.length === 0) {
      throw new Error(
        `defineGameContract: error code '${code}' must declare a non-empty default message.`,
      );
    }
  }
}

export function defineGameContract<
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
  definition: ReducerGameContractInput<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  >,
): DefinedGameContract<
  Table,
  Manifest,
  PublicSchema,
  PrivateSchema,
  HiddenSchema,
  Phases,
  Errors
> {
  validateStateSchemaIdBranding(definition.state.public, "public");
  validateStateSchemaIdBranding(definition.state.private, "private");
  validateStateSchemaIdBranding(definition.state.hidden, "hidden");
  validateErrorMap(definition.errors);
  const phaseNames = Object.keys(definition.phases) as (keyof Phases &
    string)[];
  if (phaseNames.length === 0) {
    throw new Error(
      "defineGameContract: phases must be a non-empty record of phase schemas.",
    );
  }
  for (const name of phaseNames) {
    if (typeof name !== "string" || name.length === 0) {
      throw new Error(
        "defineGameContract: phase names must be non-empty strings.",
      );
    }
  }
  const phaseNameSchema = createManifestStringLiteralSchema(phaseNames);
  const narrowedManifest = {
    ...definition.manifest,
    literals: {
      ...definition.manifest.literals,
      phaseNames,
    },
    ids: {
      ...definition.manifest.ids,
      phaseName: phaseNameSchema,
    },
  } as unknown as NarrowManifestPhaseNames<
    Manifest,
    readonly (keyof Phases & string)[]
  >;
  const contract = {
    manifest: narrowedManifest,
    state: definition.state,
    phases: definition.phases,
    errors: definition.errors,
    phaseNames,
    schemas: narrowedManifest.ids,
  } as DefinedGameContract<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases,
    Errors
  >;
  return contract;
}
