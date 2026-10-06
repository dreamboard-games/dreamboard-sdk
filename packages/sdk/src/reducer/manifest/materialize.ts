import { tileSpaceId } from "../../shared/domain/tile-space.js";
import {
  deriveBoardTopology,
  type BoardEdge,
  type BoardVertex,
  type BoardTopology,
  type TilePlacement,
} from "../../shared/board-topology.js";
import type {
  TopologyDefinitions,
  BoardDefinition,
  TileDefinition,
} from "../../shared/domain/topology-definitions.js";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { boardSpaceHostId } from "../../shared/domain/board-space-host.js";
import {
  enumerateZoneHosts,
  assertContainmentAcyclic,
  assertZoneConsistency,
  type ZoneTable,
} from "../table/zones.js";
import type {
  RuntimeComponentLocation,
  RuntimeBoardInstance,
  ZoneDefinition,
} from "../model";
import {
  PlayerRosterSchema,
  isPlayerIdValue,
} from "../../shared/domain/player-identity.js";
import {
  renderCardInstanceIds,
  expandSeedIds,
  scopedInstances,
  initialCardMetadata,
  createInstanceDeclaration,
  createSpaceDeclaration,
  createBoardElementDeclaration,
} from "./identity-runtime.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import * as z from "zod";
import {
  createFieldValidatorResolver,
  schemaForCardType,
  type FieldReferenceContext,
} from "./field-schemas";
import type {
  BoardCard,
  BoardRelationSpec,
  BoardSpec,
  BoardSpaceSpec,
  CardSetDefinition,
  FieldSchemaJson,
  PieceSeedSpec,
  ZoneSpec,
} from "../../shared/domain/contracts.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";

import { assertValidManifest } from "./manifest-validation.js";

interface AnalyzedBoard {
  layout: "generic" | "hex" | "square";
  board: BoardSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  topologies: Map<string, BoardTopology>;
  boardFieldsSchema?: FieldSchemaJson;
  spaceFieldsSchema?: FieldSchemaJson;
  relationFieldsSchema?: FieldSchemaJson;
  spaces: BoardSpaceSpec[];
  relations: BoardRelationSpec[];
  edges: readonly BoardEdge[];
  vertices: readonly BoardVertex[];
}
interface ManifestAnalysis {
  manifest: GameTopologyManifest;
  playerIds: string[];
  sharedZones: ZoneSpec[];
  playerZones: ZoneSpec[];
  zoneIds: string[];
  cardSets: CardSetDefinition[];
  cardSetIds: string[];
  cardTypes: string[];
  cardIds: string[];
  cardSetIdByCardId: Map<string, string>;
  cardTypeByCardId: Map<string, string>;
  sharedZoneCardSetIds: Map<string, string[]>;
  sharedZoneIdsByCardSetId: Map<string, string[]>;
  homeSharedZoneIdsByCardType: Map<string, string[]>;
  homeSharedZoneIdByCardType: Map<string, string>;
  playerZoneCardSetIds: Map<string, string[]>;
  zoneCardSetIdsById: Map<string, string[]>;
  zoneVisibilityById: Map<string, NonNullable<ZoneSpec["visibility"]>>;
  resourceIds: string[];
  resourcePresentationById: Record<
    string,
    { label: string; icon?: string | null }
  >;
  pieceTypeIds: string[];
  pieceIds: string[];
  pieceTypeIdByPieceId: Map<string, string>;
  dieTypeIds: string[];
  dieIds: string[];
  tileTypeIds: string[];
  tileIds: string[];
  tileTypeIdByTileId: Map<string, string>;
  tilePropertiesSchemasById: Map<string, FieldSchemaJson | undefined>;
  dieTypeIdByDieId: Map<string, string>;
  boardBaseIds: string[];
  boardIds: string[];
  boardTypeIds: string[];
  boardLayoutById: Map<string, string>;
  boardIdsByLayout: Map<string, string[]>;
  boardBaseIdsByLayout: Map<string, string[]>;
  boardIdsByBaseId: Map<string, string[]>;
  boardIdsByTypeId: Map<string, string[]>;
  spaceIdsByBoardId: Map<string, string[]>;
  spaceTypeIdByBoardId: Map<string, Record<string, string | null>>;
  spaceIdsByTypeId: Map<string, string[]>;
  relationTypeIds: string[];
  relationTypeIdsByBoardId: Map<string, string[]>;
  edgeIds: string[];
  edgeTypeIds: string[];
  edgeIdsByTypeId: Map<string, string[]>;
  edgeIdsByBoardIdAndTypeId: Map<string, Record<string, string[]>>;
  vertexIds: string[];
  vertexTypeIds: string[];
  vertexIdsByTypeId: Map<string, string[]>;
  vertexIdsByBoardIdAndTypeId: Map<string, Record<string, string[]>>;
  spaceIds: string[];
  spaceTypeIds: string[];
  analyzedBoards: AnalyzedBoard[];
  pieceTypeSchemasById: Map<string, FieldSchemaJson | null | undefined>;
  dieTypeSchemasById: Map<string, FieldSchemaJson | null | undefined>;
}

function dedupeSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function sortedObject<Value>(
  entries: Iterable<readonly [string, Value]>,
): Record<string, Value> {
  return Object.fromEntries(
    Array.from(entries).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function createRecord<Value>(): Record<string, Value> {
  return Object.create(null) as Record<string, Value>;
}

function seededTopologyInventory(
  manifest: GameTopologyManifest,
  playerIds: readonly string[],
) {
  const boards: Record<string, RuntimeBoardInstance> = {};
  for (const board of manifest.boards ?? [])
    for (const { id } of scopedInstances(
      "board",
      [board.id],
      board.scope,
      playerIds,
    ))
      boards[id] = { baseId: board.id, relations: [] };
  const tiles: Record<
    string,
    { id: string; tileTypeId: string; ownerId: string | null }
  > = {};
  const componentLocations: Record<
    string,
    TilePlacement | { type: "Detached" }
  > = {};
  for (const seed of manifest.tileSeeds ?? [])
    for (const { id, playerId: origin } of scopedInstances(
      "tile",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      tiles[id] = { id, tileTypeId: seed.typeId, ownerId: origin };
      const home = seed.home;
      if (home?.type === "board") {
        const board = manifest.boards?.find(
          (board) => board.id === home.boardId,
        );
        if (!board)
          throw new Error(`Tile home names unknown board '${home.boardId}'.`);
        const boardId =
          board.scope === "perPlayer" && origin !== null
            ? perPlayerInstanceId("board", board.id, origin)
            : board.id;
        componentLocations[id] = { ...home, type: "OnBoard", boardId };
      } else componentLocations[id] = { type: "Detached" };
    }
  return { boards, tiles, componentLocations };
}
function analyzeBoards(manifest: GameTopologyManifest, playerIds: string[]) {
  const inventory = seededTopologyInventory(manifest, playerIds);
  const declarations = buildTopologyDefinitions(manifest, (_schema, values) =>
    z.record(z.string(), RuntimeJsonSchema).parse(values ?? {}),
  );
  return (manifest.boards ?? []).map((board): AnalyzedBoard => {
    const runtimeBoardIds = Object.entries(inventory.boards)
      .filter(([, instance]) => instance.baseId === board.id)
      .map(([id]) => id);
    const topologies = new Map(
      runtimeBoardIds.map((id) => [
        id,
        deriveBoardTopology(inventory, declarations, id),
      ]),
    );
    const values = [...topologies.values()];
    return {
      layout: board.layout,
      board,
      boardTypeId: board.typeId,
      runtimeBoardIds,
      topologies,
      boardFieldsSchema: board.boardFieldsSchema,
      spaceFieldsSchema:
        board.layout === "generic" ? board.spaceFieldsSchema : undefined,
      relationFieldsSchema: board.relationFieldsSchema,
      spaces: values.length
        ? values.flatMap((topology) =>
            Object.values(topology.spaces).map((space) => ({
              id: space.id,
              ...(space.typeId == null ? {} : { typeId: space.typeId }),
            })),
          )
        : board.layout === "generic"
          ? [...(board.spaces ?? [])]
          : [],
      relations: [...(board.relations ?? [])],
      edges: values.flatMap((topology) =>
        topology.layout === "generic" ? [] : topology.edges,
      ),
      vertices: values.flatMap((topology) =>
        topology.layout === "generic" ? [] : topology.vertices,
      ),
    };
  });
}

export function analyzeManifest(
  manifest: GameTopologyManifest,
  runtimePlayerIds?: readonly string[],
): ManifestAnalysis {
  assertValidManifest(manifest);
  return analyzeManifestStructure(manifest, runtimePlayerIds);
}

/** Structural analysis shared by semantic reference validation and runtime initialization. */
export function analyzeManifestStructure(
  manifest: GameTopologyManifest,
  runtimePlayerIds?: readonly string[],
): ManifestAnalysis {
  const playerIds = [...(runtimePlayerIds ?? [])];
  const sharedZones = (manifest.zones ?? []).filter(
    (zone) => "scope" in zone && zone.scope === "shared",
  );
  const playerZones = (manifest.zones ?? []).filter(
    (zone) => "scope" in zone && zone.scope === "perPlayer",
  );
  const zoneIds = dedupeSorted((manifest.zones ?? []).map((zone) => zone.id));
  const cardSets = manifest.cardSets;
  const cardSetIds = dedupeSorted(cardSets.map((cardSet) => cardSet.id));
  const cardTypes = dedupeSorted(
    cardSets.flatMap((cardSet) => cardSet.cards.map((card) => card.cardType)),
  );
  const cardIds = dedupeSorted(
    cardSets.flatMap((cardSet) =>
      cardSet.cards.flatMap((card) =>
        scopedInstances(
          "card",
          renderCardInstanceIds(card),
          card.scope,
          playerIds,
        ).map((instance) => instance.id),
      ),
    ),
  );
  const cardSetIdByCardId = new Map<string, string>();
  const cardTypeByCardId = new Map<string, string>();
  for (const cardSet of cardSets) {
    for (const card of cardSet.cards) {
      for (const { id: cardId } of scopedInstances(
        "card",
        renderCardInstanceIds(card),
        card.scope,
        playerIds,
      )) {
        cardSetIdByCardId.set(cardId, cardSet.id);
        cardTypeByCardId.set(cardId, card.cardType);
      }
    }
  }

  const sharedZoneCardSetIds = new Map<string, string[]>();
  for (const zone of sharedZones) {
    sharedZoneCardSetIds.set(
      zone.id,
      dedupeSorted(zone.allowedCardSetIds ?? []),
    );
  }
  const playerZoneCardSetIds = new Map<string, string[]>();
  for (const zone of playerZones) {
    playerZoneCardSetIds.set(
      zone.id,
      dedupeSorted(zone.allowedCardSetIds ?? []),
    );
  }
  const zoneCardSetIdsById = new Map(
    (manifest.zones ?? []).map((zone) => [
      zone.id,
      dedupeSorted(zone.allowedCardSetIds ?? []),
    ]),
  );

  const sharedZoneIdsByCardSetId = new Map<string, string[]>(
    cardSetIds.map((cardSetId): [string, string[]] => [cardSetId, []]),
  );
  for (const [zoneId, allowedCardSetIds] of sharedZoneCardSetIds.entries()) {
    for (const cardSetId of allowedCardSetIds) {
      const zoneIds = sharedZoneIdsByCardSetId.get(cardSetId) ?? [];
      zoneIds.push(zoneId);
      sharedZoneIdsByCardSetId.set(cardSetId, zoneIds);
    }
  }
  for (const [cardSetId, zoneIds] of sharedZoneIdsByCardSetId.entries()) {
    sharedZoneIdsByCardSetId.set(cardSetId, dedupeSorted(zoneIds));
  }

  const sharedZoneIdSet = new Set(sharedZones.map((zone) => zone.id));
  const homeSharedZoneIdsByCardType = new Map<string, string[]>(
    cardTypes.map((cardType): [string, string[]] => [cardType, []]),
  );
  for (const cardSet of cardSets) {
    for (const card of cardSet.cards) {
      if (
        card.home?.type !== "zone" ||
        !sharedZoneIdSet.has(card.home.zoneId)
      ) {
        continue;
      }
      const cardType = card.cardType;
      const zoneIds = homeSharedZoneIdsByCardType.get(cardType) ?? [];
      zoneIds.push(card.home.zoneId);
      homeSharedZoneIdsByCardType.set(cardType, zoneIds);
    }
  }
  const homeSharedZoneIdByCardType = new Map<string, string>();
  for (const [cardType, zoneIds] of homeSharedZoneIdsByCardType.entries()) {
    const uniqueZoneIds = dedupeSorted(zoneIds);
    homeSharedZoneIdsByCardType.set(cardType, uniqueZoneIds);
    const [homeZoneId] = uniqueZoneIds;
    if (uniqueZoneIds.length === 1 && homeZoneId !== undefined) {
      homeSharedZoneIdByCardType.set(cardType, homeZoneId);
    }
  }

  const zoneVisibilityById = new Map<
    string,
    NonNullable<ZoneSpec["visibility"]>
  >(
    (manifest.zones ?? []).map((zone) => [
      zone.id,
      zone.visibility ?? "public",
    ]),
  );
  const resourceIds = dedupeSorted(
    (manifest.resources ?? []).map((resource) => resource.id),
  );
  const resourcePresentationById = sortedObject(
    (manifest.resources ?? []).map((resource) => [
      resource.id,
      {
        label: resource.name,
        ...(resource.icon ? { icon: resource.icon } : {}),
      },
    ]),
  );
  const pieceTypeIds = dedupeSorted(
    (manifest.pieceTypes ?? []).map((pieceType) => pieceType.id),
  );
  const pieceTypeSchemasById = new Map(
    (manifest.pieceTypes ?? []).map((pieceType) => [
      pieceType.id,
      pieceType.fieldsSchema,
    ]),
  );
  const pieceTypeIdByPieceId = new Map<string, string>();
  for (const seed of manifest.pieceSeeds ?? []) {
    for (const { id: pieceId } of scopedInstances(
      "piece",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      pieceTypeIdByPieceId.set(pieceId, seed.typeId);
    }
  }
  const pieceIds = dedupeSorted(pieceTypeIdByPieceId.keys());
  const dieTypeIds = dedupeSorted(
    (manifest.dieTypes ?? []).map((dieType) => dieType.id),
  );
  const dieTypeSchemasById = new Map(
    (manifest.dieTypes ?? []).map((dieType) => [
      dieType.id,
      dieType.fieldsSchema,
    ]),
  );
  const dieTypeIdByDieId = new Map<string, string>();
  for (const seed of manifest.dieSeeds ?? []) {
    for (const { id: dieId } of scopedInstances(
      "die",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      dieTypeIdByDieId.set(dieId, seed.typeId);
    }
  }
  const dieIds = dedupeSorted(dieTypeIdByDieId.keys());
  const tileTypeIds = dedupeSorted(
    (manifest.tileTypes ?? []).map((type) => type.id),
  );
  const tilePropertiesSchemasById = new Map(
    (manifest.tileTypes ?? []).map((type) => [type.id, type.propertiesSchema]),
  );
  const tileTypeIdByTileId = new Map<string, string>();
  for (const seed of manifest.tileSeeds ?? [])
    for (const { id } of scopedInstances(
      "tile",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    ))
      tileTypeIdByTileId.set(id, seed.typeId);
  const tileIds = dedupeSorted(tileTypeIdByTileId.keys());
  const analyzedBoards = analyzeBoards(manifest, playerIds);
  const boardBaseIds = dedupeSorted(
    analyzedBoards.map(({ board }) => board.id),
  );
  const boardIds = dedupeSorted(
    analyzedBoards.flatMap((entry) => entry.runtimeBoardIds),
  );
  const boardTypeIds = dedupeSorted(
    analyzedBoards
      .map((board) => board.boardTypeId)
      .filter((typeId): typeId is string => typeof typeId === "string"),
  );
  const boardLayoutById = new Map<string, string>();
  const boardIdsByLayout = new Map<string, string[]>();
  const boardBaseIdsByLayout = new Map<string, string[]>();
  const boardIdsByBaseId = new Map<string, string[]>();
  const boardIdsByTypeId = new Map<string, string[]>();
  const spaceIdsByBoardId = new Map<string, string[]>();
  const spaceTypeIdByBoardId = new Map<string, Record<string, string | null>>();
  const spaceIdsByTypeId = new Map<string, string[]>();
  const relationTypeIdsByBoardId = new Map<string, string[]>();
  const edgeIdsByTypeId = new Map<string, string[]>();
  const edgeIdsByBoardIdAndTypeId = new Map<string, Record<string, string[]>>();
  const vertexIdsByTypeId = new Map<string, string[]>();
  const vertexIdsByBoardIdAndTypeId = new Map<
    string,
    Record<string, string[]>
  >();
  for (const analyzedBoard of analyzedBoards) {
    boardIdsByBaseId.set(analyzedBoard.board.id, analyzedBoard.runtimeBoardIds);
    boardIdsByLayout.set(
      analyzedBoard.board.layout,
      dedupeSorted([
        ...(boardIdsByLayout.get(analyzedBoard.board.layout) ?? []),
        ...analyzedBoard.runtimeBoardIds,
      ]),
    );
    boardBaseIdsByLayout.set(
      analyzedBoard.board.layout,
      dedupeSorted([
        ...(boardBaseIdsByLayout.get(analyzedBoard.board.layout) ?? []),
        analyzedBoard.board.id,
      ]),
    );
    const runtimeRelationTypeIds = dedupeSorted(
      analyzedBoard.relations.map((relation) => relation.typeId),
    );
    for (const runtimeBoardId of analyzedBoard.runtimeBoardIds) {
      boardLayoutById.set(runtimeBoardId, analyzedBoard.board.layout);
      spaceIdsByBoardId.set(
        runtimeBoardId,
        Object.keys(analyzedBoard.topologies.get(runtimeBoardId)?.spaces ?? {}),
      );
      spaceTypeIdByBoardId.set(
        runtimeBoardId,
        Object.fromEntries(
          Object.values(
            analyzedBoard.topologies.get(runtimeBoardId)?.spaces ?? {},
          ).map((space) => [space.id, space.typeId ?? null]),
        ),
      );
      relationTypeIdsByBoardId.set(runtimeBoardId, runtimeRelationTypeIds);
    }
    if (analyzedBoard.boardTypeId) {
      boardIdsByTypeId.set(
        analyzedBoard.boardTypeId,
        dedupeSorted([
          ...(boardIdsByTypeId.get(analyzedBoard.boardTypeId) ?? []),
          ...analyzedBoard.runtimeBoardIds,
        ]),
      );
    }
    for (const space of analyzedBoard.spaces) {
      if (!space.typeId) {
        continue;
      }
      spaceIdsByTypeId.set(
        space.typeId,
        dedupeSorted([...(spaceIdsByTypeId.get(space.typeId) ?? []), space.id]),
      );
    }
    if (analyzedBoard.layout !== "generic") {
      const edgeIdsForBoardByType: Record<string, string[]> = {};
      for (const edge of analyzedBoard.edges) {
        if (!edge.typeId) {
          continue;
        }
        edgeIdsByTypeId.set(
          edge.typeId,
          dedupeSorted([...(edgeIdsByTypeId.get(edge.typeId) ?? []), edge.id]),
        );
        edgeIdsForBoardByType[edge.typeId] = dedupeSorted([
          ...(edgeIdsForBoardByType[edge.typeId] ?? []),
          edge.id,
        ]);
      }
      const vertexIdsForBoardByType: Record<string, string[]> = {};
      for (const vertex of analyzedBoard.vertices) {
        if (!vertex.typeId) {
          continue;
        }
        vertexIdsByTypeId.set(
          vertex.typeId,
          dedupeSorted([
            ...(vertexIdsByTypeId.get(vertex.typeId) ?? []),
            vertex.id,
          ]),
        );
        vertexIdsForBoardByType[vertex.typeId] = dedupeSorted([
          ...(vertexIdsForBoardByType[vertex.typeId] ?? []),
          vertex.id,
        ]);
      }
      for (const runtimeBoardId of analyzedBoard.runtimeBoardIds) {
        const topology = analyzedBoard.topologies.get(runtimeBoardId);
        const byType = (
          elements: readonly { id: string; typeId?: string | null }[],
        ) => {
          const result: Record<string, string[]> = {};
          for (const element of elements)
            if (element.typeId)
              result[element.typeId] = [
                ...(result[element.typeId] ?? []),
                element.id,
              ];
          return result;
        };
        edgeIdsByBoardIdAndTypeId.set(
          runtimeBoardId,
          byType(
            topology && topology.layout !== "generic" ? topology.edges : [],
          ),
        );
        vertexIdsByBoardIdAndTypeId.set(
          runtimeBoardId,
          byType(
            topology && topology.layout !== "generic" ? topology.vertices : [],
          ),
        );
      }
    }
  }
  const relationTypeIds = dedupeSorted(
    Array.from(relationTypeIdsByBoardId.values()).flat(),
  );
  const edgeIds = dedupeSorted(
    analyzedBoards.flatMap((board) =>
      board.layout === "generic" ? [] : board.edges.map((edge) => edge.id),
    ),
  );
  const edgeTypeIds = dedupeSorted(edgeIdsByTypeId.keys());
  const vertexIds = dedupeSorted(
    analyzedBoards.flatMap((board) =>
      board.layout === "generic"
        ? []
        : board.vertices.map((vertex) => vertex.id),
    ),
  );
  const vertexTypeIds = dedupeSorted(vertexIdsByTypeId.keys());
  const spaceIds = dedupeSorted(
    analyzedBoards.flatMap((board) => board.spaces.map((space) => space.id)),
  );
  const spaceTypeIds = dedupeSorted(
    analyzedBoards.flatMap((board) =>
      board.spaces
        .map((space) => space.typeId)
        .filter((typeId): typeId is string => typeof typeId === "string"),
    ),
  );

  return {
    manifest,
    playerIds,
    sharedZones,
    playerZones,
    zoneIds,
    cardSets,
    cardSetIds,
    cardTypes,
    cardIds,
    cardSetIdByCardId,
    cardTypeByCardId,
    sharedZoneCardSetIds,
    sharedZoneIdsByCardSetId,
    homeSharedZoneIdsByCardType,
    homeSharedZoneIdByCardType,
    playerZoneCardSetIds,
    zoneCardSetIdsById,
    zoneVisibilityById,
    resourceIds,
    resourcePresentationById,
    pieceTypeIds,
    pieceIds,
    pieceTypeIdByPieceId,
    dieTypeIds,
    dieIds,
    dieTypeIdByDieId,
    tileTypeIds,
    tileIds,
    tileTypeIdByTileId,
    tilePropertiesSchemasById,
    boardBaseIds,
    boardIds,
    boardTypeIds,
    boardLayoutById,
    boardIdsByLayout,
    boardBaseIdsByLayout,
    boardIdsByBaseId,
    boardIdsByTypeId,
    spaceIdsByBoardId,
    spaceTypeIdByBoardId,
    spaceIdsByTypeId,
    relationTypeIds,
    relationTypeIdsByBoardId,
    edgeIds,
    edgeTypeIds,
    edgeIdsByTypeId,
    edgeIdsByBoardIdAndTypeId,
    vertexIds,
    vertexTypeIds,
    vertexIdsByTypeId,
    vertexIdsByBoardIdAndTypeId,
    spaceIds,
    spaceTypeIds,
    analyzedBoards,
    pieceTypeSchemasById,
    dieTypeSchemasById,
  };
}

function cloneJson<Value>(value: Value): Value {
  return JSON.parse(JSON.stringify(value)) as Value;
}

function boardSpaceRefKey(spaceIds: readonly string[]): string {
  return [...spaceIds]
    .sort((left, right) => left.localeCompare(right))
    .join("$$");
}

export function fieldReferenceContext(
  analysis: ManifestAnalysis,
  stage: "manifest" | "session" = "session",
  boardId?: string,
): FieldReferenceContext {
  const board = boardId
    ? analysis.analyzedBoards.find(
        (item) =>
          item.board.id === boardId || item.runtimeBoardIds.includes(boardId),
      )
    : undefined;
  const runtimeTopology = boardId ? board?.topologies.get(boardId) : undefined;
  const runtimeEdges =
    runtimeTopology && runtimeTopology.layout !== "generic"
      ? runtimeTopology.edges
      : (board?.edges ?? []);
  const runtimeVertices =
    runtimeTopology && runtimeTopology.layout !== "generic"
      ? runtimeTopology.vertices
      : (board?.vertices ?? []);
  return {
    stage,
    deferred:
      stage === "manifest"
        ? [
            "playerId",
            "boardId",
            "spaceId",
            "edgeId",
            "vertexId",
            ...(analysis.cardSets.some((set) =>
              set.cards.some((card) => card.scope === "perPlayer"),
            )
              ? ["cardId" as const]
              : []),
            ...(analysis.manifest.pieceSeeds?.some(
              (seed) => seed.scope === "perPlayer",
            )
              ? ["pieceId" as const]
              : []),
            ...(analysis.manifest.tileSeeds?.some(
              (seed) => seed.scope === "perPlayer",
            )
              ? ["tileId" as const]
              : []),
            ...(analysis.manifest.dieSeeds?.some(
              (seed) => seed.scope === "perPlayer",
            )
              ? ["dieId" as const]
              : []),
          ]
        : undefined,
    accepts:
      stage === "manifest"
        ? {
            playerId: isPlayerIdValue,
            edgeId: createBoardElementDeclaration(
              analysis.manifest,
              "edge",
              board?.board.id,
            ).accepts,
            vertexId: createBoardElementDeclaration(
              analysis.manifest,
              "vertex",
              board?.board.id,
            ).accepts,
            spaceId: createSpaceDeclaration(analysis.manifest, board?.board.id)
              .accepts,
            boardId: createInstanceDeclaration(
              "board",
              (analysis.manifest.boards ?? []).map((board) => ({
                baseIds: [board.id],
                scope: board.scope,
              })),
            ).accepts,
            cardId: createInstanceDeclaration(
              "card",
              analysis.cardSets.flatMap((set) =>
                set.cards.map((card) => ({
                  baseIds: renderCardInstanceIds(card),
                  scope: card.scope,
                })),
              ),
            ).accepts,
            pieceId: createInstanceDeclaration(
              "piece",
              (analysis.manifest.pieceSeeds ?? []).map((seed) => ({
                baseIds: expandSeedIds([seed]),
                scope: seed.scope,
              })),
            ).accepts,
            tileId: createInstanceDeclaration(
              "tile",
              (analysis.manifest.tileSeeds ?? []).map((seed) => ({
                baseIds: expandSeedIds([seed]),
                scope: seed.scope,
              })),
            ).accepts,
            dieId: createInstanceDeclaration(
              "die",
              (analysis.manifest.dieSeeds ?? []).map((seed) => ({
                baseIds: expandSeedIds([seed]),
                scope: seed.scope,
              })),
            ).accepts,
          }
        : undefined,
    ids: {
      cardId: analysis.cardIds,
      zoneId: analysis.zoneIds,
      playerId: analysis.playerIds,
      boardId: analysis.boardIds,
      spaceId:
        boardId && analysis.spaceIdsByBoardId.has(boardId)
          ? (analysis.spaceIdsByBoardId.get(boardId) ?? [])
          : board
            ? board.spaces.map((space) => space.id)
            : analysis.spaceIds,
      edgeId:
        board && board.layout !== "generic"
          ? runtimeEdges.map((edge) => edge.id)
          : analysis.edgeIds,
      vertexId:
        board && board.layout !== "generic"
          ? runtimeVertices.map((vertex) => vertex.id)
          : analysis.vertexIds,
      pieceId: analysis.pieceIds,
      dieId: analysis.dieIds,
      tileId: analysis.tileIds,
      resourceId: analysis.resourceIds,
    },
  };
}

const fieldResolvers = new WeakMap<
  ManifestAnalysis,
  Map<"manifest" | "session", ReturnType<typeof createFieldValidatorResolver>>
>();
function materializeFields(
  schema: FieldSchemaJson | null | undefined,
  analysis: ManifestAnalysis,
  values: unknown,
  boardId?: string,
  stage: "manifest" | "session" = "session",
): Record<string, unknown> {
  if (!schema) return z.record(z.string(), z.unknown()).parse(values ?? {});
  let stages = fieldResolvers.get(analysis);
  if (!stages) {
    stages = new Map();
    fieldResolvers.set(analysis, stages);
  }
  let resolve = stages.get(stage);
  if (!resolve) {
    resolve = createFieldValidatorResolver((board) =>
      fieldReferenceContext(analysis, stage, board),
    );
    stages.set(stage, resolve);
  }
  return z
    .record(z.string(), z.unknown())
    .parse(resolve(schema, boardId).parse(values ?? {}));
}

type MaterializeOptions = {
  manifest: GameTopologyManifest;
  playerIds: readonly string[];
  shuffleItems: <Value>(values: readonly Value[]) => Value[];
};
/** Enumerate empty zones from the structural instance inventory, without fields or homes. */
export function materializeEmptyZones(
  analysis: ManifestAnalysis,
): Record<string, Record<string, string[]>> {
  const hosts = {
    playerOrder: analysis.playerIds,
    pieces: Object.fromEntries(
      [...analysis.pieceTypeIdByPieceId].map(([id, pieceTypeId]) => [
        id,
        { id, pieceTypeId },
      ]),
    ),
    dice: Object.fromEntries(
      [...analysis.dieTypeIdByDieId].map(([id, dieTypeId]) => [
        id,
        { id, dieTypeId },
      ]),
    ),
    ...seededTopologyInventory(analysis.manifest, analysis.playerIds),
  };
  const definitions = buildTopologyDefinitions(
    analysis.manifest,
    (_schema, values) =>
      z.record(z.string(), RuntimeJsonSchema).parse(values ?? {}),
  );
  return Object.fromEntries(
    (analysis.manifest.zones ?? []).map((zone) => [
      zone.id,
      Object.fromEntries(
        enumerateZoneHosts(hosts, definitions, {
          ...("scope" in zone
            ? { scope: zone.scope }
            : { attachedTo: zone.attachedTo }),
          visibility: zone.visibility ?? "public",
          allowedCardSetIds: zone.allowedCardSetIds ?? [],
        }).map((hostId) => [hostId, []]),
      ),
    ]),
  );
}

/** Construct actual session inventory; references use the supplied live roster. */
export function materializeManifestTable(
  options: MaterializeOptions,
): Record<string, unknown> {
  return materializeManifest(
    { ...options, playerIds: PlayerRosterSchema.parse(options.playerIds) },
    "session",
  );
}
function freezeDefinition<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeDefinition(child);
    Object.freeze(value);
  }
  return value;
}
/** Normalize immutable rules without manufacturing session instances. */
export function materializeTopologyDefinitions(
  analysis: ManifestAnalysis,
  stage: "manifest" | "session" = "manifest",
): TopologyDefinitions {
  const definitions = buildTopologyDefinitions(
    analysis.manifest,
    (schema, value, boardId) =>
      z
        .record(z.string(), RuntimeJsonSchema)
        .parse(materializeFields(schema, analysis, value, boardId, stage)),
  );
  const inventory = seededTopologyInventory(
    analysis.manifest,
    analysis.playerIds,
  );
  for (const boardId of Object.keys(inventory.boards))
    deriveBoardTopology(inventory, definitions, boardId);
  return definitions;
}

function buildTopologyDefinitions(
  manifest: GameTopologyManifest,
  fields: (
    schema: FieldSchemaJson | undefined,
    value: unknown,
    boardId?: string,
  ) => Record<string, z.infer<typeof RuntimeJsonSchema>>,
): TopologyDefinitions {
  const boardDefinitions: Record<string, BoardDefinition> = {};
  for (const board of manifest.boards ?? []) {
    const base = {
      id: board.id,
      name: board.name,
      scope: board.scope,
      ...(board.typeId === undefined ? {} : { typeId: board.typeId }),
      fields: fields(board.boardFieldsSchema, board.fields, board.id),
    };
    boardDefinitions[board.id] =
      board.layout === "generic"
        ? {
            ...base,
            layout: "generic",
            spaces: Object.fromEntries(
              (board.spaces ?? []).map((space) => [
                space.id,
                {
                  ...space,
                  fields: fields(
                    board.spaceFieldsSchema,
                    space.fields,
                    board.id,
                  ),
                },
              ]),
            ),
          }
        : board.layout === "hex"
          ? {
              ...base,
              layout: "hex",
              orientation: board.orientation ?? "pointy",
            }
          : { ...base, layout: "square" };
  }
  const tileDefinitions: Record<string, TileDefinition> = {};
  for (const type of manifest.tileTypes ?? []) {
    const {
      fieldsSchema,
      // Strip the mutable instance schema from immutable rule definitions.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Mutable instance schema must not enter immutable definitions.
      propertiesSchema,
      cellFieldsSchema,
      edgeFieldsSchema,
      vertexFieldsSchema,
      ...definition
    } = type;
    const normalized = {
      ...definition,
      fields: fields(fieldsSchema, type.fields),
    };
    if (type.layout === "hex")
      tileDefinitions[type.id] = {
        ...normalized,
        layout: "hex",
        cells: type.cells.map((cell) => ({
          ...cell,
          fields: fields(cellFieldsSchema, cell.fields),
        })),
        edges: (type.edges ?? []).map((edge) => ({
          ...edge,
          fields: fields(edgeFieldsSchema, edge.fields),
        })),
        vertices: (type.vertices ?? []).map((vertex) => ({
          ...vertex,
          fields: fields(vertexFieldsSchema, vertex.fields),
        })),
      };
    else
      tileDefinitions[type.id] = {
        ...normalized,
        layout: "square",
        cells: type.cells.map((cell) => ({
          ...cell,
          fields: fields(cellFieldsSchema, cell.fields),
        })),
        edges: (type.edges ?? []).map((edge) => ({
          ...edge,
          fields: fields(edgeFieldsSchema, edge.fields),
        })),
        vertices: (type.vertices ?? []).map((vertex) => ({
          ...vertex,
          fields: fields(vertexFieldsSchema, vertex.fields),
        })),
      };
  }
  return freezeDefinition(
    structuredClone({ boardDefinitions, tileDefinitions }),
  );
}
function materializeManifest(
  options: MaterializeOptions,
  stage: "manifest" | "session",
): Record<string, unknown> {
  const analysis = analyzeManifest(options.manifest, options.playerIds);
  const fields = (
    schema: FieldSchemaJson | null | undefined,
    analysis: ManifestAnalysis,
    values: unknown,
    boardId?: string,
  ) => materializeFields(schema, analysis, values, boardId, stage);
  const manifest = analysis.manifest;
  const playerIds = [...options.playerIds];

  for (const type of manifest.tileTypes ?? []) {
    fields(type.fieldsSchema, analysis, type.fields);
    for (const cell of type.cells)
      fields(type.cellFieldsSchema, analysis, cell.fields);
    for (const edge of type.edges ?? [])
      fields(type.edgeFieldsSchema, analysis, edge.fields);
    for (const vertex of type.vertices ?? [])
      fields(type.vertexFieldsSchema, analysis, vertex.fields);
  }

  const cards = createRecord<
    ZoneTable["cards"][string] & Record<string, unknown>
  >();
  const pieces = createRecord<
    ZoneTable["pieces"][string] & Record<string, unknown>
  >();
  const tiles = createRecord<
    ZoneTable["tiles"][string] & Record<string, unknown>
  >();
  const dice = createRecord<
    ZoneTable["dice"][string] & Record<string, unknown>
  >();
  const componentLocations = createRecord<RuntimeComponentLocation>();
  const locationOrder = new Map<string, number>();

  const boardAnalysisByBaseId = new Map(
    analysis.analyzedBoards.map((board) => [board.board.id, board] as const),
  );
  const edgeIdByBoardBaseIdAndSpaces = new Map<string, Map<string, string>>();
  const vertexIdByBoardBaseIdAndSpaces = new Map<string, Map<string, string>>();

  for (const analyzedBoard of analysis.analyzedBoards) {
    for (const [boardId, topology] of analyzedBoard.topologies) {
      if (topology.layout === "generic") continue;
      edgeIdByBoardBaseIdAndSpaces.set(
        boardId,
        new Map(
          topology.edges.map((edge) => [
            boardSpaceRefKey(edge.spaceIds),
            edge.id,
          ]),
        ),
      );
      vertexIdByBoardBaseIdAndSpaces.set(
        boardId,
        new Map(
          topology.vertices.map((vertex) => [
            boardSpaceRefKey(vertex.spaceIds),
            vertex.id,
          ]),
        ),
      );
    }
  }

  const nextLocationPosition = (location: Record<string, unknown>): number => {
    const key = JSON.stringify(location);
    const position = locationOrder.get(key) ?? 0;
    locationOrder.set(key, position + 1);
    return position;
  };
  const zoneDefinitions: Record<string, ZoneDefinition> = Object.fromEntries(
    (manifest.zones ?? []).map((zone) => [
      zone.id,
      {
        ...("scope" in zone
          ? { scope: zone.scope }
          : { attachedTo: zone.attachedTo }),
        visibility: zone.visibility ?? "public",
        allowedCardSetIds: zone.allowedCardSetIds ?? [],
      },
    ]),
  );
  const pendingHomes: (() => void)[] = [];
  const resolveRuntimeBoardId = (
    boardBaseId: string,
    origin: string | null | undefined,
    context?: string,
  ) => {
    const analyzedBoard = boardAnalysisByBaseId.get(boardBaseId);
    if (!analyzedBoard) {
      throw new Error(
        `${context ?? "Component home"}.boardId: Unknown board '${boardBaseId}'.`,
      );
    }
    if (analyzedBoard?.board.scope === "perPlayer") {
      if (!origin) {
        throw new Error(
          `${context ?? `Home on board '${boardBaseId}'`} requires perPlayer scope because board '${boardBaseId}' has scope 'perPlayer'. Use perPlayer scope to resolve the player-scoped destination.`,
        );
      }
      return perPlayerInstanceId("board", boardBaseId, origin);
    }
    return boardBaseId;
  };

  const resolveBoardEdgeId = (
    boardBaseId: string,
    spaceIds: readonly string[],
  ) => {
    const edgeId = edgeIdByBoardBaseIdAndSpaces
      .get(boardBaseId)
      ?.get(boardSpaceRefKey(spaceIds));
    if (!edgeId) {
      throw new Error(
        `Unknown edge on board '${boardBaseId}' for spaces [${spaceIds.join(", ")}].`,
      );
    }
    return edgeId;
  };

  const resolveBoardVertexId = (
    boardBaseId: string,
    spaceIds: readonly string[],
  ) => {
    const vertexId = vertexIdByBoardBaseIdAndSpaces
      .get(boardBaseId)
      ?.get(boardSpaceRefKey(spaceIds));
    if (!vertexId) {
      throw new Error(
        `Unknown vertex on board '${boardBaseId}' for spaces [${spaceIds.join(", ")}].`,
      );
    }
    return vertexId;
  };

  const materializeComponentLocation = (
    home: NonNullable<BoardCard["home"]>,
    origin: string | null,
    context: {
      path: string;
      label: string;
    },
  ): RuntimeComponentLocation => {
    if (home.type === "detached") {
      return { type: "Detached" };
    }

    if (home.type === "zone") {
      const definition = zoneDefinitions[home.zoneId];
      if (!definition)
        throw new Error(`${context.path}: Unknown zone '${home.zoneId}'.`);
      let hostId: string;
      if ("scope" in definition) {
        if (definition.scope === "shared") hostId = "table";
        else {
          if (!origin)
            throw new Error(
              `${context.path}: Per-player zone requires a replication origin.`,
            );
          hostId = origin;
        }
      } else if ("board" in definition.attachedTo) {
        const boardId = resolveRuntimeBoardId(
          definition.attachedTo.board,
          origin,
          context.path,
        );
        hostId =
          definition.attachedTo.space !== undefined
            ? boardSpaceHostId(boardId, definition.attachedTo.space)
            : boardId;
      } else {
        if (!home.component)
          throw new Error(
            `${context.path}.component: Component-attached zone requires a host base id.`,
          );
        const family =
          "pieceType" in definition.attachedTo
            ? "piece"
            : "dieType" in definition.attachedTo
              ? "die"
              : "tile";
        const seeds =
          family === "piece"
            ? manifest.pieceSeeds
            : family === "die"
              ? manifest.dieSeeds
              : manifest.tileSeeds;
        const seed = seeds?.find((seed) =>
          expandSeedIds([seed]).includes(home.component ?? ""),
        );
        if (!seed)
          throw new Error(
            `${context.path}.component: Unknown host base '${home.component}'.`,
          );
        if (seed.scope === "perPlayer") {
          if (!origin)
            throw new Error(
              `${context.path}: Replicated host requires a replication origin.`,
            );
          hostId = perPlayerInstanceId(family, home.component, origin);
        } else hostId = home.component;
        if ("tileType" in definition.attachedTo)
          hostId = tileSpaceId(hostId, definition.attachedTo.cell);
      }
      return { type: "InZone", zoneId: home.zoneId, hostId, playedBy: null };
    }

    if (home.type === "space") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        origin,
        `${context.path}.boardId: ${context.label}`,
      );
      if (!analysis.spaceIdsByBoardId.get(boardId)?.includes(home.spaceId)) {
        throw new Error(
          `${context.path}.spaceId: ${context.label} targets unknown space '${home.spaceId}' on board '${home.boardId}'.`,
        );
      }
      return {
        type: "OnSpace",
        boardId,
        spaceId: home.spaceId,
        position: nextLocationPosition({
          type: "OnSpace",
          boardId,
          spaceId: home.spaceId,
        }),
      };
    }

    if (home.type === "edge") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        origin,
        `${context.path}.boardId: ${context.label}`,
      );
      const edgeId = resolveBoardEdgeId(boardId, home.ref.spaces);
      return {
        type: "OnEdge",
        boardId,
        edgeId,
        position: nextLocationPosition({
          type: "OnEdge",
          boardId,
          edgeId,
        }),
      };
    }

    if (home.type === "vertex") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        origin,
        `${context.path}.boardId: ${context.label}`,
      );
      const vertexId = resolveBoardVertexId(boardId, home.ref.spaces);
      return {
        type: "OnVertex",
        boardId,
        vertexId,
        position: nextLocationPosition({
          type: "OnVertex",
          boardId,
          vertexId,
        }),
      };
    }

    const exhaustive: never = home;
    throw new Error(
      `Unsupported component home: ${JSON.stringify(exhaustive)}`,
    );
  };

  for (const [cardSetIndex, cardSet] of manifest.cardSets.entries()) {
    for (const [cardIndex, card] of cardSet.cards.entries()) {
      const cardInstanceIds = scopedInstances(
        "card",
        renderCardInstanceIds(card),
        card.scope,
        playerIds,
      );
      for (const [
        instanceIndex,
        { id: cardId, playerId: origin },
      ] of cardInstanceIds.entries()) {
        cards[cardId] = {
          id: cardId,
          cardSetId: cardSet.id,
          cardType: card.cardType,
          name: card.name,
          text: card.text,
          frontImage: card.frontImage,
          backImage: card.backImage,
          properties: fields(
            schemaForCardType(cardSet.cardSchema, card.cardType),
            analysis,
            card.properties,
          ),
        };
        const resolvedHome = card.home ?? cardSet.defaultHome;
        const path =
          card.home === undefined
            ? `manifest.cardSets[${cardSetIndex}].defaultHome`
            : `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`;
        componentLocations[cardId] = { type: "Detached" };
        pendingHomes.push(() => {
          componentLocations[cardId] = materializeComponentLocation(
            resolvedHome,
            origin,
            {
              path,
              label: `Card '${card.id}' instance ${instanceIndex + 1}`,
            },
          );
        });
      }
    }
  }

  if (Object.keys(cards).length !== analysis.cardIds.length) {
    throw new Error(
      "Materialized card record cardinality drifted from analysis.",
    );
  }
  if (Object.keys(componentLocations).length !== analysis.cardIds.length) {
    throw new Error(
      "Materialized card locations drifted from analysis before seed placement.",
    );
  }

  const pieceTypesById = new Map(
    (manifest.pieceTypes ?? []).map((pieceType) => [pieceType.id, pieceType]),
  );
  const dieTypesById = new Map(
    (manifest.dieTypes ?? []).map((dieType) => [dieType.id, dieType]),
  );

  const assignSeedLocation = (
    componentId: string,
    origin: string | null | undefined,
    home:
      | PieceSeedSpec["home"]
      | import("../../shared/domain/contracts.js").TileSeedSpec["home"]
      | undefined,
    context: { path: string; label: string },
  ) => {
    componentLocations[componentId] = { type: "Detached" };
    if (home?.type === "board") {
      componentLocations[componentId] = {
        ...home,
        type: "OnBoard",
        boardId: resolveRuntimeBoardId(home.boardId, origin, context.path),
      };
      return;
    }
    if (home)
      pendingHomes.push(() => {
        componentLocations[componentId] = materializeComponentLocation(
          home,
          origin ?? null,
          context,
        );
      });
  };

  for (const [seedIndex, seed] of (manifest.pieceSeeds ?? []).entries()) {
    const pieceType = pieceTypesById.get(seed.typeId);
    for (const { id: componentId, playerId: origin } of scopedInstances(
      "piece",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      pieces[componentId] = {
        componentType: "piece",
        id: componentId,
        pieceTypeId: seed.typeId,
        pieceName: pieceType?.name ?? seed.typeId,
        ownerId: origin,
        properties: fields(
          analysis.pieceTypeSchemasById.get(seed.typeId),
          analysis,
          seed.fields,
        ),
      };
      assignSeedLocation(componentId, origin, seed.home, {
        path: `manifest.pieceSeeds[${seedIndex}].home`,
        label: `Piece seed '${seed.id ?? seed.typeId}'`,
      });
    }
  }

  for (const [seedIndex, seed] of (manifest.dieSeeds ?? []).entries()) {
    const dieType = dieTypesById.get(seed.typeId);
    for (const { id: componentId, playerId: origin } of scopedInstances(
      "die",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      dice[componentId] = {
        componentType: "die",
        id: componentId,
        dieTypeId: seed.typeId,
        dieName: dieType?.name ?? seed.typeId,
        ownerId: origin,
        sides: dieType?.sides ?? 6,
        value: null,
        properties: fields(
          analysis.dieTypeSchemasById.get(seed.typeId),
          analysis,
          seed.fields,
        ),
      };
      assignSeedLocation(componentId, origin, seed.home, {
        path: `manifest.dieSeeds[${seedIndex}].home`,
        label: `Die seed '${seed.id ?? seed.typeId}'`,
      });
    }
  }

  for (const [index, seed] of (manifest.tileSeeds ?? []).entries()) {
    for (const { id, playerId: origin } of scopedInstances(
      "tile",
      expandSeedIds([seed]),
      seed.scope,
      playerIds,
    )) {
      tiles[id] = {
        componentType: "tile",
        id,
        tileTypeId: seed.typeId,
        ownerId: origin,
        properties: fields(
          analysis.tilePropertiesSchemasById.get(seed.typeId),
          analysis,
          seed.properties,
        ),
      };
      assignSeedLocation(id, origin, seed.home, {
        path: `manifest.tileSeeds[${index}].home`,
        label: `Tile seed '${seed.id}'`,
      });
    }
  }
  const topologyDefinitions = materializeTopologyDefinitions(
    analysis,
    "session",
  );
  const boardStatesById: Record<string, RuntimeBoardInstance> = {};
  for (const board of analysis.analyzedBoards)
    for (const id of board.runtimeBoardIds)
      boardStatesById[id] = {
        baseId: board.board.id,
        relations: board.relations.map((relation) => ({
          ...(relation.id === undefined ? {} : { id: relation.id }),
          typeId: relation.typeId,
          fromSpaceId: relation.fromSpaceId,
          toSpaceId: relation.toSpaceId,
          directed: relation.directed ?? false,
          fields: z
            .record(z.string(), RuntimeJsonSchema)
            .parse(
              fields(board.relationFieldsSchema, analysis, relation.fields, id),
            ),
        })),
      };
  const zones = materializeEmptyZones(analysis);
  const zoneTable: ZoneTable = {
    playerOrder: playerIds,
    zones,
    cards,
    pieces,
    dice,
    tiles,
    componentLocations,
    boards: boardStatesById,
  };
  for (const boardId of Object.keys(boardStatesById))
    deriveBoardTopology(zoneTable, topologyDefinitions, boardId);
  for (const resolveHome of pendingHomes) resolveHome();
  assertContainmentAcyclic(zoneTable, {
    zoneDefinitions,
    ...topologyDefinitions,
  });
  for (const [componentId, location] of Object.entries(componentLocations)) {
    if (location.type !== "InZone") continue;
    const ids = zones[String(location.zoneId)]?.[String(location.hostId)];
    if (!ids) throw new Error(`Missing zone host for '${componentId}'.`);
    ids.push(componentId);
  }
  assertZoneConsistency(zoneTable, { zoneDefinitions, ...topologyDefinitions });
  const { ownerOfCard, visibility } = initialCardMetadata(
    manifest.cardSets,
    playerIds,
  );
  const resourcesByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      Object.fromEntries(
        analysis.resourceIds.map((resourceId) => [resourceId, 0]),
      ),
    ]),
  );
  return cloneJson({
    playerOrder: playerIds,
    zones,
    cards,
    pieces,
    componentLocations,
    ownerOfCard,
    visibility,
    resources: resourcesByPlayer,
    boards: boardStatesById,
    dice,
    tiles,
  });
}
