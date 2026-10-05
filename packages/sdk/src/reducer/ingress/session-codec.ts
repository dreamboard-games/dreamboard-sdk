import { assertZoneConsistency } from "../table/zones";
import { collectReducerDefinitionIndex } from "../definition-index";
import * as z from "zod";
import * as ContractZod from "../../shared/runtime-schema";
import { safeParseOrThrow } from "../parse-utils";
import { runtimePayloadSchema } from "./runtime-payload";
import type {
  BaseGameSessionOfContract,
  GameStateOf,
  HiddenSchemaOfContract,
  ManifestOf,
  PhaseMapOf,
  PhaseNameOfContract,
  PlayerIdOfState,
  PrivateSchemaOfContract,
  PublicSchemaOfContract,
  ReducerGameContractLike,
  ReducerGameDefinition,
  OptionsOfContract,
  TableOfManifest,
  ViewOfContract,
} from "../model";
import type { IngressRuntimeCodec, RawReducerSessionState } from "./raw-types";
import { createRuntimeInputParser } from "./input-codec";
import { collectIngressPhaseSchemas } from "./phase-schemas";

const runtimeRecordSchema = z.record(z.string(), runtimePayloadSchema);
const runtimeComponentLocationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Detached") }).strict(),
  z
    .object({
      type: z.literal("InZone"),
      zoneId: z.string(),
      hostId: z.string(),
      playedBy: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("OnSpace"),
      boardId: z.string(),
      spaceId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("InContainer"),
      boardId: z.string(),
      containerId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("OnEdge"),
      boardId: z.string(),
      edgeId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("OnVertex"),
      boardId: z.string(),
      vertexId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("InSlot"),
      host: z.union([
        z.object({ kind: z.literal("piece"), id: z.string() }).strict(),
        z.object({ kind: z.literal("die"), id: z.string() }).strict(),
      ]),
      slotId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
]);
const currentRuntimeTableSchema = z
  .object({
    playerOrder: z.array(z.string()),
    zones: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
    cards: z.record(
      z.string(),
      z
        .object({
          componentType: z.string().optional(),
          id: z.string(),
          cardSetId: z.string(),
          cardType: z.string(),
          name: z.string().optional(),
          text: z.string().optional(),
          frontImage: z.string().optional(),
          backImage: z.string().optional(),
          properties: runtimeRecordSchema,
        })
        .strict(),
    ),
    pieces: z.record(
      z.string(),
      z
        .object({
          componentType: z.string().optional(),
          id: z.string(),
          pieceTypeId: z.string(),
          pieceName: z.string().nullable().optional(),
          ownerId: z.string().nullable().optional(),
          properties: runtimeRecordSchema,
        })
        .strict(),
    ),
    componentLocations: z.record(z.string(), runtimeComponentLocationSchema),
    ownerOfCard: z.record(z.string(), z.string().nullable()),
    visibility: z.record(
      z.string(),
      z
        .object({
          faceUp: z.boolean(),
          visibleTo: z.array(z.string()).nullable().optional(),
        })
        .strict(),
    ),
    resources: z.record(z.string().min(1), runtimeRecordSchema),
    boards: z
      .object({
        byId: z.record(z.string(), runtimeRecordSchema),
        hex: z.record(z.string(), runtimeRecordSchema),
        square: z.record(z.string(), runtimeRecordSchema),
        network: z.record(z.string(), runtimeRecordSchema).optional(),
        track: z.record(z.string(), runtimeRecordSchema).optional(),
      })
      .strict(),
    dice: z.record(
      z.string(),
      z
        .object({
          componentType: z.string().optional(),
          id: z.string(),
          dieTypeId: z.string(),
          dieName: z.string().nullable().optional(),
          ownerId: z.string().nullable().optional(),
          sides: z.number().int(),
          value: z.number().int().nullable().optional(),
          properties: runtimeRecordSchema,
        })
        .strict(),
    ),
  })
  .strict();

export function createIngressRuntimeCodec<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, View>,
): IngressRuntimeCodec<
  TableOfManifest<ManifestOf<Contract>>,
  PublicSchemaOfContract<Contract>,
  PrivateSchemaOfContract<Contract>,
  HiddenSchemaOfContract<Contract>,
  PhaseNameOfContract<Contract>,
  OptionsOfContract<Contract>
> {
  type Definition = ReducerGameDefinition<Contract, Definitions, View>;
  type DomainState = GameStateOf<Definition>;
  type State = BaseGameSessionOfContract<Contract>;
  type PhaseName = PhaseNameOfContract<Contract>;
  type ReturnType = IngressRuntimeCodec<
    TableOfManifest<ManifestOf<Contract>>,
    PublicSchemaOfContract<Contract>,
    PrivateSchemaOfContract<Contract>,
    HiddenSchemaOfContract<Contract>,
    PhaseName,
    OptionsOfContract<Contract>
  >;
  type PlayerId = PlayerIdOfState<DomainState>;

  // This schema belongs to Contract; preserve its exact table output where
  // the generic contract enters the codec. All parsed tables use this schema.
  const tableSchema = definition.contract.manifest.tableSchema as z.ZodType<
    TableOfManifest<ManifestOf<Contract>>
  >;

  const { phaseNameSchema } = collectIngressPhaseSchemas(definition);
  const definitionIndex = collectReducerDefinitionIndex(definition);
  const playerIdSchema = definition.contract.manifest.ids
    .playerId as z.ZodType<PlayerId>;

  const flowSchema = z.object({
    currentPhase: phaseNameSchema,
    turn: z.number().int(),
    round: z.number().int(),
    activePlayers: z.array(playerIdSchema),
  });
  function parseOptions(rawOptions: unknown): OptionsOfContract<Contract> {
    const jsonInput = runtimeRecordSchema.parse(rawOptions);
    const parsed = safeParseOrThrow(
      definition.contract.options,
      jsonInput,
      "options",
    );
    return runtimeRecordSchema.parse(parsed) as OptionsOfContract<Contract>;
  }
  const runtimeStateSchema = z.object({
    events: z.array(ContractZod.GameEventSchema).max(32),
    rng: z.object({
      seed: z.number().int().nullable(),
      cursor: z.number().int(),
      trace: z.array(z.string()),
      draws: z.array(ContractZod.RngDrawSchema).default([]),
    }),
    options: z.unknown().transform(parseOptions),
    pending: z.partialRecord(
      playerIdSchema,
      z
        .object({
          phaseName: phaseNameSchema,
          interactionId: z.string().min(1),
          values: z.array(runtimePayloadSchema).min(1),
        })
        .strict()
        .refine((pending) => {
          const phase = definitionIndex.phasesByName.get(pending.phaseName);
          const steps = phase?.interactions.find(
            ([id]) => id === pending.interactionId,
          )?.[1].steps;
          return !!steps && pending.values.length < steps.entries.length;
        }, "Pending interaction must name an authored stepped interaction with an unfinished prefix."),
    ),
    simultaneous: z.object({
      current: z
        .object({
          phaseName: phaseNameSchema,
          actors: z.array(playerIdSchema),
          submissions: z.record(
            z.string(),
            z.object({
              interactionId: z.string(),
              params: runtimePayloadSchema,
            }),
          ),
        })
        .nullable(),
    }),
    lastTransition: z
      .object({
        from: phaseNameSchema,
        to: phaseNameSchema,
      })
      .nullable(),
  });
  const parseRuntimeInput = createRuntimeInputParser(playerIdSchema);

  // The return type uses branded/mapped types derived from the contract generic.
  // TypeScript cannot verify that plain objects satisfy these deep mapped types,
  // but the runtime Zod parsing ensures correctness.
  // eslint-disable-next-line no-restricted-syntax -- Every codec method is constructed from this Contract's schemas; the return binding restores its conditional state and identity types.
  return {
    defaultRuntimeState(
      seed: number | null = null,
      options: OptionsOfContract<Contract>,
    ) {
      const runtimeState: State["runtime"] = {
        events: [],
        rng: {
          seed,
          cursor: 0,
          trace: [],
          draws: [],
        },
        options,
        pending: {},
        simultaneous: { current: null },
        lastTransition: null,
      };
      return runtimeState;
    },
    parseInitialOptions(rawOptions: unknown) {
      return parseOptions(rawOptions === undefined ? {} : rawOptions);
    },
    parseInitialTable(rawTable: unknown, playerIds: string[] | undefined) {
      // eslint-disable-next-line no-restricted-syntax -- The ingress schema checks table syntax here; initialization applies this Contract's manifest defaults and table schema before trusted use.
      const table = safeParseOrThrow(
        currentRuntimeTableSchema,
        rawTable,
        "table",
      ) as unknown as TableOfManifest<ManifestOf<Contract>>;
      return {
        table,
        playerIds: safeParseOrThrow(
          z.array(playerIdSchema),
          playerIds && playerIds.length > 0 ? playerIds : table.playerOrder,
          "table.playerOrder",
        ),
      };
    },
    parseState(rawState: unknown) {
      const envelope = safeParseOrThrow(
        ContractZod.ReducerSessionStateSchema,
        rawState,
        "state",
      );
      const rawTable = safeParseOrThrow(
        currentRuntimeTableSchema,
        envelope.domain.table,
        "domain.table",
      );
      assertZoneConsistency(rawTable, definition.contract.manifest);
      const table = safeParseOrThrow(tableSchema, rawTable, "domain.table");
      const playerIds = [...table.playerOrder] as PlayerId[];
      const privateState = Object.fromEntries(
        playerIds.map((playerId) => [
          playerId,
          safeParseOrThrow(
            definition.contract.state.private,
            envelope.domain.privateState[playerId] ?? {},
            `privateState:${playerId}`,
          ),
        ]),
      ) as State["domain"]["privateState"];
      const flow = safeParseOrThrow(
        flowSchema,
        {
          currentPhase: envelope.domain.flow.currentPhase,
          turn: envelope.domain.flow.turn,
          round: envelope.domain.flow.round,
          activePlayers: envelope.domain.flow.activePlayers,
        },
        "domain.flow",
      );
      const currentPhaseDefinition = definition.phases[flow.currentPhase];
      if (!currentPhaseDefinition) {
        throw new Error(`Unknown reducer phase '${flow.currentPhase}'.`);
      }
      const rawPhaseState = envelope.domain.phase;
      const phase = safeParseOrThrow(
        currentPhaseDefinition.state,
        rawPhaseState ?? {},
        `phase:${flow.currentPhase}`,
      ) as State["domain"]["phase"];

      const parsedState: State = {
        domain: {
          table,
          publicState: safeParseOrThrow(
            definition.contract.state.public,
            envelope.domain.publicState,
            "domain.publicState",
          ) as State["domain"]["publicState"],
          privateState,
          hiddenState: safeParseOrThrow(
            definition.contract.state.hidden,
            envelope.domain.hiddenState,
            "domain.hiddenState",
          ) as State["domain"]["hiddenState"],
          flow,
          phase,
        },
        runtime: safeParseOrThrow(
          runtimeStateSchema,
          envelope.runtime,
          "runtime",
        ),
      };
      return parsedState;
    },
    serializeState(state: State) {
      // eslint-disable-next-line no-restricted-syntax -- The serialized domain and runtime come from this codec's typed session; the wire envelope erases the authored state generics.
      return {
        domain: { ...state.domain },
        runtime: state.runtime,
      } as unknown as RawReducerSessionState;
    },
    parsePlayerId(rawPlayerId: string) {
      return safeParseOrThrow(playerIdSchema, rawPlayerId, "playerId");
    },
    parseInput(rawInput: unknown) {
      return parseRuntimeInput(rawInput);
    },
  } as unknown as ReturnType;
}
