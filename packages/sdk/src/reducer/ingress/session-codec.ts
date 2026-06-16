import { z } from "zod";
import { Zod as ContractZod } from "@dreamboard-games/reducer-contract";
import { safeParseOrThrow } from "../parse-utils";
import { runtimePayloadSchema } from "./runtime-payload";
import type {
  BaseGameSessionOfContract,
  GameStateOf,
  HiddenSchemaOfContract,
  ManifestContractOf,
  ManifestOf,
  PhaseMapOf,
  PhaseNameOfContract,
  PlayerIdOfState,
  PrivateSchemaOfContract,
  PublicSchemaOfContract,
  ReducerGameContractLike,
  ReducerGameDefinition,
  RuntimeSetupSelection,
  TableOfManifest,
  ViewMapOf,
} from "../model";
import { contractFingerprint } from "../contract-fingerprint";
import { StaleContractArtifactError } from "../stale-contract-artifact-error";
import type { IngressRuntimeCodec, RawReducerSessionState } from "./raw-types";
import { createRuntimeInputParser } from "./input-codec";
import { collectIngressPhaseSchemas } from "./phase-schemas";

const runtimeRecordSchema = z.record(z.string(), runtimePayloadSchema);
const perPlayerSchema = <Value extends z.ZodTypeAny>(valueSchema: Value) =>
  z
    .object({
      __perPlayer: z.literal(true),
      entries: z.array(z.tuple([z.string(), valueSchema])),
    })
    .strict();
const runtimeComponentLocationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Detached") }).strict(),
  z
    .object({
      type: z.literal("InDeck"),
      deckId: z.string(),
      playedBy: z.string().nullable(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("InHand"),
      handId: z.string(),
      playerId: z.string(),
      position: z.number().int().nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("InZone"),
      zoneId: z.string(),
      playedBy: z.string().nullable().optional(),
      position: z.number().int().nullable().optional(),
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
    zones: z
      .object({
        shared: z.record(z.string(), z.array(z.string())),
        perPlayer: z.record(z.string(), perPlayerSchema(z.array(z.string()))),
        visibility: z.record(
          z.string(),
          z.enum(["all", "ownerOnly", "public", "hidden"]),
        ),
        cardSetIdsByZoneId: z
          .record(z.string(), z.array(z.string()))
          .optional(),
      })
      .strict(),
    decks: z.record(z.string(), z.array(z.string())),
    hands: z.record(z.string(), perPlayerSchema(z.array(z.string()))),
    handVisibility: z.record(
      z.string(),
      z.enum(["all", "ownerOnly", "public", "hidden"]),
    ),
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
    resources: perPlayerSchema(runtimeRecordSchema),
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
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): IngressRuntimeCodec<
  TableOfManifest<ManifestOf<Contract>>,
  ManifestContractOf<Contract>,
  PublicSchemaOfContract<Contract>,
  PrivateSchemaOfContract<Contract>,
  HiddenSchemaOfContract<Contract>,
  PhaseNameOfContract<Contract>
> {
  type Definition = ReducerGameDefinition<Contract, Definitions, Views>;
  type DomainState = GameStateOf<Definition>;
  type State = BaseGameSessionOfContract<Contract>;
  type Manifest = ManifestContractOf<Contract>;
  type PhaseName = PhaseNameOfContract<Contract>;
  type ReturnType = IngressRuntimeCodec<
    TableOfManifest<ManifestOf<Contract>>,
    Manifest,
    PublicSchemaOfContract<Contract>,
    PrivateSchemaOfContract<Contract>,
    HiddenSchemaOfContract<Contract>,
    PhaseName
  >;
  type PlayerId = PlayerIdOfState<DomainState>;

  const { phaseNameSchema } = collectIngressPhaseSchemas(definition);
  const playerIdSchema = definition.contract.manifest.ids
    .playerId as z.ZodType<PlayerId>;
  const liveContractFingerprint = contractFingerprint(definition).value;

  const flowSchema = z.object({
    currentPhase: phaseNameSchema,
    turn: z.number().int(),
    round: z.number().int(),
    activePlayers: z.array(playerIdSchema),
  });
  const runtimeStateSchema = z.object({
    rng: z.object({
      seed: z.number().int().nullable(),
      cursor: z.number().int(),
      trace: z.array(z.string()),
    }),
    setup: z
      .object({
        profileId: z.string(),
        optionValues: z.record(z.string(), z.string().nullable()),
      })
      .nullable(),
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
  return {
    defaultRuntimeState(
      seed: number | null = null,
      setup: RuntimeSetupSelection<Manifest> | null = null,
    ) {
      const runtimeState: State["runtime"] = {
        rng: {
          seed,
          cursor: 0,
          trace: [],
        },
        setup,
        simultaneous: { current: null },
        lastTransition: null,
      };
      return runtimeState;
    },
    parseInitialTable(rawTable: unknown, playerIds: string[] | undefined) {
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
    parseState(rawState: RawReducerSessionState) {
      const envelope = safeParseOrThrow(
        ContractZod.ReducerSessionStateSchema,
        rawState,
        "state",
      );
      const encodedContractFingerprint = (
        envelope as { meta?: { contractFingerprint?: string } }
      ).meta?.contractFingerprint;
      if (
        encodedContractFingerprint &&
        encodedContractFingerprint !== liveContractFingerprint
      ) {
        throw new StaleContractArtifactError({
          artifact: "session-state",
          expected: liveContractFingerprint,
          found: encodedContractFingerprint,
        });
      }
      const table = safeParseOrThrow(
        definition.contract.manifest.tableSchema,
        envelope.domain.table,
        "domain.table",
      );
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
        ) as unknown as State["runtime"],
      };
      return parsedState;
    },
    serializeState(state: State) {
      return {
        meta: { contractFingerprint: liveContractFingerprint },
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
