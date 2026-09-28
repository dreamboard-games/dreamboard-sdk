import type { ManifestCountValidation } from "./identity-types";
import { z } from "zod";
import { buildTypedRecord } from "./generated-helpers.js";
import { type GameTopologyManifest } from "../../shared/domain/manifest.js";
import { analyzeManifest, materializeManifestTable } from "./materialize";
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
import type { AuthoredManifest, CompiledManifest } from "./types";

/** Compile authored topology once, in memory, with the same validation used by initialization. */
export function compileManifest<const M extends AuthoredManifest>(
  manifest: M & ManifestCountValidation<NoInfer<M>>,
): CompiledManifest<M> {
  // eslint-disable-next-line no-restricted-syntax -- AuthoredManifest is the readonly topology shape; structuredClone produces the owned mutable copy consumed by analysis.
  const source = structuredClone(manifest) as unknown as GameTopologyManifest;
  const analysis = analyzeManifest(source);
  const initial = materializeManifestTable({
    manifest: source,
    playerIds: analysis.playerIds,
    shuffleItems: (values) => [...values],
  });
  const sharedZoneIds = analysis.sharedZones.map((zone) => zone.id).sort();
  const playerZoneIds = analysis.playerZones.map((zone) => zone.id).sort();
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
    deckIds: sharedZoneIds,
    handIds: playerZoneIds,
    sharedZoneIds,
    playerZoneIds,
    resourcePresentationById: analysis.resourcePresentationById,
    ownerResourceIds: (source.resources ?? [])
      .filter((resource) => resource.visibility === "owner")
      .map((resource) => resource.id)
      .sort(),
    handVisibilityById: Object.fromEntries(
      playerZoneIds.map((id) => [
        id,
        analysis.zoneVisibilityById.get(id) ?? "ownerOnly",
      ]),
    ),
    zoneVisibilityById: Object.fromEntries(analysis.zoneVisibilityById),
    cardSetIdByCardId: Object.fromEntries(analysis.cardSetIdByCardId),
    cardTypeByCardId: Object.fromEntries(analysis.cardTypeByCardId),
    cardSetIdsBySharedZoneId: Object.fromEntries(analysis.sharedZoneCardSetIds),
    cardSetIdsByPlayerZoneId: Object.fromEntries(analysis.playerZoneCardSetIds),
  } satisfies ReducerManifestContract<
    RuntimeTableRecord,
    string,
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
    "deckId",
    "handId",
    "sharedZoneId",
    "playerZoneId",
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
      z.string().min(1).transform(asPlayerId),
      "playerId",
    ),
  } as unknown as RuntimeManifestIds;
  const boardIdSchemas = analysis.analyzedBoards.map((board) =>
    board.board.scope === "perPlayer"
      ? z.templateLiteral([board.board.id, ":", z.string().min(1)])
      : z.literal(board.board.id),
  );
  ids.boardId = markManifestScopedSchema(
    boardIdSchemas.length ? z.union(boardIdSchemas) : z.never(),
    "boardId",
  );
  const tableSchema = assumeManifestSchema<RuntimeTableRecord>(
    createTableSchema(analysis, ids),
  );
  const resolvePlayers = (players: readonly string[] = analysis.playerIds) =>
    players.map(asPlayerId);
  const emptyDecks = () =>
    Object.fromEntries(sharedZoneIds.map((id) => [id, []]));
  const hands = (players?: readonly string[]) =>
    Object.fromEntries(
      playerZoneIds.map((id) => [
        id,
        Object.fromEntries(resolvePlayers(players).map((id) => [id, []])),
      ]),
    );
  const defaults = {
    zones: (players?: readonly string[]) => ({
      shared: emptyDecks(),
      perPlayer: hands(players),
      visibility: structuredClone(literals.zoneVisibilityById),
      cardSetIdsByZoneId: Object.fromEntries(analysis.zoneCardSetIdsById),
    }),
    decks: emptyDecks,
    hands,
    handVisibility: () => structuredClone(literals.handVisibilityById),
    ownerOfCard: () =>
      Object.fromEntries(analysis.cardIds.map((id) => [id, null])),
    visibility: () =>
      Object.fromEntries(analysis.cardIds.map((id) => [id, { faceUp: true }])),
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
  const createInitialTable = (
    options: {
      playerIds?: readonly string[];
      shuffleItems?: <V>(values: readonly V[]) => V[];
    } = {},
  ) =>
    tableSchema.parse(
      materializeManifestTable({
        manifest: source,
        playerIds: options.playerIds ?? analysis.playerIds,
        shuffleItems: options.shuffleItems ?? ((values) => [...values]),
      }),
    );
  // eslint-disable-next-line no-restricted-syntax -- Analysis of M supplies every literal, schema, record, and setup factory; this compiler binds those runtime results to the M-derived facade.
  return {
    literals,
    ids,
    defaults,
    records: Object.fromEntries(
      families.map((family) => [
        `${family}s`,
        <V>(initial: V | ((id: string) => V)) =>
          buildTypedRecord(literals[`${family}s`], initial),
      ]),
    ),
    tableSchema,
    runtimeSchema,
    schemas: { table: tableSchema, runtime: runtimeSchema },
    staticBoards: initial.boards,
    createInitialTable,
    normalSetup: {
      minPlayers: source.players.minPlayers,
      maxPlayers: source.players.maxPlayers,
      createInitialTable,
    },
    createGameStateSchema: (
      config: Parameters<CompiledManifest<M>["createGameStateSchema"]>[0],
    ) =>
      createManifestGameStateSchema({
        ...config,
        tableSchema,
        playerIdSchema: ids.playerId,
      }),
  } as unknown as CompiledManifest<M>;
}
