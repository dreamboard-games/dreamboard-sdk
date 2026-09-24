import { z } from "zod";
import {
  buildTypedRecord,
  type GameTopologyManifest,
} from "@dreamboard-games/sdk-types";
import { analyzeManifest, materializeManifestTable } from "./materialize";
import { createTableSchema, type RuntimeManifestIds } from "./schema";
import { asPlayerId, perPlayer } from "../per-player";
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
  manifest: M,
): CompiledManifest<M> {
  const source = manifest as unknown as GameTopologyManifest;
  const analysis = analyzeManifest(source);
  const initial = materializeManifestTable({
    manifest: source,
    playerIds: analysis.playerIds,
    shuffleItems: (values) => [...values],
  });
  const sharedZoneIds = analysis.sharedZones.map((zone) => zone.id).sort();
  const playerZoneIds = analysis.playerZones.map((zone) => zone.id).sort();
  const literals = {
    ...Object.fromEntries(
      Object.entries(analysis)
        .filter(([key]) => key.endsWith("Ids") || key === "cardTypes")
        .map(([key, value]) => [key, value]),
    ),
    playerIds: analysis.playerIds.map(asPlayerId),
    phaseNames: [],
    boardLayouts: ["generic", "hex", "square"],
    deckIds: sharedZoneIds,
    handIds: playerZoneIds,
    sharedZoneIds,
    playerZoneIds,
    resourcePresentationById: analysis.resourcePresentationById,
    handVisibilityById: Object.fromEntries(
      playerZoneIds.map((id) => [
        id,
        analysis.zoneVisibilityById.get(id) ?? "ownerOnly",
      ]),
    ),
    zoneVisibilityById: Object.fromEntries(analysis.zoneVisibilityById),
    cardSetIdByCardId: Object.fromEntries(analysis.cardSetIdByCardId),
    cardTypeByCardId: Object.fromEntries(analysis.cardTypeByCardId),
    setupChoiceIdsByOptionId: Object.fromEntries(
      analysis.setupChoiceIdsByOptionId,
    ),
    cardSetIdsBySharedZoneId: Object.fromEntries(analysis.sharedZoneCardSetIds),
    cardSetIdsByPlayerZoneId: Object.fromEntries(analysis.playerZoneCardSetIds),
  } as unknown as ReducerManifestContract<
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
    "setupOptionId",
    "setupProfileId",
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
  const ids = {
    ...Object.fromEntries(
      families.map((family) => [
        family,
        createManifestStringLiteralSchema(
          literals[`${family}s` as keyof typeof literals] as readonly string[],
          family,
        ),
      ]),
    ),
    playerId: markManifestScopedSchema(
      z.string().min(1).transform(asPlayerId),
      "playerId",
    ),
  } as unknown as RuntimeManifestIds;
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
        perPlayer(resolvePlayers(players), () => []),
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
      perPlayer(resolvePlayers(players), () =>
        Object.fromEntries(analysis.resourceIds.map((id) => [id, 0])),
      ),
  };
  const runtimeSchema = createManifestRuntimeSchema({
    phaseNameSchema: z.string(),
    playerIdSchema: ids.playerId,
    setupProfileIdSchema: ids.setupProfileId,
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
  return {
    literals,
    ids,
    defaults,
    records: Object.fromEntries(
      [...families, "playerId"].map((family) => [
        `${family}s`,
        <V>(initial: V | ((id: string) => V)) =>
          buildTypedRecord(
            literals[
              `${family}s` as keyof typeof literals
            ] as readonly string[],
            initial,
          ),
      ]),
    ),
    tableSchema,
    runtimeSchema,
    schemas: { table: tableSchema, runtime: runtimeSchema },
    staticBoards: initial.boards,
    setupOptionsById: analysis.setupOptionsById,
    setupChoiceIdsByOptionId: literals.setupChoiceIdsByOptionId,
    setupProfilesById: analysis.setupProfilesById,
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
        setupProfileIdSchema: ids.setupProfileId,
      }),
  } as unknown as CompiledManifest<M>;
}
