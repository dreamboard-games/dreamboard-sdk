import type { RuntimeRecord } from "./table";
import * as z from "zod";
import type {
  AnySchema,
  ZoneDefinitions,
  RuntimeTableRecord,
  SchemaLike,
} from "./table";
import type { CardIdOfTable, ZoneIdOfTable, PlayerIdOfTable } from "./extract";
import type { TableQueriesOfState } from "./queries";

declare const manifestIdSchemaBrand: unique symbol;

export type ManifestIdFamily = keyof ManifestIds<
  string,
  string,
  string,
  string
>;

export type ManifestIdSchema<
  Output = unknown,
  Family extends ManifestIdFamily | undefined = ManifestIdFamily | undefined,
> = z.ZodType<Output> & {
  readonly [manifestIdSchemaBrand]: Family;
};

export type ManifestLiterals<
  PlayerId extends string,
  ZoneId extends string,
  CardId extends string,
  PhaseName extends string = string,
> = {
  playerIds: readonly PlayerId[];
  phaseNames: readonly PhaseName[];
  boardLayouts: readonly ("generic" | "hex" | "square")[];
  cardSetIds: readonly string[];
  cardTypes: readonly string[];
  zoneIds: readonly ZoneId[];
  cardIds: readonly CardId[];
  resourceIds: readonly string[];
  resourcePresentationById?: Record<
    string,
    { label: string; icon?: string | null }
  >;
  /** Resources whose balances are projected only to their holder. */
  ownerResourceIds?: readonly string[];
  pieceTypeIds: readonly string[];
  pieceIds: readonly string[];
  dieTypeIds: readonly string[];
  dieIds: readonly string[];
  tileTypeIds: readonly string[];
  tileIds: readonly string[];
  boardTypeIds: readonly string[];
  boardBaseIds: readonly string[];
  boardIds: readonly string[];
  relationTypeIds: readonly string[];
  edgeIds: readonly string[];
  edgeTypeIds: readonly string[];
  vertexIds: readonly string[];
  vertexTypeIds: readonly string[];
  spaceIds: readonly string[];
  spaceTypeIds: readonly string[];
  cardSetIdByCardId: Record<CardId, string>;
  cardTypeByCardId: Record<CardId, string>;
};

export type ManifestIds<
  PlayerId extends string,
  ZoneId extends string,
  CardId extends string,
  PhaseName extends string = string,
> = {
  playerId: z.ZodType<PlayerId>;
  phaseName: z.ZodType<PhaseName>;
  boardLayout: AnySchema;
  cardSetId: AnySchema;
  cardType: AnySchema;
  cardId: z.ZodType<CardId>;
  zoneId: z.ZodType<ZoneId>;
  resourceId: AnySchema;
  pieceTypeId: AnySchema;
  pieceId: AnySchema;
  dieId: AnySchema;
  dieTypeId: AnySchema;
  tileId: AnySchema;
  tileTypeId: AnySchema;
  boardTypeId: AnySchema;
  boardId: AnySchema;
  boardBaseId: AnySchema;
  relationTypeId: AnySchema;
  edgeId: AnySchema;
  edgeTypeId: AnySchema;
  vertexId: AnySchema;
  vertexTypeId: AnySchema;
  spaceId: AnySchema;
  spaceTypeId: AnySchema;
};

export type ManifestDefaults<Table extends RuntimeTableRecord> = {
  zones: (playerIds?: readonly string[]) => Table["zones"];
  ownerOfCard: (playerIds?: readonly string[]) => Table["ownerOfCard"];
  visibility: (playerIds?: readonly string[]) => Table["visibility"];
  resources: (playerIds?: readonly string[]) => Table["resources"];
};

export type ManifestNormalSetup<Table extends RuntimeTableRecord> = {
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly createInitialTable: (options: {
    readonly playerIds: readonly string[];
  }) => Table;
};

export type ReducerManifestContract<
  Table extends RuntimeTableRecord,
  PhaseName extends string,
  PlayerId extends string,
  ZoneId extends string,
  CardId extends string,
  Definitions extends ZoneDefinitions = ZoneDefinitions,
> = Definitions & {
  literals: ManifestLiterals<PlayerId, ZoneId, CardId, PhaseName>;
  ids: ManifestIds<PlayerId, ZoneId, CardId, PhaseName>;
  defaults: ManifestDefaults<Table>;
  normalSetup: ManifestNormalSetup<Table>;
  tableSchema: z.ZodType<Table>;
};

export type ReducerManifestContractLike<
  Table extends RuntimeTableRecord = RuntimeTableRecord,
  PhaseName extends string = string,
  PlayerId extends string = string,
  ZoneId extends string = string,
  CardId extends string = string,
> = ReducerManifestContract<Table, PhaseName, PlayerId, ZoneId, CardId>;

export type ManifestContract<
  Table extends RuntimeTableRecord,
  Definitions extends ZoneDefinitions = ZoneDefinitions,
> = ReducerManifestContract<
  Table,
  string,
  PlayerIdOfTable<Table>,
  ZoneIdOfTable<Table>,
  CardIdOfTable<Table>,
  Definitions
>;

function toNonEmptyStringTuple<Values extends readonly string[]>(
  values: Values,
): [Values[number], ...Array<Values[number]>] {
  const [first, ...rest] = Array.from(values);
  if (typeof first === "undefined") {
    throw new Error("Expected a non-empty literal tuple");
  }
  return [first, ...(rest as Array<Values[number]>)];
}

/**
 * Registry of Zod schemas produced by `createManifestStringLiteralSchema`.
 *
 * The schemas returned from this helper are the canonical manifest-scoped
 * branded schemas (e.g. `manifest.ids.playerId`). When a manifest has zero
 * members for a given id family the underlying schema falls back to plain
 * `z.string()`, which is indistinguishable from an author-written
 * `z.string()` at runtime. This WeakMap lets `defineGameContract` recognise
 * the manifest-supplied case and lets schema-aware consumers distinguish
 * semantic ID families without inferring them from authored field names. A
 * schema marked without a family remains manifest-scoped for compatibility.
 */
const manifestScopedSchemas = new WeakMap<
  object,
  ManifestIdFamily | undefined
>();

export function markManifestScopedSchema<
  Schema extends z.ZodTypeAny,
  const Family extends ManifestIdFamily | undefined = undefined,
>(
  schema: Schema,
  family?: Family,
): Schema & ManifestIdSchema<z.infer<Schema>, Family> {
  manifestScopedSchemas.set(schema, family);
  return schema as Schema & ManifestIdSchema<z.infer<Schema>, Family>;
}

export function isManifestScopedSchema(schema: unknown): boolean {
  return (
    typeof schema === "object" &&
    schema !== null &&
    manifestScopedSchemas.has(schema)
  );
}

export function manifestSchemaFamily(
  schema: unknown,
): ManifestIdFamily | undefined {
  if (typeof schema !== "object" || schema === null) {
    return undefined;
  }
  return manifestScopedSchemas.get(schema);
}

export function createManifestStringLiteralSchema<
  Values extends readonly string[],
  const Family extends ManifestIdFamily | undefined = undefined,
>(
  values: Values,
  family?: Family,
): ManifestIdSchema<
  Values[number] extends never ? string : Values[number],
  Family
> {
  const schema =
    values.length === 0
      ? (z.string() as z.ZodType<
          Values[number] extends never ? string : Values[number]
        >)
      : (z.enum(toNonEmptyStringTuple(values)) as z.ZodType<
          Values[number] extends never ? string : Values[number]
        >);
  return markManifestScopedSchema(schema, family);
}

export function assumeManifestSchema<
  Output,
  Family extends ManifestIdFamily | undefined,
>(schema: ManifestIdSchema<unknown, Family>): ManifestIdSchema<Output, Family>;
export function assumeManifestSchema<Output>(
  schema: z.ZodTypeAny,
): z.ZodType<Output>;
export function assumeManifestSchema<Output>(
  schema: z.ZodTypeAny,
): z.ZodType<Output> {
  return schema as z.ZodType<Output>;
}

// --- State Definition ---

export type StateDefinition<
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
> = {
  public: PublicSchema;
  private: PrivateSchema;
  hidden: HiddenSchema;
};

export type InitContext<
  Table extends RuntimeTableRecord,
  Manifest extends ReducerManifestContract<
    Table,
    string,
    string,
    string,
    string
  > = ManifestContract<Table>,
  Options extends RuntimeRecord = RuntimeRecord,
> = {
  manifest: Manifest;
  table: Table;
  playerIds: PlayerIdOfTable<Table>[];
  rngSeed?: number | null;
  options: Options;
  q: TableQueriesOfState<{ table: Table }, Manifest>;
};
