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
type NarrowManifestPhaseNames<
  Manifest,
  PhaseNames extends readonly string[],
> = Omit<Manifest, "literals" | "ids"> & {
  literals: Manifest extends { literals: infer L }
    ? Omit<L, "phaseNames"> & { phaseNames: PhaseNames }
    : { phaseNames: PhaseNames };
  ids: Manifest extends { ids: infer I }
    ? Omit<I, "phaseName"> & { phaseName: z.ZodType<PhaseNames[number]> }
    : { phaseName: z.ZodType<PhaseNames[number]> };
};

type ReducerGameContractInput<
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
> = {
  manifest: Manifest;
  state: StateDefinition<PublicSchema, PrivateSchema, HiddenSchema>;
  phases: Phases;
};

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
>(
  definition: ReducerGameContractInput<
    Table,
    Manifest,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases
  >,
): ReducerGameContract<
  Table,
  NarrowManifestPhaseNames<Manifest, readonly (keyof Phases & string)[]>,
  PublicSchema,
  PrivateSchema,
  HiddenSchema,
  Phases
> & {
  readonly phases: Phases;
  readonly phaseNames: readonly (keyof Phases & string)[];
  /**
   * Ergonomic shortcut to the manifest-backed Zod id schemas. Equivalent to
   * `definition.manifest.ids`. Prefer `gameContract.schemas.playerId` etc.
   * over re-importing the generated `ids` namespace so that every authored
   * schema is anchored to the same SDK-guided source.
   */
  readonly schemas: ManifestIdSchemasOf<
    NarrowManifestPhaseNames<
      Manifest,
      readonly (keyof Phases & string)[]
    >["ids"]
  >;
} {
  validateStateSchemaIdBranding(definition.state.public, "public");
  validateStateSchemaIdBranding(definition.state.private, "private");
  validateStateSchemaIdBranding(definition.state.hidden, "hidden");
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
    phaseNames,
    schemas: narrowedManifest.ids,
  } as ReducerGameContract<
    Table,
    NarrowManifestPhaseNames<Manifest, readonly (keyof Phases & string)[]>,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    Phases
  > & {
    readonly phases: Phases;
    readonly phaseNames: readonly (keyof Phases & string)[];
    readonly schemas: ManifestIdSchemasOf<
      NarrowManifestPhaseNames<
        Manifest,
        readonly (keyof Phases & string)[]
      >["ids"]
    >;
  };
  return contract;
}
