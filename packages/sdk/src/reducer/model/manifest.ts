import { Zod as ContractZod } from "@dreamboard-games/reducer-contract";
import { z } from "zod";
import type {
  AnySchema,
  RuntimeHandVisibilityMode,
  RuntimeTableRecord,
  SchemaLike,
} from "./table";
import type {
  BoardBaseIdOfManifest,
  BoardContainerIdOfManifest,
  CardIdOfManifest,
  CardIdOfTable,
  DeckIdOfTable,
  DieIdOfManifest,
  HandIdOfTable,
  PieceIdOfManifest,
  PlayerIdOfManifest,
  PlayerIdOfTable,
  SetupSelectionInputOfManifest,
  PlayerZoneIdOfManifest,
  SetupSelectionOfManifest,
  SharedZoneIdOfManifest,
  SpaceIdOfManifest,
} from "./extract";
import type { TableQueriesOfState } from "./queries";

declare const manifestIdSchemaBrand: unique symbol;

export type ManifestIdFamily = keyof ManifestIds<
  string,
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
  DeckId extends string,
  HandId extends string,
  CardId extends string,
  PhaseName extends string = string,
> = {
  playerIds: readonly PlayerId[];
  phaseNames: readonly PhaseName[];
  boardLayouts: readonly ("generic" | "hex" | "square")[];
  setupOptionIds: readonly string[];
  setupProfileIds: readonly string[];
  cardSetIds: readonly string[];
  cardTypes: readonly string[];
  deckIds: readonly DeckId[];
  handIds: readonly HandId[];
  sharedZoneIds: readonly DeckId[];
  playerZoneIds: readonly HandId[];
  zoneIds: readonly (DeckId | HandId)[];
  cardIds: readonly CardId[];
  resourceIds: readonly string[];
  resourcePresentationById?: Record<
    string,
    { label: string; icon?: string | null }
  >;
  pieceTypeIds: readonly string[];
  pieceIds: readonly string[];
  dieTypeIds: readonly string[];
  dieIds: readonly string[];
  boardTemplateIds: readonly string[];
  boardTypeIds: readonly string[];
  boardBaseIds: readonly string[];
  boardIds: readonly string[];
  boardContainerIds: readonly string[];
  relationTypeIds: readonly string[];
  edgeIds: readonly string[];
  edgeTypeIds: readonly string[];
  vertexIds: readonly string[];
  vertexTypeIds: readonly string[];
  spaceIds: readonly string[];
  spaceTypeIds: readonly string[];
  handVisibilityById: Record<HandId, RuntimeHandVisibilityMode>;
  zoneVisibilityById: Record<DeckId | HandId, RuntimeHandVisibilityMode>;
  setupChoiceIdsByOptionId: Record<string, readonly string[]>;
  cardSetIdByCardId: Record<CardId, string>;
  cardTypeByCardId: Record<CardId, string>;
  cardSetIdsBySharedZoneId: Record<DeckId, readonly string[]>;
  cardSetIdsByPlayerZoneId: Record<HandId, readonly string[]>;
};

export type ManifestIds<
  PlayerId extends string,
  DeckId extends string,
  HandId extends string,
  CardId extends string,
  PhaseName extends string = string,
> = {
  playerId: z.ZodType<PlayerId>;
  phaseName: z.ZodType<PhaseName>;
  boardLayout: AnySchema;
  setupOptionId: AnySchema;
  setupProfileId: AnySchema;
  cardSetId: AnySchema;
  cardType: AnySchema;
  cardId: z.ZodType<CardId>;
  deckId: z.ZodType<DeckId>;
  handId: z.ZodType<HandId>;
  sharedZoneId: AnySchema;
  playerZoneId: AnySchema;
  zoneId: AnySchema;
  resourceId: AnySchema;
  pieceTypeId: AnySchema;
  pieceId: AnySchema;
  dieId: AnySchema;
  dieTypeId: AnySchema;
  boardTypeId: AnySchema;
  boardId: AnySchema;
  boardBaseId: AnySchema;
  boardContainerId: AnySchema;
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
  decks: (playerIds?: readonly string[]) => Table["decks"];
  hands: (playerIds?: readonly string[]) => Table["hands"];
  handVisibility: (playerIds?: readonly string[]) => Table["handVisibility"];
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

export type StaticBoards<Table extends RuntimeTableRecord> = Pick<
  Table["boards"],
  "byId" | "hex" | "square"
>;

export type StaticBoardsJsonEnvelope<
  Table extends RuntimeTableRecord = RuntimeTableRecord,
> = {
  formatVersion: 1;
  generatedBy: "@dreamboard-games/sdk/codegen";
  boards: StaticBoards<Table>;
  initialTable: Table;
};

export type SetupOptionChoiceMetadata = {
  id: string;
  label: string;
  description?: string | null;
};

export type SetupOptionMetadata = {
  id: string;
  name: string;
  description?: string | null;
  choices: readonly SetupOptionChoiceMetadata[];
};

export type SetupProfileMetadata = {
  id: string;
  name: string;
  description?: string | null;
  optionValues?: Record<string, string> | null;
  guidance?: {
    summary?: string | null;
    steps: readonly {
      id: string;
      label: string;
      description?: string | null;
    }[];
  } | null;
};

export type ReducerManifestContract<
  Table extends RuntimeTableRecord,
  PhaseName extends string,
  PlayerId extends string,
  DeckId extends string,
  HandId extends string,
  CardId extends string,
> = {
  literals: ManifestLiterals<PlayerId, DeckId, HandId, CardId, PhaseName>;
  ids: ManifestIds<PlayerId, DeckId, HandId, CardId, PhaseName>;
  defaults: ManifestDefaults<Table>;
  /**
   * Generic normal-session setup capability emitted by workspace codegen.
   *
   * This remains optional on the structural contract so small handwritten
   * manifests can model focused reducer tests without recreating generated
   * topology metadata. Generated workspace manifests always provide it.
   */
  normalSetup?: ManifestNormalSetup<Table>;
  staticBoards?: StaticBoards<Table>;
  setupOptionsById: Record<string, SetupOptionMetadata>;
  setupChoiceIdsByOptionId: Record<string, readonly string[]>;
  setupProfilesById: Record<string, SetupProfileMetadata>;
  tableSchema: z.ZodType<Table>;
  runtimeSchema: AnySchema;
  createGameStateSchema: (config: {
    phaseNameSchema: AnySchema;
    publicSchema: AnySchema;
    privateSchema: AnySchema;
    hiddenSchema: AnySchema;
    phasesSchema: AnySchema;
  }) => AnySchema;
};

export type GeneratedManifestContractLike<
  Table extends RuntimeTableRecord = RuntimeTableRecord,
  PhaseName extends string = string,
  PlayerId extends string = string,
  DeckId extends string = string,
  HandId extends string = string,
  CardId extends string = string,
> = ReducerManifestContract<Table, PhaseName, PlayerId, DeckId, HandId, CardId>;

export type ManifestContract<Table extends RuntimeTableRecord> =
  ReducerManifestContract<
    Table,
    string,
    PlayerIdOfTable<Table>,
    DeckIdOfTable<Table>,
    HandIdOfTable<Table>,
    CardIdOfTable<Table>
  >;

function toNonEmptyStringTuple<Values extends readonly string[]>(
  values: Values,
): [Values[number], ...Array<Values[number]>] {
  const [first, ...rest] = Array.from(values);
  if (typeof first === "undefined") {
    throw new Error("Expected a non-empty literal tuple");
  }
  return [first as Values[number], ...(rest as Array<Values[number]>)];
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
  manifestScopedSchemas.set(schema as unknown as object, family);
  return schema as Schema & ManifestIdSchema<z.infer<Schema>, Family>;
}

export function isManifestScopedSchema(schema: unknown): boolean {
  return (
    typeof schema === "object" &&
    schema !== null &&
    manifestScopedSchemas.has(schema as object)
  );
}

export function manifestSchemaFamily(
  schema: unknown,
): ManifestIdFamily | undefined {
  if (typeof schema !== "object" || schema === null) {
    return undefined;
  }
  return manifestScopedSchemas.get(schema as object);
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

export function cloneManifestDefault<Value>(value: Value): Value {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as Value;
}

export function resolveManifestPlayerIds<PlayerId extends string>(
  manifestPlayerIds: readonly PlayerId[],
  playerIds: readonly string[] | undefined,
): readonly PlayerId[] {
  if (!playerIds || playerIds.length === 0) {
    return manifestPlayerIds;
  }

  const knownPlayerIds = new Set<string>(manifestPlayerIds);
  return playerIds.filter((playerId): playerId is PlayerId =>
    knownPlayerIds.has(playerId),
  );
}

export function createManifestRuntimeSchema<
  PhaseNameSchema extends z.ZodTypeAny,
  PlayerId extends string,
  SetupProfileId extends string,
>({
  phaseNameSchema,
  playerIdSchema,
  setupProfileIdSchema,
}: {
  phaseNameSchema: PhaseNameSchema;
  playerIdSchema: z.ZodType<PlayerId>;
  setupProfileIdSchema: z.ZodType<SetupProfileId>;
}) {
  return z.object({
    prompts: z
      .array(
        z.object({
          id: z.string(),
          promptId: z.string(),
          to: playerIdSchema,
          title: z.string().optional(),
          payload: z.unknown().optional(),
          options: z
            .array(z.object({ id: z.string(), label: z.string() }))
            .optional(),
          resume: z.object({ id: z.string(), data: z.unknown() }),
        }),
      )
      .default([]),
    rng: z
      .object({
        seed: z.number().nullable().optional(),
        cursor: z.number().int().default(0),
        trace: z.array(z.string()).default([]),
        draws: z.array(ContractZod.RngDrawSchema).default([]),
      })
      .default({
        seed: null,
        cursor: 0,
        trace: [],
        draws: [],
      }),
    setup: z
      .object({
        profileId: setupProfileIdSchema,
        optionValues: z.record(z.string(), z.string().nullable()).default({}),
      })
      .nullable()
      .default(null),
    simultaneous: z
      .object({
        current: z
          .object({
            phaseName: phaseNameSchema,
            actors: z.array(playerIdSchema),
            submissions: z.record(
              z.string(),
              z.object({
                interactionId: z.string(),
                params: z.unknown(),
              }),
            ),
          })
          .nullable(),
      })
      .default({ current: null }),
    lastTransition: z
      .object({
        from: phaseNameSchema,
        to: phaseNameSchema,
      })
      .nullable()
      .default(null),
    nextInstanceId: z.number().int().default(1),
  });
}

export function createManifestGameStateSchema<
  Table extends RuntimeTableRecord,
  PhaseNameSchema extends z.ZodTypeAny,
  PublicSchema extends z.ZodTypeAny,
  PrivateSchema extends z.ZodTypeAny,
  HiddenSchema extends z.ZodTypeAny,
  PhasesSchema extends z.ZodTypeAny,
  PlayerId extends string,
  SetupProfileId extends string,
>({
  tableSchema,
  playerIdSchema,
  setupProfileIdSchema,
  phaseNameSchema,
  publicSchema,
  privateSchema,
  hiddenSchema,
  phasesSchema,
}: {
  tableSchema: z.ZodType<Table>;
  playerIdSchema: z.ZodType<PlayerId>;
  setupProfileIdSchema: z.ZodType<SetupProfileId>;
  phaseNameSchema: PhaseNameSchema;
  publicSchema: PublicSchema;
  privateSchema: PrivateSchema;
  hiddenSchema: HiddenSchema;
  phasesSchema: PhasesSchema;
}) {
  return z.object({
    table: tableSchema,
    public: publicSchema,
    private: z.record(z.string(), privateSchema),
    hidden: hiddenSchema,
    flow: z.object({
      currentPhase: phaseNameSchema,
      turn: z.number().int(),
      round: z.number().int(),
      activePlayers: z.array(playerIdSchema),
    }),
    phase: phasesSchema,
    runtime: createManifestRuntimeSchema({
      phaseNameSchema,
      playerIdSchema,
      setupProfileIdSchema,
    }),
  });
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
    string,
    string
  > = ManifestContract<Table>,
> = {
  manifest: Manifest;
  table: Table;
  playerIds: PlayerIdOfTable<Table>[];
  rngSeed?: number | null;
  setup: SetupSelectionOfManifest<Manifest> | null;
  q: TableQueriesOfState<{ table: Table }>;
};

export type InitSetupSelectionInput<
  Manifest extends ReducerManifestContract<
    RuntimeTableRecord,
    string,
    string,
    string,
    string,
    string
  > = GeneratedManifestContractLike,
> = SetupSelectionInputOfManifest<Manifest>;

// --- Setup Bootstrap Types ---

export type SetupBootstrapSharedZoneRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "sharedZone";
  zoneId: SharedZoneIdOfManifest<Manifest>;
};

export type SetupBootstrapPerPlayerZoneRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "playerZone";
  zoneId: PlayerZoneIdOfManifest<Manifest>;
  playerId: PlayerIdOfManifest<Manifest>;
};

export type SetupBootstrapSharedBoardContainerRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "sharedBoardContainer";
  boardId: BoardBaseIdOfManifest<Manifest>;
  containerId: BoardContainerIdOfManifest<Manifest>;
};

export type SetupBootstrapPerPlayerBoardContainerRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "playerBoardContainer";
  boardId: BoardBaseIdOfManifest<Manifest>;
  playerId: PlayerIdOfManifest<Manifest>;
  containerId: BoardContainerIdOfManifest<Manifest>;
};

export type SetupBootstrapSharedBoardSpaceRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "sharedBoardSpace";
  boardId: BoardBaseIdOfManifest<Manifest>;
  spaceId: SpaceIdOfManifest<Manifest>;
};

export type SetupBootstrapPerPlayerBoardSpaceRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  type: "playerBoardSpace";
  boardId: BoardBaseIdOfManifest<Manifest>;
  playerId: PlayerIdOfManifest<Manifest>;
  spaceId: SpaceIdOfManifest<Manifest>;
};

export type SetupBootstrapContainerRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> =
  | SetupBootstrapSharedZoneRef<Manifest>
  | SetupBootstrapPerPlayerZoneRef<Manifest>
  | SetupBootstrapSharedBoardContainerRef<Manifest>
  | SetupBootstrapPerPlayerBoardContainerRef<Manifest>;

export type SetupBootstrapDestinationRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> =
  | SetupBootstrapContainerRef<Manifest>
  | SetupBootstrapSharedBoardSpaceRef<Manifest>
  | SetupBootstrapPerPlayerBoardSpaceRef<Manifest>;

export type SetupBootstrapPerPlayerContainerTemplateRef<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> =
  | {
      type: "playerZone";
      zoneId: PlayerZoneIdOfManifest<Manifest>;
    }
  | {
      type: "playerBoardContainer";
      boardId: BoardBaseIdOfManifest<Manifest>;
      containerId: BoardContainerIdOfManifest<Manifest>;
    };

export type SetupBootstrapStep<
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> =
  | {
      type: "shuffle";
      container: SetupBootstrapContainerRef<Manifest>;
    }
  | {
      type: "move";
      from: SetupBootstrapContainerRef<Manifest>;
      to: SetupBootstrapDestinationRef<Manifest>;
      count?: number;
      componentIds?: readonly (
        | CardIdOfManifest<Manifest>
        | PieceIdOfManifest<Manifest>
        | DieIdOfManifest<Manifest>
      )[];
    }
  | {
      type: "deal";
      from:
        | SetupBootstrapSharedZoneRef<Manifest>
        | SetupBootstrapSharedBoardContainerRef<Manifest>;
      to: SetupBootstrapPerPlayerContainerTemplateRef<Manifest>;
      count: number;
      playerIds?: readonly PlayerIdOfManifest<Manifest>[];
    };

export type SetupProfileDefinition<
  PhaseName extends string = string,
  Manifest extends GeneratedManifestContractLike =
    GeneratedManifestContractLike,
> = {
  initialPhase?: PhaseName;
  bootstrap?: readonly SetupBootstrapStep<Manifest>[];
};
