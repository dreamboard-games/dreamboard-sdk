import {
  PlayerIdSchema,
  PlayerRosterSchema,
} from "../../shared/domain/player-identity.js";
import {
  expandSeedIds,
  renderCardInstanceIds,
  initialCardMetadata,
  createInstanceDeclaration,
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
  materializeManifestStaticBoards,
} from "./materialize";
import { createTableSchema, type RuntimeManifestIds } from "./schema";
import { asPlayerId } from "../per-player";
import {
  assumeManifestSchema,
  createManifestStringLiteralSchema,
  markManifestScopedSchema,
  createManifestRuntimeSchema,
  createManifestGameStateSchema,
} from "../model/manifest";
import type { ReducerManifestContract, RuntimeTableRecord } from "../model";
import type {
  AuthoredManifest,
  AuthoredOf,
  ValidatedManifest,
  CompiledManifest,
} from "./types";

export type ManifestInput<M> = M &
  ManifestCountValidation<NoInfer<M>> &
  (M extends AuthoredManifest
    ? AuthoredManifest extends M
      ? unknown
      : TypedTopologyManifest<NoInfer<M>>
    : unknown);

/** Compile authored topology once, in memory, with the same validation used by initialization. */
export function compileManifest<
  const M extends AuthoredManifest | ValidatedManifest | GameTopologyManifest,
>(manifest: ManifestInput<M>): CompiledManifest<AuthoredOf<M>> {
  const source = parseTopologyManifestJson(toManifestJson(manifest));
  const analysis = analyzeManifest(source);
  const staticBoards = materializeManifestStaticBoards(source);
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
    boardTypeIds: analysis.boardTypeIds,
    boardBaseIds: analysis.boardBaseIds,
    boardIds: analysis.boardIds,
    boardContainerIds: analysis.boardContainerIds,
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
    "boardTypeId",
    "boardBaseId",
    "boardId",
    "boardContainerId",
    "relationTypeId",
    "edgeId",
    "edgeTypeId",
    "vertexId",
    "vertexTypeId",
    "spaceId",
    "spaceTypeId",
  ] as const;
  // eslint-disable-next-line no-restricted-syntax -- The complete families list constructs each ID schema from its matching literals; playerId is added explicitly.
  const ids = {
    ...Object.fromEntries(
      families.map((family) => {
        const values = literals[`${family}s`];
        return [
          family,
          family === "phaseName"
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
  const zoneDefinitions = Object.freeze(
    Object.fromEntries(
      (source.zones ?? []).map((zone) => [
        zone.id,
        Object.freeze({
          scope: zone.scope,
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
        const nextSchema = createTableSchema(
          analyzeManifestStructure(source, header.data.playerOrder),
          ids,
          { zoneDefinitions },
        );
        rosterSchema = nextSchema;
        rosterKey = key;
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
      Object.fromEntries(
        Object.entries(zoneDefinitions).map(([zoneId, definition]) => [
          zoneId,
          Object.fromEntries(
            (definition.scope === "shared"
              ? ["table"]
              : resolvePlayers(players)
            ).map((hostId) => [hostId, []]),
          ),
        ]),
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
  const runtimeSchema = createManifestRuntimeSchema({
    phaseNameSchema: z.string(),
    playerIdSchema: ids.playerId,
  });
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
  // eslint-disable-next-line no-restricted-syntax -- Analysis of M supplies every literal, schema, record, and setup factory; this compiler binds those runtime results to the M-derived facade.
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
    runtimeSchema,
    schemas: { table: tableSchema, runtime: runtimeSchema },
    staticBoards,
    createInitialTable,
    normalSetup: {
      minPlayers: source.players.minPlayers,
      maxPlayers: source.players.maxPlayers,
      createInitialTable,
    },
    createGameStateSchema: (
      config: Parameters<
        CompiledManifest<AuthoredOf<M>>["createGameStateSchema"]
      >[0],
    ) =>
      createManifestGameStateSchema({
        ...config,
        tableSchema,
        playerIdSchema: ids.playerId,
      }),
  } as unknown as CompiledManifest<AuthoredOf<M>>;
}
