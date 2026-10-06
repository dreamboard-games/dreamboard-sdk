import * as z from "zod";
import {
  createFieldValidatorResolver,
  schemaForCardType,
  type FieldReferenceContext,
} from "./field-schemas";
import type {
  BoardEdgeRef,
  BoardContainerSpec,
  BoardCard,
  BoardRelationSpec,
  BoardSpec,
  BoardSpaceSpec,
  BoardVertexRef,
  GenericBoardSpec,
  HexBoardSpec,
  HexEdgeRef,
  HexSpaceSpec,
  HexVertexRef,
  DieSeedSpec,
  CardSetDefinition,
  FieldSchemaJson,
  PieceSeedSpec,
  SquareBoardSpec,
  SquareEdgeSpec,
  SquareSpaceSpec,
  SquareVertexSpec,
  ZoneSpec,
} from "../../shared/domain/contracts.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";

import { createHexTopology, resolveHexSpaces } from "../../shared/hex-board.js";

import { assertValidManifest } from "./manifest-validation.js";

interface AnalyzedGenericBoard {
  layout: "generic";
  board: GenericBoardSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: FieldSchemaJson | null;
  spaceFieldsSchema?: FieldSchemaJson | null;
  relationFieldsSchema?: FieldSchemaJson | null;
  containerFieldsSchema?: FieldSchemaJson | null;
  spaces: BoardSpaceSpec[];
  relations: BoardRelationSpec[];
  containers: BoardContainerSpec[];
}

interface AnalyzedHexBoard {
  layout: "hex";
  board: HexBoardSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: FieldSchemaJson | null;
  spaceFieldsSchema?: FieldSchemaJson | null;
  edgeFieldsSchema?: FieldSchemaJson | null;
  vertexFieldsSchema?: FieldSchemaJson | null;
  spaces: HexSpaceSpec[];
  authoredEdges: Array<{
    id: string;
    ref: HexEdgeRef;
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
  authoredVertices: Array<{
    id: string;
    ref: HexVertexRef;
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
  edges: Array<{
    id: string;
    spaceIds: string[];
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
  vertices: Array<{
    id: string;
    spaceIds: string[];
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
}

interface AnalyzedSquareBoard {
  layout: "square";
  board: SquareBoardSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: FieldSchemaJson | null;
  spaceFieldsSchema?: FieldSchemaJson | null;
  relationFieldsSchema?: FieldSchemaJson | null;
  containerFieldsSchema?: FieldSchemaJson | null;
  edgeFieldsSchema?: FieldSchemaJson | null;
  vertexFieldsSchema?: FieldSchemaJson | null;
  spaces: SquareSpaceSpec[];
  relations: BoardRelationSpec[];
  containers: BoardContainerSpec[];
  edges: Array<{
    id: string;
    spaceIds: string[];
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
  vertices: Array<{
    id: string;
    spaceIds: string[];
    typeId?: string | null;
    label?: string | null;
    fields?: Record<string, unknown> | null;
  }>;
}

type AnalyzedBoard =
  AnalyzedGenericBoard | AnalyzedHexBoard | AnalyzedSquareBoard;

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
  dieTypeIdByDieId: Map<string, string>;
  strictSlotHosts: Array<{
    kind: "piece" | "die";
    id: string;
    slotIds: string[];
  }>;
  boardBaseIds: string[];
  boardIds: string[];
  boardContainerIds: string[];
  boardTypeIds: string[];
  boardLayoutById: Map<string, string>;
  boardIdsByLayout: Map<string, string[]>;
  boardBaseIdsByLayout: Map<string, string[]>;
  boardIdsByBaseId: Map<string, string[]>;
  boardIdsByTypeId: Map<string, string[]>;
  spaceIdsByBoardId: Map<string, string[]>;
  spaceTypeIdByBoardId: Map<string, Record<string, string | null>>;
  spaceIdsByTypeId: Map<string, string[]>;
  containerIdsByBoardId: Map<string, string[]>;
  containerHostByBoardId: Map<
    string,
    Record<string, { type: "board" } | { type: "space"; spaceId: string }>
  >;
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

function renderCardInstanceIds(card: BoardCard): string[] {
  if (card.count > 1) {
    return Array.from(
      { length: card.count },
      (_, index) => `${card.id}-${index + 1}`,
    );
  }
  return [card.id];
}

function expandSeedIds(
  seeds: ReadonlyArray<
    | PieceSeedSpec
    | { id?: string | null; typeId: string; count?: number | null }
  >,
): string[] {
  const expanded: string[] = [];
  for (const seed of seeds) {
    const count = seed.count ?? 1;
    const baseId = seed.id ?? seed.typeId;
    if (count <= 1) {
      expanded.push(baseId);
      continue;
    }
    for (let index = 1; index <= count; index += 1) {
      expanded.push(`${baseId}-${index}`);
    }
  }
  return expanded;
}

function isHexBoardSpec(board: BoardSpec): board is HexBoardSpec {
  return board.layout === "hex";
}

function isSquareBoardSpec(board: BoardSpec): board is SquareBoardSpec {
  return board.layout === "square";
}

interface ResolvedHexEdge {
  id: string;
  geometryKey: string;
  spaceIds: string[];
  typeId?: string | null;
  label?: string | null;
  fields?: Record<string, unknown> | null;
}

interface ResolvedHexVertex {
  id: string;
  geometryKey: string;
  spaceIds: string[];
  typeId?: string | null;
  label?: string | null;
  fields?: Record<string, unknown> | null;
}

const SQUARE_SIDES = ["north", "east", "south", "west"] as const;

const SQUARE_CORNERS = ["nw", "ne", "se", "sw"] as const;

type SquareSide = (typeof SQUARE_SIDES)[number];

type SquareCorner = (typeof SQUARE_CORNERS)[number];

function squareEdgeIdFromGeometryKey(key: string): string {
  return `square-edge:${key}`;
}

function squareVertexIdFromGeometryKey(key: string): string {
  return `square-vertex:${key}`;
}

function squareCornerGeometryKey(
  space: Pick<SquareSpaceSpec, "row" | "col">,
  corner: SquareCorner,
): string {
  switch (corner) {
    case "nw":
      return `${space.col},${space.row}`;
    case "ne":
      return `${space.col + 1},${space.row}`;
    case "se":
      return `${space.col + 1},${space.row + 1}`;
    case "sw":
      return `${space.col},${space.row + 1}`;
  }
}

function squareEdgeGeometryKey(
  space: Pick<SquareSpaceSpec, "row" | "col">,
  side: SquareSide,
): string {
  const endpoints =
    side === "north"
      ? [`${space.col},${space.row}`, `${space.col + 1},${space.row}`]
      : side === "east"
        ? [`${space.col + 1},${space.row}`, `${space.col + 1},${space.row + 1}`]
        : side === "south"
          ? [
              `${space.col},${space.row + 1}`,
              `${space.col + 1},${space.row + 1}`,
            ]
          : [`${space.col},${space.row}`, `${space.col},${space.row + 1}`];
  return endpoints.sort((left, right) => left.localeCompare(right)).join("::");
}

function geometryKeyFromSquareEdgeRef(
  ref: BoardEdgeRef,
  spacesById: ReadonlyMap<string, SquareSpaceSpec>,
): string {
  const resolvedSpaces = [...ref.spaces]
    .sort((a, b) => a.localeCompare(b))
    .map((spaceId) => {
      const space = spacesById.get(spaceId);
      if (!space) {
        throw new Error(
          `Square edge ref references unknown space '${spaceId}'.`,
        );
      }
      return space;
    });
  const keyCounts = new Map<string, number>();
  for (const space of resolvedSpaces) {
    for (const side of SQUARE_SIDES) {
      const key = squareEdgeGeometryKey(space, side);
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const candidates = [...keyCounts.entries()]
    .filter(([, count]) => count === resolvedSpaces.length)
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
  if (candidates.length !== 1) {
    throw new Error(
      `Square edge ref spaces '${ref.spaces.join(", ")}' do not resolve to exactly one shared edge.`,
    );
  }
  const [only] = candidates;
  if (only === undefined) {
    throw new Error(
      "unreachable: candidates.length === 1 but first is undefined",
    );
  }
  return only;
}

function geometryKeyFromSquareVertexRef(
  ref: BoardVertexRef,
  spacesById: ReadonlyMap<string, SquareSpaceSpec>,
): string {
  const resolvedSpaces = [...ref.spaces]
    .sort((a, b) => a.localeCompare(b))
    .map((spaceId) => {
      const space = spacesById.get(spaceId);
      if (!space) {
        throw new Error(
          `Square vertex ref references unknown space '${spaceId}'.`,
        );
      }
      return space;
    });
  const keyCounts = new Map<string, number>();
  for (const space of resolvedSpaces) {
    for (const corner of SQUARE_CORNERS) {
      const key = squareCornerGeometryKey(space, corner);
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const candidates = [...keyCounts.entries()]
    .filter(([, count]) => count === resolvedSpaces.length)
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
  if (candidates.length !== 1) {
    throw new Error(
      `Square vertex ref spaces '${ref.spaces.join(", ")}' do not resolve to exactly one shared vertex.`,
    );
  }
  const [only] = candidates;
  if (only === undefined) {
    throw new Error(
      "unreachable: candidates.length === 1 but first is undefined",
    );
  }
  return only;
}

function resolveAuthoredHexEdges(
  board: HexBoardSpec,
  geometry: ReturnType<typeof createHexTopology>,
): AnalyzedHexBoard["authoredEdges"] {
  return (board.edges ?? []).map((edge) => ({
    ...edge,
    id:
      "spaces" in edge.ref
        ? geometry.edge(...edge.ref.spaces)
        : geometry.edgeAt(edge.ref.space, edge.ref.side),
  }));
}
function resolveAuthoredHexVertices(
  board: HexBoardSpec,
  geometry: ReturnType<typeof createHexTopology>,
): AnalyzedHexBoard["authoredVertices"] {
  return (board.vertices ?? []).map((vertex) => ({
    ...vertex,
    id:
      "spaces" in vertex.ref
        ? geometry.vertex(...vertex.ref.spaces)
        : geometry.vertexAt(vertex.ref.space, vertex.ref.corner),
  }));
}

function resolveSquareSpaces(board: SquareBoardSpec): SquareSpaceSpec[] {
  return [...(board.spaces ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function deriveSquareEdges(
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexEdge[] {
  const edgeMap = new Map<string, ResolvedHexEdge>();
  for (const space of spaces) {
    for (const side of SQUARE_SIDES) {
      const geometryKey = squareEdgeGeometryKey(space, side);
      const existing = edgeMap.get(geometryKey);
      const nextSpaceIds = dedupeSorted([
        ...(existing?.spaceIds ?? []),
        space.id,
      ]);
      edgeMap.set(geometryKey, {
        id: squareEdgeIdFromGeometryKey(geometryKey),
        geometryKey,
        spaceIds: nextSpaceIds,
        typeId: existing?.typeId ?? null,
        label: existing?.label ?? null,
        fields: existing?.fields ?? null,
      });
    }
  }
  return [...edgeMap.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function deriveSquareVertices(
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexVertex[] {
  const vertexMap = new Map<string, ResolvedHexVertex>();
  for (const space of spaces) {
    for (const corner of SQUARE_CORNERS) {
      const geometryKey = squareCornerGeometryKey(space, corner);
      const existing = vertexMap.get(geometryKey);
      const nextSpaceIds = dedupeSorted([
        ...(existing?.spaceIds ?? []),
        space.id,
      ]);
      vertexMap.set(geometryKey, {
        id: squareVertexIdFromGeometryKey(geometryKey),
        geometryKey,
        spaceIds: nextSpaceIds,
        typeId: existing?.typeId ?? null,
        label: existing?.label ?? null,
        fields: existing?.fields ?? null,
      });
    }
  }
  return [...vertexMap.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function indexSquareEdgeMetadata(
  specs: readonly SquareEdgeSpec[],
  spacesById: ReadonlyMap<string, SquareSpaceSpec>,
  ownerLabel: string,
): Map<string, Omit<ResolvedHexEdge, "id" | "spaceIds">> {
  const metadataByKey = new Map<
    string,
    Omit<ResolvedHexEdge, "id" | "spaceIds">
  >();
  for (const spec of specs) {
    const geometryKey = geometryKeyFromSquareEdgeRef(spec.ref, spacesById);
    if (metadataByKey.has(geometryKey)) {
      throw new Error(`${ownerLabel} contains duplicate square edge refs.`);
    }
    metadataByKey.set(geometryKey, {
      geometryKey,
      typeId: spec.typeId ?? null,
      label: spec.label ?? null,
      fields: spec.fields ?? null,
    });
  }
  return metadataByKey;
}

function indexSquareVertexMetadata(
  specs: readonly SquareVertexSpec[],
  spacesById: ReadonlyMap<string, SquareSpaceSpec>,
  ownerLabel: string,
): Map<string, Omit<ResolvedHexVertex, "id" | "spaceIds">> {
  const metadataByKey = new Map<
    string,
    Omit<ResolvedHexVertex, "id" | "spaceIds">
  >();
  for (const spec of specs) {
    const geometryKey = geometryKeyFromSquareVertexRef(spec.ref, spacesById);
    if (metadataByKey.has(geometryKey)) {
      throw new Error(`${ownerLabel} contains duplicate square vertex refs.`);
    }
    metadataByKey.set(geometryKey, {
      geometryKey,
      typeId: spec.typeId ?? null,
      label: spec.label ?? null,
      fields: spec.fields ?? null,
    });
  }
  return metadataByKey;
}

function resolveSquareEdges(
  board: SquareBoardSpec,
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexEdge[] {
  const spacesById = new Map(spaces.map((space) => [space.id, space] as const));
  const derived = deriveSquareEdges(spaces);
  const edgesByGeometryKey = new Map(
    derived.map((edge) => [edge.geometryKey, edge] as const),
  );
  const metadataByKey = indexSquareEdgeMetadata(
    board.edges ?? [],
    spacesById,
    `Square board '${board.id}'`,
  );

  for (const [geometryKey, metadata] of metadataByKey.entries()) {
    const edge = edgesByGeometryKey.get(geometryKey);
    if (!edge) {
      throw new Error(
        `Square edge ref on board '${board.id}' does not resolve to a derived edge.`,
      );
    }
    edgesByGeometryKey.set(geometryKey, {
      ...edge,
      typeId: metadata.typeId ?? null,
      label: metadata.label ?? null,
      fields: metadata.fields ?? null,
    });
  }

  return [...edgesByGeometryKey.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function resolveSquareVertices(
  board: SquareBoardSpec,
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexVertex[] {
  const spacesById = new Map(spaces.map((space) => [space.id, space] as const));
  const derived = deriveSquareVertices(spaces);
  const verticesByGeometryKey = new Map(
    derived.map((vertex) => [vertex.geometryKey, vertex] as const),
  );
  const metadataByKey = indexSquareVertexMetadata(
    board.vertices ?? [],
    spacesById,
    `Square board '${board.id}'`,
  );

  for (const [geometryKey, metadata] of metadataByKey.entries()) {
    const vertex = verticesByGeometryKey.get(geometryKey);
    if (!vertex) {
      throw new Error(
        `Square vertex ref on board '${board.id}' does not resolve to a derived vertex.`,
      );
    }
    verticesByGeometryKey.set(geometryKey, {
      ...vertex,
      typeId: metadata.typeId ?? null,
      label: metadata.label ?? null,
      fields: metadata.fields ?? null,
    });
  }

  return [...verticesByGeometryKey.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function analyzeBoards(manifest: GameTopologyManifest, playerIds: string[]) {
  return (manifest.boards ?? []).map((board): AnalyzedBoard => {
    const runtimeBoardIds =
      board.scope === "perPlayer"
        ? playerIds.map((playerId) => `${board.id}:${playerId}`)
        : [board.id];

    if (isHexBoardSpec(board)) {
      const spaces = resolveHexSpaces(board);
      const geometry = createHexTopology({ ...board, spaces });
      const authoredEdges = resolveAuthoredHexEdges(board, geometry);
      const authoredVertices = resolveAuthoredHexVertices(board, geometry);
      return {
        layout: "hex",
        board,
        boardTypeId: board.typeId,
        runtimeBoardIds,
        boardFieldsSchema: board.boardFieldsSchema,
        spaceFieldsSchema: board.spaceFieldsSchema,
        edgeFieldsSchema: board.edgeFieldsSchema,
        vertexFieldsSchema: board.vertexFieldsSchema,
        spaces,
        authoredEdges,
        authoredVertices,
        edges: geometry.edges.map((edge) => ({
          ...edge,
          spaceIds: [...edge.spaceIds],
          vertexIds: [...edge.vertexIds],
          ...authoredEdges.find((authored) => authored.id === edge.id),
        })),
        vertices: geometry.vertices.map((vertex) => ({
          ...vertex,
          spaceIds: [...vertex.spaceIds],
          edgeIds: [...vertex.edgeIds],
          ...authoredVertices.find((authored) => authored.id === vertex.id),
        })),
      };
    }

    if (isSquareBoardSpec(board)) {
      const squareBoard = board;
      const spaces = resolveSquareSpaces(squareBoard);
      return {
        layout: "square",
        board: squareBoard,

        boardTypeId: squareBoard.typeId,
        runtimeBoardIds,
        boardFieldsSchema: squareBoard.boardFieldsSchema,
        spaceFieldsSchema: squareBoard.spaceFieldsSchema,
        relationFieldsSchema: squareBoard.relationFieldsSchema,
        containerFieldsSchema: squareBoard.containerFieldsSchema,
        edgeFieldsSchema: squareBoard.edgeFieldsSchema,
        vertexFieldsSchema: squareBoard.vertexFieldsSchema,
        spaces,
        relations: [...(squareBoard.relations ?? [])],
        containers: [...(squareBoard.containers ?? [])].sort((left, right) =>
          left.id.localeCompare(right.id),
        ),
        edges: resolveSquareEdges(squareBoard, spaces),
        vertices: resolveSquareVertices(squareBoard, spaces),
      };
    }

    const genericBoard = board;
    return {
      layout: "generic",
      board: genericBoard,

      boardTypeId: genericBoard.typeId,
      runtimeBoardIds,
      boardFieldsSchema: genericBoard.boardFieldsSchema,
      spaceFieldsSchema: genericBoard.spaceFieldsSchema,
      relationFieldsSchema: genericBoard.relationFieldsSchema,
      containerFieldsSchema: genericBoard.containerFieldsSchema,
      spaces: [...(genericBoard.spaces ?? [])].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
      relations: [...(genericBoard.relations ?? [])],
      containers: [...(genericBoard.containers ?? [])].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    };
  });
}

function isSingletonExplicitSeed(seed: {
  id?: string | null;
  count?: number | null;
}): seed is typeof seed & { id: string } {
  return (
    typeof seed.id === "string" && seed.id.length > 0 && (seed.count ?? 1) === 1
  );
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
  const playerIds = runtimePlayerIds
    ? [...runtimePlayerIds]
    : Array.from(
        { length: manifest.players.maxPlayers },
        (_, index) => `player-${index + 1}`,
      );
  const sharedZones = (manifest.zones ?? []).filter(
    (zone) => zone.scope === "shared",
  );
  const playerZones = (manifest.zones ?? []).filter(
    (zone) => zone.scope === "perPlayer",
  );
  const zoneIds = dedupeSorted((manifest.zones ?? []).map((zone) => zone.id));
  const cardSets = manifest.cardSets;
  const cardSetIds = dedupeSorted(cardSets.map((cardSet) => cardSet.id));
  const cardTypes = dedupeSorted(
    cardSets.flatMap((cardSet) => cardSet.cards.map((card) => card.cardType)),
  );
  const cardIds = dedupeSorted(
    cardSets.flatMap((cardSet) => cardSet.cards.flatMap(renderCardInstanceIds)),
  );
  const cardSetIdByCardId = new Map<string, string>();
  const cardTypeByCardId = new Map<string, string>();
  for (const cardSet of cardSets) {
    for (const card of cardSet.cards) {
      for (const cardId of renderCardInstanceIds(card)) {
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
  const zoneCardSetIdsById = new Map<string, string[]>();
  for (const [zoneId, cardSetIds] of sharedZoneCardSetIds.entries()) {
    zoneCardSetIdsById.set(zoneId, cardSetIds);
  }
  for (const [zoneId, cardSetIds] of playerZoneCardSetIds.entries()) {
    zoneCardSetIdsById.set(zoneId, cardSetIds);
  }

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
  const pieceTypeSlotIdsById = new Map(
    (manifest.pieceTypes ?? []).map((pieceType) => [
      pieceType.id,
      dedupeSorted((pieceType.slots ?? []).map((slot) => slot.id)),
    ]),
  );
  const pieceTypeIdByPieceId = new Map<string, string>();
  for (const seed of manifest.pieceSeeds ?? []) {
    for (const pieceId of expandSeedIds([seed])) {
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
  const dieTypeSlotIdsById = new Map(
    (manifest.dieTypes ?? []).map((dieType) => [
      dieType.id,
      dedupeSorted((dieType.slots ?? []).map((slot) => slot.id)),
    ]),
  );
  const dieTypeIdByDieId = new Map<string, string>();
  for (const seed of manifest.dieSeeds ?? []) {
    for (const dieId of expandSeedIds([seed])) {
      dieTypeIdByDieId.set(dieId, seed.typeId);
    }
  }
  const dieIds = dedupeSorted(dieTypeIdByDieId.keys());
  const strictSlotHosts = [
    ...(manifest.pieceSeeds ?? []).flatMap((seed) => {
      if (!isSingletonExplicitSeed(seed)) {
        return [];
      }
      const slotIds = pieceTypeSlotIdsById.get(seed.typeId) ?? [];
      return slotIds.length > 0
        ? [
            {
              kind: "piece" as const,
              id: seed.id,
              slotIds,
            },
          ]
        : [];
    }),
    ...(manifest.dieSeeds ?? []).flatMap((seed) => {
      if (!isSingletonExplicitSeed(seed)) {
        return [];
      }
      const slotIds = dieTypeSlotIdsById.get(seed.typeId) ?? [];
      return slotIds.length > 0
        ? [
            {
              kind: "die" as const,
              id: seed.id,
              slotIds,
            },
          ]
        : [];
    }),
  ].sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id),
  );
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
  const containerIdsByBoardId = new Map<string, string[]>();
  const containerHostByBoardId = new Map<
    string,
    Record<string, { type: "board" } | { type: "space"; spaceId: string }>
  >();
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
    const runtimeSpaceIds = analyzedBoard.spaces.map((space) => space.id);
    const runtimeSpaceTypeIds: Record<string, string | null> = sortedObject(
      analyzedBoard.spaces.map(
        (space) => [space.id, space.typeId ?? null] as const,
      ),
    );
    const runtimeContainerIds =
      analyzedBoard.layout === "hex"
        ? []
        : analyzedBoard.containers.map((container) => container.id);
    const runtimeContainerHosts: Record<
      string,
      { type: "board" } | { type: "space"; spaceId: string }
    > =
      analyzedBoard.layout === "hex"
        ? {}
        : sortedObject(
            analyzedBoard.containers.map((container) => [
              container.id,
              container.host.type === "space"
                ? { type: "space" as const, spaceId: container.host.spaceId }
                : { type: "board" as const },
            ]),
          );
    const runtimeRelationTypeIds =
      analyzedBoard.layout === "hex"
        ? ["adjacent"]
        : analyzedBoard.layout === "square"
          ? dedupeSorted([
              "adjacent",
              ...analyzedBoard.relations.map((relation) => relation.typeId),
            ])
          : dedupeSorted(
              analyzedBoard.relations.map((relation) => relation.typeId),
            );
    for (const runtimeBoardId of analyzedBoard.runtimeBoardIds) {
      boardLayoutById.set(runtimeBoardId, analyzedBoard.board.layout);
      spaceIdsByBoardId.set(runtimeBoardId, runtimeSpaceIds);
      spaceTypeIdByBoardId.set(runtimeBoardId, runtimeSpaceTypeIds);
      containerIdsByBoardId.set(runtimeBoardId, runtimeContainerIds);
      containerHostByBoardId.set(runtimeBoardId, runtimeContainerHosts);
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
        edgeIdsByBoardIdAndTypeId.set(runtimeBoardId, edgeIdsForBoardByType);
        vertexIdsByBoardIdAndTypeId.set(
          runtimeBoardId,
          vertexIdsForBoardByType,
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
  const boardContainerIds = dedupeSorted(
    analyzedBoards.flatMap((board) =>
      board.layout === "hex"
        ? []
        : board.containers.map((container) => container.id),
    ),
  );
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
    strictSlotHosts,
    boardBaseIds,
    boardIds,
    boardContainerIds,
    boardTypeIds,
    boardLayoutById,
    boardIdsByLayout,
    boardBaseIdsByLayout,
    boardIdsByBaseId,
    boardIdsByTypeId,
    spaceIdsByBoardId,
    spaceTypeIdByBoardId,
    spaceIdsByTypeId,
    containerIdsByBoardId,
    containerHostByBoardId,
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
  return {
    stage,
    deferred: stage === "manifest" ? ["playerId", "boardId"] : undefined,
    ids: {
      cardId: analysis.cardIds,
      zoneId: analysis.zoneIds,
      playerId: analysis.playerIds,
      boardId: analysis.boardIds,
      spaceId: board
        ? board.spaces.map((space) => space.id)
        : analysis.spaceIds,
      edgeId:
        board && board.layout !== "generic"
          ? board.edges.map((edge) => edge.id)
          : analysis.edgeIds,
      vertexId:
        board && board.layout !== "generic"
          ? board.vertices.map((vertex) => vertex.id)
          : analysis.vertexIds,
      pieceId: analysis.pieceIds,
      dieId: analysis.dieIds,
      resourceId: analysis.resourceIds,
    },
  };
}

const fieldResolvers = new WeakMap<
  ManifestAnalysis,
  ReturnType<typeof createFieldValidatorResolver>
>();
function materializeFields(
  schema: FieldSchemaJson | null | undefined,
  analysis: ManifestAnalysis,
  values: unknown,
  boardId?: string,
): Record<string, unknown> {
  if (!schema) return z.record(z.string(), z.unknown()).parse(values ?? {});
  let resolve = fieldResolvers.get(analysis);
  if (!resolve) {
    resolve = createFieldValidatorResolver((board) =>
      fieldReferenceContext(analysis, "session", board),
    );
    fieldResolvers.set(analysis, resolve);
  }
  return z
    .record(z.string(), z.unknown())
    .parse(resolve(schema, boardId).parse(values ?? {}));
}

export function materializeManifestTable(options: {
  manifest: GameTopologyManifest;
  playerIds: readonly string[];
  shuffleItems: <Value>(values: readonly Value[]) => Value[];
}): Record<string, unknown> {
  const analysis = analyzeManifest(options.manifest, options.playerIds);
  const manifest = analysis.manifest;
  const playerIds = [...options.playerIds];

  const cards = createRecord<Record<string, unknown>>();
  const pieces = createRecord<Record<string, unknown>>();
  const dice = createRecord<Record<string, unknown>>();
  const componentLocations = createRecord<Record<string, unknown>>();
  const locationOrder = new Map<string, number>();

  const boardAnalysisByBaseId = new Map(
    analysis.analyzedBoards.map((board) => [board.board.id, board] as const),
  );
  const edgeIdByBoardBaseIdAndSpaces = new Map<string, Map<string, string>>();
  const vertexIdByBoardBaseIdAndSpaces = new Map<string, Map<string, string>>();

  for (const analyzedBoard of analysis.analyzedBoards) {
    if (analyzedBoard.layout === "generic") {
      continue;
    }
    edgeIdByBoardBaseIdAndSpaces.set(
      analyzedBoard.board.id,
      new Map(
        analyzedBoard.edges.map((edge) => [
          boardSpaceRefKey(edge.spaceIds),
          edge.id,
        ]),
      ),
    );
    vertexIdByBoardBaseIdAndSpaces.set(
      analyzedBoard.board.id,
      new Map(
        analyzedBoard.vertices.map((vertex) => [
          boardSpaceRefKey(vertex.spaceIds),
          vertex.id,
        ]),
      ),
    );
  }

  const nextLocationPosition = (location: Record<string, unknown>): number => {
    const key = JSON.stringify(location);
    const position = locationOrder.get(key) ?? 0;
    locationOrder.set(key, position + 1);
    return position;
  };
  const zoneScopeById = new Map<string, "shared" | "perPlayer">([
    ...analysis.sharedZones.map((zone) => [zone.id, "shared"] as const),
    ...analysis.playerZones.map((zone) => [zone.id, "perPlayer"] as const),
  ]);
  const resolveRuntimeBoardId = (
    boardBaseId: string,
    ownerId: string | null | undefined,
    context?: string,
  ) => {
    const analyzedBoard = boardAnalysisByBaseId.get(boardBaseId);
    if (!analyzedBoard) {
      throw new Error(
        `${context ?? "Component home"}.boardId: Unknown board '${boardBaseId}'.`,
      );
    }
    if (analyzedBoard?.board.scope === "perPlayer") {
      if (!ownerId) {
        throw new Error(
          `${context ?? `Home on board '${boardBaseId}'`} requires ownerId because board '${boardBaseId}' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.`,
        );
      }
      return `${boardBaseId}:${ownerId}`;
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
    context: {
      path: string;
      label: string;
    },
  ): Record<string, unknown> => {
    if (home.type === "detached") {
      return { type: "Detached" };
    }

    if (home.type === "slot") {
      return {
        type: "InSlot",
        host: home.host,
        slotId: home.slotId,
        position: nextLocationPosition({
          type: "InSlot",
          host: home.host,
          slotId: home.slotId,
        }),
      };
    }

    if (home.type === "zone") {
      const zoneScope = zoneScopeById.get(home.zoneId);
      if (!zoneScope) {
        throw new Error(
          `${context.path}.zoneId: ${context.label} targets unknown zone '${home.zoneId}'.`,
        );
      }
      if (zoneScope === "perPlayer") {
        throw new Error(
          `${context.path}.zoneId: ${context.label} cannot target per-player zone '${home.zoneId}' because card inventory has no ownerId. Place it during reducer setup instead.`,
        );
      }
      return {
        type: "InZone",
        zoneId: home.zoneId,
        hostId: "table",
        playedBy: null,
      };
    }

    if (home.type === "space") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        null,
        `${context.path}.boardId: ${context.label}`,
      );
      if (
        !analysis.spaceIdsByBoardId.get(home.boardId)?.includes(home.spaceId)
      ) {
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

    if (home.type === "container") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        null,
        `${context.path}.boardId: ${context.label}`,
      );
      if (
        !analysis.containerIdsByBoardId
          .get(home.boardId)
          ?.includes(home.containerId)
      ) {
        throw new Error(
          `${context.path}.containerId: ${context.label} targets unknown container '${home.containerId}' on board '${home.boardId}'.`,
        );
      }
      return {
        type: "InContainer",
        boardId,
        containerId: home.containerId,
        position: nextLocationPosition({
          type: "InContainer",
          boardId,
          containerId: home.containerId,
        }),
      };
    }

    if (home.type === "edge") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        null,
        `${context.path}.boardId: ${context.label}`,
      );
      const edgeId = resolveBoardEdgeId(home.boardId, home.ref.spaces);
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
        null,
        `${context.path}.boardId: ${context.label}`,
      );
      const vertexId = resolveBoardVertexId(home.boardId, home.ref.spaces);
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
      const cardInstanceIds = renderCardInstanceIds(card);
      for (const [instanceIndex, cardId] of cardInstanceIds.entries()) {
        cards[cardId] = {
          id: cardId,
          cardSetId: cardSet.id,
          cardType: card.cardType,
          name: card.name,
          text: card.text,
          frontImage: card.frontImage,
          backImage: card.backImage,
          properties: materializeFields(
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
        componentLocations[cardId] = materializeComponentLocation(
          resolvedHome,
          {
            path,
            label: `Card '${card.id}' instance ${instanceIndex + 1}`,
          },
        );
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
    ownerId: string | null | undefined,
    home: PieceSeedSpec["home"] | DieSeedSpec["home"] | undefined,
    context: {
      path: string;
      label: string;
    },
  ) => {
    if (!home) {
      componentLocations[componentId] = { type: "Detached" };
      return;
    }

    if (home.type === "slot") {
      componentLocations[componentId] = {
        type: "InSlot",
        host: home.host,
        slotId: home.slotId,
        position: nextLocationPosition({
          type: "InSlot",
          host: home.host,
          slotId: home.slotId,
        }),
      };
      return;
    }

    if (home.type === "zone") {
      if (zoneScopeById.get(home.zoneId) === "perPlayer") {
        if (!ownerId) {
          throw new Error(
            `${context.path}.zoneId: ${context.label} requires ownerId because zone '${home.zoneId}' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.`,
          );
        }
        componentLocations[componentId] = {
          type: "InZone",
          zoneId: home.zoneId,
          hostId: ownerId,
          playedBy: null,
        };
        return;
      }

      componentLocations[componentId] = {
        type: "InZone",
        zoneId: home.zoneId,
        hostId: "table",
        playedBy: null,
      };
      return;
    }

    if (home.type === "space") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        ownerId,
        `${context.path}.boardId: ${context.label}`,
      );
      componentLocations[componentId] = {
        type: "OnSpace",
        boardId,
        spaceId: home.spaceId,
        position: nextLocationPosition({
          type: "OnSpace",
          boardId,
          spaceId: home.spaceId,
        }),
      };
      return;
    }

    if (home.type === "container") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        ownerId,
        `${context.path}.boardId: ${context.label}`,
      );
      componentLocations[componentId] = {
        type: "InContainer",
        boardId,
        containerId: home.containerId,
        position: nextLocationPosition({
          type: "InContainer",
          boardId,
          containerId: home.containerId,
        }),
      };
      return;
    }

    if (home.type === "edge") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        ownerId,
        `${context.path}.boardId: ${context.label}`,
      );
      const edgeId = resolveBoardEdgeId(home.boardId, home.ref.spaces);
      componentLocations[componentId] = {
        type: "OnEdge",
        boardId,
        edgeId,
        position: nextLocationPosition({
          type: "OnEdge",
          boardId,
          edgeId,
        }),
      };
      return;
    }

    if (home.type === "vertex") {
      const boardId = resolveRuntimeBoardId(
        home.boardId,
        ownerId,
        `${context.path}.boardId: ${context.label}`,
      );
      const vertexId = resolveBoardVertexId(home.boardId, home.ref.spaces);
      componentLocations[componentId] = {
        type: "OnVertex",
        boardId,
        vertexId,
        position: nextLocationPosition({
          type: "OnVertex",
          boardId,
          vertexId,
        }),
      };
      return;
    }

    componentLocations[componentId] = { type: "Detached" };
  };

  for (const [seedIndex, seed] of (manifest.pieceSeeds ?? []).entries()) {
    const pieceType = pieceTypesById.get(seed.typeId);
    for (const componentId of expandSeedIds([seed])) {
      pieces[componentId] = {
        componentType: "piece",
        id: componentId,
        pieceTypeId: seed.typeId,
        pieceName: pieceType?.name ?? seed.typeId,
        ownerId: seed.ownerId ?? null,
        properties: materializeFields(
          analysis.pieceTypeSchemasById.get(seed.typeId),
          analysis,
          seed.fields,
        ),
      };
      assignSeedLocation(componentId, seed.ownerId, seed.home, {
        path: `manifest.pieceSeeds[${seedIndex}].home`,
        label: `Piece seed '${seed.id ?? seed.typeId}'`,
      });
    }
  }

  for (const [seedIndex, seed] of (manifest.dieSeeds ?? []).entries()) {
    const dieType = dieTypesById.get(seed.typeId);
    for (const componentId of expandSeedIds([seed])) {
      dice[componentId] = {
        componentType: "die",
        id: componentId,
        dieTypeId: seed.typeId,
        dieName: dieType?.name ?? seed.typeId,
        ownerId: seed.ownerId ?? null,
        sides: dieType?.sides ?? 6,
        value: null,
        properties: materializeFields(
          analysis.dieTypeSchemasById.get(seed.typeId),
          analysis,
          seed.fields,
        ),
      };
      assignSeedLocation(componentId, seed.ownerId, seed.home, {
        path: `manifest.dieSeeds[${seedIndex}].home`,
        label: `Die seed '${seed.id ?? seed.typeId}'`,
      });
    }
  }

  const boardStatesById = createRecord<Record<string, unknown>>();
  const hexBoardStatesById = createRecord<Record<string, unknown>>();
  const squareBoardStatesById = createRecord<Record<string, unknown>>();

  for (const analyzedBoard of analysis.analyzedBoards) {
    const sharedBoardState = {
      baseId: analyzedBoard.board.id,
      layout: analyzedBoard.layout,
      typeId: analyzedBoard.boardTypeId ?? null,
      scope: analyzedBoard.board.scope,
      fields: materializeFields(
        analyzedBoard.boardFieldsSchema,
        analysis,
        analyzedBoard.board.fields,
      ),
    };

    const buildSpaces = () =>
      Object.fromEntries(
        analyzedBoard.spaces.map((space) => {
          const spaceId = space.id;
          const baseSpaceState = {
            id: spaceId,
            name: "name" in space ? (space.name ?? null) : null,
            typeId: space?.typeId ?? null,
            fields: materializeFields(
              analyzedBoard.spaceFieldsSchema,
              analysis,
              space.fields,
            ),
            zoneId: "zoneId" in space ? (space.zoneId ?? null) : null,
          };

          if (analyzedBoard.layout === "hex") {
            const hexSpace = space as HexSpaceSpec;
            return [
              spaceId,
              {
                ...baseSpaceState,
                q: hexSpace.q,
                r: hexSpace.r,
              },
            ];
          }

          if (analyzedBoard.layout === "square") {
            const squareSpace = space as SquareSpaceSpec;
            return [
              spaceId,
              {
                ...baseSpaceState,
                row: squareSpace.row,
                col: squareSpace.col,
              },
            ];
          }

          return [spaceId, baseSpaceState];
        }),
      );

    const relations =
      analyzedBoard.layout === "hex"
        ? []
        : analyzedBoard.relations.map((relation) => ({
            id: relation.id ?? null,
            typeId: relation.typeId,
            fromSpaceId: relation.fromSpaceId,
            toSpaceId: relation.toSpaceId,
            directed: relation.directed ?? false,
            fields: materializeFields(
              analyzedBoard.relationFieldsSchema,
              analysis,
              relation.fields,
            ),
          }));

    const buildContainers = (runtimeBoardId: string) =>
      analyzedBoard.layout === "hex"
        ? {}
        : Object.fromEntries(
            analyzedBoard.containers.map((container) => {
              const containerId = container.id;
              return [
                containerId,
                {
                  id: containerId,
                  name: container.name ?? containerId,
                  host:
                    container.host.type === "space"
                      ? { type: "space", spaceId: container.host.spaceId }
                      : { type: "board" },
                  allowedCardSetIds: container.allowedCardSetIds,
                  zoneId: `board:${runtimeBoardId}:container:${containerId}`,
                  fields: materializeFields(
                    analyzedBoard.containerFieldsSchema,
                    analysis,
                    container.fields,
                    runtimeBoardId,
                  ),
                },
              ];
            }),
          );

    const edges =
      analyzedBoard.layout === "generic"
        ? []
        : analyzedBoard.edges.map((edge) => ({
            id: edge.id,
            spaceIds: [...edge.spaceIds],
            typeId: edge.typeId ?? null,
            label: edge.label ?? null,
            ownerId: null,
            fields: materializeFields(
              analyzedBoard.edgeFieldsSchema,
              analysis,
              edge.fields,
            ),
          }));

    const vertices =
      analyzedBoard.layout === "generic"
        ? []
        : analyzedBoard.vertices.map((vertex) => ({
            id: vertex.id,
            spaceIds: [...vertex.spaceIds],
            typeId: vertex.typeId ?? null,
            label: vertex.label ?? null,
            ownerId: null,
            fields: materializeFields(
              analyzedBoard.vertexFieldsSchema,
              analysis,
              vertex.fields,
            ),
          }));

    for (const runtimeBoardId of analyzedBoard.runtimeBoardIds) {
      const playerId =
        analyzedBoard.board.scope === "perPlayer"
          ? runtimeBoardId.slice(analyzedBoard.board.id.length + 1)
          : null;
      const boardState = {
        id: runtimeBoardId,
        ...sharedBoardState,
        playerId,
        spaces: cloneJson(buildSpaces()),
        relations: cloneJson(relations),
        containers: cloneJson(buildContainers(runtimeBoardId)),
        ...(analyzedBoard.layout === "hex"
          ? {
              orientation: analyzedBoard.board.orientation ?? "pointy",
              edges: cloneJson(edges),
              vertices: cloneJson(vertices),
            }
          : analyzedBoard.layout === "square"
            ? {
                edges: cloneJson(edges),
                vertices: cloneJson(vertices),
              }
            : {}),
      };

      boardStatesById[runtimeBoardId] = boardState;
      if (analyzedBoard.layout === "hex") {
        hexBoardStatesById[runtimeBoardId] = boardState;
      }
      if (analyzedBoard.layout === "square") {
        squareBoardStatesById[runtimeBoardId] = boardState;
      }
    }
  }

  const zones = Object.fromEntries(
    (manifest.zones ?? []).map((zone) => [
      zone.id,
      Object.fromEntries(
        (zone.scope === "shared" ? ["table"] : playerIds).map((hostId) => [
          hostId,
          [] as string[],
        ]),
      ),
    ]),
  );
  for (const [componentId, location] of Object.entries(componentLocations)) {
    if (location.type !== "InZone") continue;
    const ids = zones[String(location.zoneId)]?.[String(location.hostId)];
    if (!ids) throw new Error(`Missing zone host for '${componentId}'.`);
    ids.push(componentId);
  }
  const ownerOfCard = Object.fromEntries(
    Object.keys(cards).map((cardId) => [cardId, null]),
  );
  const visibility = Object.fromEntries(
    Object.keys(cards).map((cardId) => [cardId, { faceUp: true }]),
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
    boards: {
      byId: boardStatesById,
      hex: hexBoardStatesById,
      square: squareBoardStatesById,
      network: {},
      track: {},
    },
    dice,
  });
}
