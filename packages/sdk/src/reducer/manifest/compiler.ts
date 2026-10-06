import type { ReadonlyRuntimeData } from "../../shared/runtime-json.js";
import { BoardRelationSchema } from "../../shared/board-topology-schema.js";
import { BoardTopologyError } from "../../shared/board-topology.js";
import {
  PlayerIdSchema,
  PlayerRosterSchema,
} from "../../shared/domain/player-identity.js";
import {
  expandSeedIds,
  renderCardInstanceIds,
  initialCardMetadata,
  createInstanceDeclaration,
  createSpaceDeclaration,
  createBoardElementDeclaration,
} from "./identity-runtime.js";
import { parseTopologyManifestJson } from "./parse-json";
import type { TypedTopologyManifest } from "./authoring";
import { toManifestJson } from "./field-schemas";
import type { ManifestCountValidation } from "./identity-types";
import * as z from "zod";
import { buildTypedRecord } from "./generated-helpers.js";
import { type GameTopologyManifest } from "../../shared/domain/manifest.js";
import {
  analyzeManifest,
  analyzeManifestStructure,
  materializeManifestTable,
  materializeTopologyDefinitions,
  materializeEmptyZones,
} from "./materialize";
import { createTableSchema, type RuntimeManifestIds } from "./schema";
import { asPlayerId } from "../per-player";
import {
  assumeManifestSchema,
  createManifestStringLiteralSchema,
  markManifestScopedSchema,
} from "../model/manifest";
import type { ReducerManifestContract, RuntimeTableRecord } from "../model";
import type {
  AuthoredManifest,
  AuthoredOf,
  ValidatedManifest,
  CompiledManifest,
} from "./types";

type JsonManifestInput = ReadonlyRuntimeData<GameTopologyManifest>;
export type ManifestDocumentInput =
  AuthoredManifest | ValidatedManifest | JsonManifestInput;
type ManifestAdmission<M> = [M] extends [ValidatedManifest<unknown>]
  ? unknown
  : [M] extends [ManifestDocumentInput]
    ? AuthoredManifest extends M
      ? unknown
      : M extends AuthoredManifest
        ? TypedTopologyManifest<M>
        : unknown
    : ManifestDocumentInput;
export type ManifestInput<M> = M &
  ManifestCountValidation<NoInfer<M>> &
  ManifestAdmission<NoInfer<M>>;

/** Compile authored topology once, in memory, with the same validation used by initialization. */
export function compileManifest<const M>(
  manifest: ManifestInput<M>,
): CompiledManifest<AuthoredOf<M>> {
  // Runtime admission establishes the facade; this boundary preserves its authored input witness.
  // eslint-disable-next-line no-restricted-syntax -- Validated compilation correlates inferred IDs and portable fields with this exact authored source.
  return compileManifestRuntime(manifest) as unknown as CompiledManifest<
    AuthoredOf<M>
  >;
}
/** Internal erased entry for already type-checked authoring factories; admission still runs once. */
export function compileManifestRuntime(
  manifest: unknown,
): CompiledManifest<AuthoredManifest> {
  const source = parseTopologyManifestJson(toManifestJson(manifest));
  const analysis = analyzeManifest(source);
  const topologyDefinitions = materializeTopologyDefinitions(analysis);
  const literals = {
    cardSetIds: analysis.cardSetIds,
    cardTypes: analysis.cardTypes,
    cardIds: analysis.cardIds,
    zoneIds: analysis.zoneIds,
    resourceIds: analysis.resourceIds,
    pieceTypeIds: analysis.pieceTypeIds,
    pieceIds: analysis.pieceIds,
    dieTypeIds: analysis.dieTypeIds,
    dieIds: analysis.dieIds,
    tileTypeIds: analysis.tileTypeIds,
    tileIds: analysis.tileIds,
    boardTypeIds: analysis.boardTypeIds,
    boardBaseIds: analysis.boardBaseIds,
    boardIds: analysis.boardIds,
    relationTypeIds: analysis.relationTypeIds,
    edgeIds: analysis.edgeIds,
    edgeTypeIds: analysis.edgeTypeIds,
    vertexIds: analysis.vertexIds,
    vertexTypeIds: analysis.vertexTypeIds,
    spaceIds: analysis.spaceIds,
    spaceTypeIds: analysis.spaceTypeIds,
    playerIds: analysis.playerIds.map(asPlayerId),
    phaseNames: [],
    boardLayouts: ["generic", "hex", "square"],
    resourcePresentationById: analysis.resourcePresentationById,
    ownerResourceIds: (source.resources ?? [])
      .filter((resource) => resource.visibility === "owner")
      .map((resource) => resource.id)
      .sort(),
    cardSetIdByCardId: Object.fromEntries(analysis.cardSetIdByCardId),
    cardTypeByCardId: Object.fromEntries(analysis.cardTypeByCardId),
  } satisfies ReducerManifestContract<
    RuntimeTableRecord,
    string,
    string,
    string,
    string
  >["literals"];
  const families = [
    "phaseName",
    "boardLayout",
    "cardSetId",
    "cardType",
    "cardId",
    "zoneId",
    "resourceId",
    "pieceTypeId",
    "pieceId",
    "dieTypeId",
    "dieId",
    "tileTypeId",
    "tileId",
    "boardTypeId",
    "boardBaseId",
    "boardId",
    "relationTypeId",
    "edgeId",
    "edgeTypeId",
    "vertexId",
    "vertexTypeId",
    "spaceId",
    "spaceTypeId",
  ] as const;
  // eslint-disable-next-line no-restricted-syntax -- The complete families list constructs each ID schema from its matching literals; playerId is added explicitly; relation tags use their open schema.
  const ids = {
    ...Object.fromEntries(
      families.map((family) => {
        const values = literals[`${family}s`];
        return [
          family,
          family === "relationTypeId"
            ? BoardRelationSchema.shape.typeId
            : family === "phaseName"
              ? markManifestScopedSchema(z.string(), family)
              : values.length
                ? createManifestStringLiteralSchema(values, family)
                : markManifestScopedSchema(z.never(), family),
        ];
      }),
    ),
    playerId: markManifestScopedSchema(
      PlayerIdSchema.transform(asPlayerId),
      "playerId",
    ),
  } as unknown as RuntimeManifestIds;
  ids.edgeId = markManifestScopedSchema(
    createBoardElementDeclaration(source, "edge").schema,
    "edgeId",
  );
  ids.vertexId = markManifestScopedSchema(
    createBoardElementDeclaration(source, "vertex").schema,
    "vertexId",
  );
  ids.spaceId = markManifestScopedSchema(
    createSpaceDeclaration(source).schema,
    "spaceId",
  );
  ids.boardId = markManifestScopedSchema(
    createInstanceDeclaration(
      "board",
      (source.boards ?? []).map((board) => ({
        baseIds: [board.id],
        scope: board.scope,
      })),
    ).schema,
    "boardId",
  );
  ids.cardId = markManifestScopedSchema(
    createInstanceDeclaration(
      "card",
      source.cardSets.flatMap((set) =>
        set.cards.map((card) => ({
          baseIds: renderCardInstanceIds(card),
          scope: card.scope,
        })),
      ),
    ).schema,
    "cardId",
  );
  ids.pieceId = markManifestScopedSchema(
    createInstanceDeclaration(
      "piece",
      (source.pieceSeeds ?? []).map((seed) => ({
        baseIds: expandSeedIds([seed]),
        scope: seed.scope,
      })),
    ).schema,
    "pieceId",
  );
  ids.dieId = markManifestScopedSchema(
    createInstanceDeclaration(
      "die",
      (source.dieSeeds ?? []).map((seed) => ({
        baseIds: expandSeedIds([seed]),
        scope: seed.scope,
      })),
    ).schema,
    "dieId",
  );
  ids.tileId = markManifestScopedSchema(
    createInstanceDeclaration(
      "tile",
      (source.tileSeeds ?? []).map((seed) => ({
        baseIds: expandSeedIds([seed]),
        scope: seed.scope,
      })),
    ).schema,
    "tileId",
  );
  const zoneDefinitions = Object.freeze(
    Object.fromEntries(
      (source.zones ?? []).map((zone) => [
        zone.id,
        Object.freeze({
          ...("scope" in zone
            ? { scope: zone.scope }
            : { attachedTo: zone.attachedTo }),
          visibility: zone.visibility ?? "public",
          allowedCardSetIds: Object.freeze([
            ...(analysis.zoneCardSetIdsById.get(zone.id) ?? []),
          ]),
        }),
      ]),
    ),
  );
  let rosterKey = "";
  let rosterSchema: z.ZodType | undefined;
  const tableSchema = assumeManifestSchema<RuntimeTableRecord>(
    z.unknown().transform((table, context) => {
      const header = z
        .object({
          playerOrder: PlayerRosterSchema,
        })
        .safeParse(table);
      if (!header.success) {
        for (const issue of header.error.issues)
          context.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
        return z.NEVER;
      }
      const key = JSON.stringify(header.data.playerOrder);
      if (!rosterSchema || key !== rosterKey) {
        // Source was admitted once; runtime roster analysis is structural only.
        try {
          const nextSchema = createTableSchema(
            analyzeManifestStructure(source, header.data.playerOrder),
            ids,
            { zoneDefinitions, ...topologyDefinitions },
          );
          rosterSchema = nextSchema;
          rosterKey = key;
        } catch (error) {
          if (!(error instanceof BoardTopologyError)) throw error;
          context.addIssue({
            code: "custom",
            path: ["boards"],
            message: error.message,
          });
          return z.NEVER;
        }
      }
      const parsed = rosterSchema.safeParse(table);
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          context.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
        return z.NEVER;
      }
      return parsed.data;
    }),
  );
  const resolvePlayers = (players: readonly string[] = analysis.playerIds) =>
    PlayerRosterSchema.parse(players).map(asPlayerId);
  const defaults = {
    zones: (players?: readonly string[]) =>
      materializeEmptyZones(
        analyzeManifestStructure(
          source,
          PlayerRosterSchema.parse(players ?? []),
        ),
      ),
    ownerOfCard: (players?: readonly string[]) =>
      initialCardMetadata(
        source.cardSets,
        PlayerRosterSchema.parse(players ?? []),
      ).ownerOfCard,
    visibility: (players?: readonly string[]) =>
      initialCardMetadata(
        source.cardSets,
        PlayerRosterSchema.parse(players ?? []),
      ).visibility,
    resources: (players?: readonly string[]) =>
      Object.fromEntries(
        resolvePlayers(players).map((id) => [
          id,
          Object.fromEntries(analysis.resourceIds.map((id) => [id, 0])),
        ]),
      ),
  };
  const createInitialTable = (options: {
    playerIds: readonly string[];
    shuffleItems?: <V>(values: readonly V[]) => V[];
  }) => {
    const playerIds = PlayerRosterSchema.parse(options.playerIds);
    return tableSchema.parse(
      materializeManifestTable({
        manifest: source,
        playerIds,
        shuffleItems: options.shuffleItems ?? ((values) => [...values]),
      }),
    );
  };
  // eslint-disable-next-line no-restricted-syntax -- Runtime admission supplies every literal, schema, record, and setup factory; this internal boundary binds those results to the erased compiled facade.
  return {
    zoneDefinitions,
    literals,
    ids,
    defaults,
    records: Object.fromEntries(
      families.map((family) => [
        `${family}s`,
        <V>(
          initial: V | ((id: string) => V),
          options?: { playerIds: readonly string[] },
        ) => {
          const dynamic =
            family === "cardId" ||
            family === "pieceId" ||
            family === "dieId" ||
            family === "tileId" ||
            family === "boardId";
          if (dynamic && !options)
            throw new Error(
              "Instance record factories require explicit playerIds.",
            );
          const keys =
            dynamic && options
              ? analyzeManifestStructure(
                  source,
                  PlayerRosterSchema.parse(options.playerIds),
                )[`${family}s`]
              : literals[`${family}s`];
          return buildTypedRecord(keys, initial);
        },
      ]),
    ),
    tableSchema,
    ...topologyDefinitions,
    createInitialTable,
    normalSetup: {
      minPlayers: source.players.minPlayers,
      maxPlayers: source.players.maxPlayers,
      createInitialTable,
    },
  } as unknown as CompiledManifest<AuthoredManifest>;
}
