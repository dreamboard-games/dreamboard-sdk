import type {
  BoardEdgeRef,
  BoardContainerSpec,
  BoardCard,
  BoardRelationSpec,
  BoardSpec,
  BoardSpaceSpec,
  BoardTemplateSpec,
  BoardVertexRef,
  GameTopologyManifest,
  GenericBoardSpec,
  GenericBoardTemplateSpec,
  HexBoardSpec,
  HexEdgeRef,
  HexSpaceSpec,
  HexVertexRef,
  DieSeedSpec,
  ManualCardSetDefinition,
  ObjectSchema,
  PieceSeedSpec,
  PropertySchema,
  SquareBoardSpec,
  SquareBoardTemplateSpec,
  SquareEdgeSpec,
  SquareSpaceSpec,
  SquareVertexSpec,
  ZoneSpec,
} from "@dreamboard-games/sdk-types";

import { createHexBoardGeometry, resolveHexSpaces } from "./hex-board.js";

import {
  addStandardDecksIfNeeded,
  materializeCardSet,
} from "./preset-card-sets.js";

import { validateManifestAuthoring } from "./manifest-validation.js";

interface AnalyzedGenericBoard {
  layout: "generic";
  board: GenericBoardSpec;
  template?: GenericBoardTemplateSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: ObjectSchema | null;
  spaceFieldsSchema?: ObjectSchema | null;
  relationFieldsSchema?: ObjectSchema | null;
  containerFieldsSchema?: ObjectSchema | null;
  spaces: BoardSpaceSpec[];
  relations: BoardRelationSpec[];
  containers: BoardContainerSpec[];
}

interface AnalyzedHexBoard {
  layout: "hex";
  board: HexBoardSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: ObjectSchema | null;
  spaceFieldsSchema?: ObjectSchema | null;
  edgeFieldsSchema?: ObjectSchema | null;
  vertexFieldsSchema?: ObjectSchema | null;
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
  template?: SquareBoardTemplateSpec;
  boardTypeId?: string | null;
  runtimeBoardIds: string[];
  boardFieldsSchema?: ObjectSchema | null;
  spaceFieldsSchema?: ObjectSchema | null;
  relationFieldsSchema?: ObjectSchema | null;
  containerFieldsSchema?: ObjectSchema | null;
  edgeFieldsSchema?: ObjectSchema | null;
  vertexFieldsSchema?: ObjectSchema | null;
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
  | AnalyzedGenericBoard
  | AnalyzedHexBoard
  | AnalyzedSquareBoard;

interface ManifestAnalysis {
  manifest: GameTopologyManifest;
  playerIds: string[];
  sharedZones: ZoneSpec[];
  playerZones: ZoneSpec[];
  zoneIds: string[];
  cardSets: ManualCardSetDefinition[];
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
  zoneVisibilityById: Map<string, string>;
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
  boardTemplateIds: string[];
  boardBaseIds: string[];
  boardIds: string[];
  boardContainerIds: string[];
  boardTypeIds: string[];
  boardLayoutById: Map<string, string>;
  boardIdsByLayout: Map<string, string[]>;
  boardBaseIdsByLayout: Map<string, string[]>;
  boardIdsByBaseId: Map<string, string[]>;
  boardBaseIdsByTemplateId: Map<string, string[]>;
  boardTemplateLayoutById: Map<string, string>;
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
  pieceTypeSchemasById: Map<string, ObjectSchema | null | undefined>;
  dieTypeSchemasById: Map<string, ObjectSchema | null | undefined>;
}

type CardPropertySchemaVariants = {
  shared?: Record<string, PropertySchema>;
  variants: Record<string, ObjectSchema>;
};

type CardPropertySchema = ObjectSchema | CardPropertySchemaVariants;

function isCardPropertySchemaVariants(
  schema: CardPropertySchema | null | undefined,
): schema is CardPropertySchemaVariants {
  return Boolean(schema && "variants" in schema);
}

function mergeSharedCardProperties(
  schema: CardPropertySchemaVariants,
  cardType: string,
): ObjectSchema | null {
  const variant = schema.variants[cardType];
  if (!variant) {
    return null;
  }
  return {
    properties: {
      ...(schema.shared ?? {}),
      ...variant.properties,
    },
  };
}

function hasPropertySchemaDefault(
  property: PropertySchema | null | undefined,
): property is PropertySchema & { default: unknown } {
  return Boolean(property && "default" in property);
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
      (_, index) => `${card.type}-${index + 1}`,
    );
  }
  return [card.type];
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

function isSquareBoardTemplateSpec(
  boardTemplate: BoardTemplateSpec,
): boardTemplate is SquareBoardTemplateSpec {
  return boardTemplate.layout === "square";
}

function isGenericBoardTemplateSpec(
  boardTemplate: BoardTemplateSpec,
): boardTemplate is GenericBoardTemplateSpec {
  return boardTemplate.layout === "generic";
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

function mergeBoardSpaces(
  templateSpaces: readonly BoardSpaceSpec[],
  boardSpaces: readonly BoardSpaceSpec[],
): BoardSpaceSpec[] {
  return Array.from(
    [...templateSpaces, ...boardSpaces]
      .reduce<Map<string, BoardSpaceSpec>>((accumulator, space) => {
        accumulator.set(space.id, space);
        return accumulator;
      }, new Map<string, BoardSpaceSpec>())
      .values(),
  ).sort((left, right) => left.id.localeCompare(right.id));
}

function mergeBoardContainers(
  templateContainers: readonly BoardContainerSpec[],
  boardContainers: readonly BoardContainerSpec[],
): BoardContainerSpec[] {
  return Array.from(
    [...templateContainers, ...boardContainers]
      .reduce<Map<string, BoardContainerSpec>>((accumulator, container) => {
        accumulator.set(container.id, container);
        return accumulator;
      }, new Map<string, BoardContainerSpec>())
      .values(),
  ).sort((left, right) => left.id.localeCompare(right.id));
}

function resolveAuthoredHexEdges(
  board: HexBoardSpec,
  geometry: ReturnType<typeof createHexBoardGeometry>,
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
  geometry: ReturnType<typeof createHexBoardGeometry>,
): AnalyzedHexBoard["authoredVertices"] {
  return (board.vertices ?? []).map((vertex) => ({
    ...vertex,
    id:
      "spaces" in vertex.ref
        ? geometry.vertex(...vertex.ref.spaces)
        : geometry.vertexAt(vertex.ref.space, vertex.ref.corner),
  }));
}

function resolveSquareSpaces(
  board: SquareBoardSpec,
  template: SquareBoardTemplateSpec | undefined,
): SquareSpaceSpec[] {
  if (!template) {
    return [...(board.spaces ?? [])].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  const templateSpacesById = new Map(
    (template.spaces ?? []).map((space) => [space.id, space] as const),
  );
  const overridesById = new Map(
    (board.spaces ?? []).map((space) => [space.id, space] as const),
  );
  for (const overrideId of overridesById.keys()) {
    if (!templateSpacesById.has(overrideId)) {
      throw new Error(
        `Square board '${board.id}' overrides unknown space '${overrideId}' from template '${template.id}'.`,
      );
    }
  }

  return (template.spaces ?? [])
    .map((templateSpace) => {
      const override = overridesById.get(templateSpace.id);
      if (!override) {
        return templateSpace;
      }
      const templateMatch = templateSpacesById.get(override.id);
      if (!templateMatch) {
        throw new Error(
          `Square board '${board.id}' overrides unknown space '${override.id}' from template '${template.id}'.`,
        );
      }
      if (
        templateMatch.row !== override.row ||
        templateMatch.col !== override.col
      ) {
        throw new Error(
          `Square board '${board.id}' cannot change coordinates for space '${override.id}' from template '${template.id}'.`,
        );
      }
      return {
        ...templateSpace,
        ...override,
        id: templateSpace.id,
        row: templateSpace.row,
        col: templateSpace.col,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
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
      fields:
        (spec.fields as Record<string, unknown> | null | undefined) ?? null,
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
      fields:
        (spec.fields as Record<string, unknown> | null | undefined) ?? null,
    });
  }
  return metadataByKey;
}

function resolveSquareEdges(
  board: SquareBoardSpec,
  template: SquareBoardTemplateSpec | undefined,
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexEdge[] {
  const spacesById = new Map(spaces.map((space) => [space.id, space] as const));
  const derived = deriveSquareEdges(spaces);
  const edgesByGeometryKey = new Map(
    derived.map((edge) => [edge.geometryKey, edge] as const),
  );
  const templateMetadata = template
    ? indexSquareEdgeMetadata(
        template.edges ?? [],
        spacesById,
        `Square board template '${template.id}'`,
      )
    : new Map();
  const overrideMetadata = indexSquareEdgeMetadata(
    board.edges ?? [],
    spacesById,
    `Square board '${board.id}'`,
  );

  if (template) {
    for (const overrideKey of overrideMetadata.keys()) {
      if (!templateMetadata.has(overrideKey)) {
        throw new Error(
          `Square board '${board.id}' overrides unknown edge ref from template '${template.id}'.`,
        );
      }
    }
  }

  const mergedMetadata = template
    ? new Map(
        [...templateMetadata.entries()].map(([key, metadata]) => [
          key,
          {
            ...metadata,
            ...(overrideMetadata.get(key) ?? {}),
            geometryKey: key,
          },
        ]),
      )
    : overrideMetadata;

  for (const [geometryKey, metadata] of mergedMetadata.entries()) {
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
  template: SquareBoardTemplateSpec | undefined,
  spaces: readonly SquareSpaceSpec[],
): ResolvedHexVertex[] {
  const spacesById = new Map(spaces.map((space) => [space.id, space] as const));
  const derived = deriveSquareVertices(spaces);
  const verticesByGeometryKey = new Map(
    derived.map((vertex) => [vertex.geometryKey, vertex] as const),
  );
  const templateMetadata = template
    ? indexSquareVertexMetadata(
        template.vertices ?? [],
        spacesById,
        `Square board template '${template.id}'`,
      )
    : new Map();
  const overrideMetadata = indexSquareVertexMetadata(
    board.vertices ?? [],
    spacesById,
    `Square board '${board.id}'`,
  );

  if (template) {
    for (const overrideKey of overrideMetadata.keys()) {
      if (!templateMetadata.has(overrideKey)) {
        throw new Error(
          `Square board '${board.id}' overrides unknown vertex ref from template '${template.id}'.`,
        );
      }
    }
  }

  const mergedMetadata = template
    ? new Map(
        [...templateMetadata.entries()].map(([key, metadata]) => [
          key,
          {
            ...metadata,
            ...(overrideMetadata.get(key) ?? {}),
            geometryKey: key,
          },
        ]),
      )
    : overrideMetadata;

  for (const [geometryKey, metadata] of mergedMetadata.entries()) {
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
  const boardTemplates = manifest.boardTemplates ?? [];
  const genericTemplateById = new Map(
    boardTemplates
      .filter(isGenericBoardTemplateSpec)
      .map((boardTemplate) => [boardTemplate.id, boardTemplate] as const),
  );
  const squareTemplateById = new Map(
    boardTemplates
      .filter(isSquareBoardTemplateSpec)
      .map((boardTemplate) => [boardTemplate.id, boardTemplate] as const),
  );

  return (manifest.boards ?? []).map((board): AnalyzedBoard => {
    const runtimeBoardIds =
      board.scope === "perPlayer"
        ? playerIds.map((playerId) => `${board.id}:${playerId}`)
        : [board.id];

    if (isHexBoardSpec(board)) {
      const spaces = resolveHexSpaces(board);
      const geometry = createHexBoardGeometry({ ...board, spaces });
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
          ...authoredEdges.find((authored) => authored.id === edge.id),
        })),
        vertices: geometry.vertices.map((vertex) => ({
          ...vertex,
          ...authoredVertices.find((authored) => authored.id === vertex.id),
        })),
      };
    }

    if (isSquareBoardSpec(board)) {
      const squareBoard = board;
      const template = board.templateId
        ? squareTemplateById.get(board.templateId)
        : undefined;
      const spaces = resolveSquareSpaces(squareBoard, template);
      return {
        layout: "square",
        board: squareBoard,
        template,
        boardTypeId: squareBoard.typeId ?? template?.typeId,
        runtimeBoardIds,
        boardFieldsSchema:
          squareBoard.boardFieldsSchema ?? template?.boardFieldsSchema,
        spaceFieldsSchema:
          squareBoard.spaceFieldsSchema ?? template?.spaceFieldsSchema,
        relationFieldsSchema:
          squareBoard.relationFieldsSchema ?? template?.relationFieldsSchema,
        containerFieldsSchema:
          squareBoard.containerFieldsSchema ?? template?.containerFieldsSchema,
        edgeFieldsSchema:
          squareBoard.edgeFieldsSchema ?? template?.edgeFieldsSchema,
        vertexFieldsSchema:
          squareBoard.vertexFieldsSchema ?? template?.vertexFieldsSchema,
        spaces,
        relations: [
          ...(template?.relations ?? []),
          ...(squareBoard.relations ?? []),
        ],
        containers: mergeBoardContainers(
          template?.containers ?? [],
          squareBoard.containers ?? [],
        ),
        edges: resolveSquareEdges(squareBoard, template, spaces),
        vertices: resolveSquareVertices(squareBoard, template, spaces),
      };
    }

    const genericBoard = board;
    const template = board.templateId
      ? genericTemplateById.get(board.templateId)
      : undefined;
    return {
      layout: "generic",
      board: genericBoard,
      template,
      boardTypeId: genericBoard.typeId ?? template?.typeId,
      runtimeBoardIds,
      boardFieldsSchema:
        genericBoard.boardFieldsSchema ?? template?.boardFieldsSchema,
      spaceFieldsSchema:
        genericBoard.spaceFieldsSchema ?? template?.spaceFieldsSchema,
      relationFieldsSchema:
        genericBoard.relationFieldsSchema ?? template?.relationFieldsSchema,
      containerFieldsSchema:
        genericBoard.containerFieldsSchema ?? template?.containerFieldsSchema,
      spaces: mergeBoardSpaces(
        template?.spaces ?? [],
        genericBoard.spaces ?? [],
      ),
      relations: [
        ...(template?.relations ?? []),
        ...(genericBoard.relations ?? []),
      ],
      containers: mergeBoardContainers(
        template?.containers ?? [],
        genericBoard.containers ?? [],
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
  inputManifest: GameTopologyManifest,
  runtimePlayerIds?: readonly string[],
): ManifestAnalysis {
  const manifest = addStandardDecksIfNeeded(inputManifest);
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
  const cardSets = manifest.cardSets.map(materializeCardSet);
  const cardSetIds = dedupeSorted(cardSets.map((cardSet) => cardSet.id));
  const cardTypes = dedupeSorted(
    cardSets.flatMap((cardSet) => cardSet.cards.map((card) => card.type)),
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
        cardTypeByCardId.set(cardId, card.cardType ?? card.type);
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
      const zoneIds = homeSharedZoneIdsByCardType.get(card.type) ?? [];
      zoneIds.push(card.home.zoneId);
      homeSharedZoneIdsByCardType.set(card.type, zoneIds);
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

  const zoneVisibilityById = new Map<string, string>(
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
  const boardTemplateIds = dedupeSorted(
    (manifest.boardTemplates ?? []).map((boardTemplate) => boardTemplate.id),
  );
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
  const boardBaseIdsByTemplateId = new Map<string, string[]>();
  const boardTemplateLayoutById = new Map<string, string>();
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
  for (const boardTemplate of manifest.boardTemplates ?? []) {
    boardTemplateLayoutById.set(boardTemplate.id, boardTemplate.layout);
    boardBaseIdsByLayout.set(
      boardTemplate.layout,
      dedupeSorted([...(boardBaseIdsByLayout.get(boardTemplate.layout) ?? [])]),
    );
  }
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
    if (
      analyzedBoard.board.layout !== "hex" &&
      analyzedBoard.board.templateId
    ) {
      boardBaseIdsByTemplateId.set(
        analyzedBoard.board.templateId,
        dedupeSorted([
          ...(boardBaseIdsByTemplateId.get(analyzedBoard.board.templateId) ??
            []),
          analyzedBoard.board.id,
        ]),
      );
    }
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
    boardTemplateIds,
    boardBaseIds,
    boardIds,
    boardContainerIds,
    boardTypeIds,
    boardLayoutById,
    boardIdsByLayout,
    boardBaseIdsByLayout,
    boardIdsByBaseId,
    boardBaseIdsByTemplateId,
    boardTemplateLayoutById,
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

function materializePropertySchemaDefault(
  property: PropertySchema,
  analysis: ManifestAnalysis,
  runtimeBoardId?: string,
): unknown {
  if (hasPropertySchemaDefault(property)) {
    return cloneJson(property.default);
  }
  if (property.optional) {
    return undefined;
  }
  if (property.nullable) {
    return null;
  }

  switch (property.type) {
    case "string":
      return "";
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return property.enums?.[0] ?? "";
    case "array":
      return [];
    case "object":
      return materializeObjectSchemaDefaults(
        property.properties ? { properties: property.properties } : undefined,
        analysis,
        runtimeBoardId,
      );
    case "record":
      return {};
    case "zoneId":
      return analysis.zoneIds[0] ?? "";
    case "cardId":
      return analysis.cardIds[0] ?? "";
    case "playerId":
      return analysis.playerIds[0] ?? "";
    case "boardId":
      return runtimeBoardId ?? analysis.boardIds[0] ?? "";
    case "edgeId":
      return analysis.edgeIds[0] ?? "";
    case "vertexId":
      return analysis.vertexIds[0] ?? "";
    case "spaceId":
      return (
        (runtimeBoardId
          ? analysis.spaceIdsByBoardId.get(runtimeBoardId)?.[0]
          : undefined) ??
        analysis.spaceIds[0] ??
        ""
      );
    case "pieceId":
      return analysis.pieceIds[0] ?? "";
    case "dieId":
      return analysis.dieIds[0] ?? "";
    case "resourceId":
      return analysis.resourceIds[0] ?? "";
  }
}

function materializeObjectSchemaDefaults(
  schema: ObjectSchema | null | undefined,
  analysis: ManifestAnalysis,
  runtimeBoardId?: string,
): Record<string, unknown> {
  if (!schema?.properties) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(schema.properties).flatMap(([key, property]) => {
      const value = materializePropertySchemaDefault(
        property,
        analysis,
        runtimeBoardId,
      );
      return value === undefined ? [] : [[key, value]];
    }),
  );
}

function materializeCardPropertiesDefaults(
  schema: CardPropertySchema | null | undefined,
  cardType: string,
  analysis: ManifestAnalysis,
): Record<string, unknown> {
  const objectSchema = isCardPropertySchemaVariants(schema)
    ? mergeSharedCardProperties(schema, cardType)
    : schema;
  return materializeObjectSchemaDefaults(objectSchema, analysis);
}

export function materializeManifestTable(options: {
  manifest: GameTopologyManifest;
  playerIds: readonly string[];
  shuffleItems: <Value>(values: readonly Value[]) => Value[];
}): Record<string, unknown> {
  const validation = validateManifestAuthoring(options.manifest);
  if (validation.errors.length > 0) {
    throw new Error(
      `Cannot materialize invalid topology manifest:\n${validation.errors.join("\n")}`,
    );
  }

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
        type: "InDeck",
        deckId: home.zoneId,
        playedBy: null,
        position: nextLocationPosition({
          type: "InDeck",
          deckId: home.zoneId,
          playedBy: null,
        }),
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
    const materializedCardSet = materializeCardSet(cardSet);
    for (const [cardIndex, card] of materializedCardSet.cards.entries()) {
      const cardInstanceIds = renderCardInstanceIds(card);
      for (const [instanceIndex, cardId] of cardInstanceIds.entries()) {
        cards[cardId] = {
          id: cardId,
          cardSetId: materializedCardSet.id,
          cardType: card.type,
          name: card.name,
          text: card.text,
          properties: {
            ...materializeCardPropertiesDefaults(
              materializedCardSet.cardSchema,
              card.type,
              analysis,
            ),
            ...(card.properties ?? {}),
          },
        };
        const resolvedHome = card.home ?? materializedCardSet.defaultHome;
        const path =
          card.home === undefined
            ? `manifest.cardSets[${cardSetIndex}].defaultHome`
            : `manifest.cardSets[${cardSetIndex}].cards[${cardIndex}].home`;
        componentLocations[cardId] = materializeComponentLocation(
          resolvedHome,
          {
            path,
            label: `Card '${card.type}' instance ${instanceIndex + 1}`,
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
          type: "InHand",
          handId: home.zoneId,
          playerId: ownerId,
          position: nextLocationPosition({
            type: "InHand",
            handId: home.zoneId,
            playerId: ownerId,
          }),
        };
        return;
      }

      componentLocations[componentId] = {
        type: "InZone",
        zoneId: home.zoneId,
        playedBy: null,
        position: nextLocationPosition({
          type: "InZone",
          zoneId: home.zoneId,
        }),
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
        properties: {
          ...materializeObjectSchemaDefaults(
            analysis.pieceTypeSchemasById.get(seed.typeId),
            analysis,
          ),
          ...(seed.fields ?? {}),
        },
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
        properties: {
          ...materializeObjectSchemaDefaults(
            analysis.dieTypeSchemasById.get(seed.typeId),
            analysis,
          ),
          ...(seed.fields ?? {}),
        },
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
      templateId:
        analyzedBoard.board.layout === "hex"
          ? null
          : (analyzedBoard.board.templateId ?? null),
      fields: {
        ...materializeObjectSchemaDefaults(
          analyzedBoard.boardFieldsSchema,
          analysis,
        ),
        ...(analyzedBoard.board.fields ?? {}),
      },
    };

    const buildSpaces = () =>
      Object.fromEntries(
        analyzedBoard.spaces.map((space) => {
          const spaceId = space.id;
          const baseSpaceState = {
            id: spaceId,
            name: "name" in space ? (space.name ?? null) : null,
            typeId: space?.typeId ?? null,
            fields: {
              ...materializeObjectSchemaDefaults(
                analyzedBoard.spaceFieldsSchema,
                analysis,
              ),
              ...(space.fields ?? {}),
            },
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
            fields: {
              ...materializeObjectSchemaDefaults(
                analyzedBoard.relationFieldsSchema,
                analysis,
              ),
              ...(relation.fields ?? {}),
            },
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
                  fields: {
                    ...materializeObjectSchemaDefaults(
                      analyzedBoard.containerFieldsSchema,
                      analysis,
                      runtimeBoardId,
                    ),
                    ...(container.fields ?? {}),
                  },
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
            fields: {
              ...materializeObjectSchemaDefaults(
                analyzedBoard.edgeFieldsSchema,
                analysis,
              ),
              ...(edge.fields ?? {}),
            },
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
            fields: {
              ...materializeObjectSchemaDefaults(
                analyzedBoard.vertexFieldsSchema,
                analysis,
              ),
              ...(vertex.fields ?? {}),
            },
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

  const sharedZones = Object.fromEntries(
    analysis.sharedZones.map((zone) => [zone.id, [] as string[]]),
  );
  const perPlayerZones = Object.fromEntries(
    analysis.playerZones.map((zone) => [
      zone.id,
      Object.fromEntries(
        playerIds.map((playerId) => [playerId, [] as string[]]),
      ),
    ]),
  );
  const zoneVisibility = Object.fromEntries(
    (manifest.zones ?? []).map((zone) => [
      zone.id,
      zone.visibility ?? "public",
    ]),
  );
  const zoneCardSetIdsByZoneId = Object.fromEntries(
    Array.from(analysis.zoneCardSetIdsById.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const handVisibility = Object.fromEntries(
    analysis.playerZones.map((zone) => [
      zone.id,
      zone.visibility ?? "ownerOnly",
    ]),
  );
  const componentSortPosition = (position: unknown) =>
    typeof position === "number" ? position : Number.MAX_SAFE_INTEGER;
  const pushSharedComponent = (zoneId: string, componentId: string) => {
    const zone = sharedZones[zoneId];
    if (!zone) {
      return;
    }
    zone.push(componentId);
    zone.sort(
      (left, right) =>
        componentSortPosition(componentLocations[left]?.position) -
        componentSortPosition(componentLocations[right]?.position),
    );
  };
  const pushPlayerComponent = (
    zoneId: string,
    playerId: string,
    componentId: string,
  ) => {
    const zone = perPlayerZones[zoneId]?.[playerId];
    if (!zone) {
      return;
    }
    zone.push(componentId);
    zone.sort(
      (left, right) =>
        componentSortPosition(componentLocations[left]?.position) -
        componentSortPosition(componentLocations[right]?.position),
    );
  };

  for (const [componentId, location] of Object.entries(componentLocations)) {
    switch (location.type) {
      case "InDeck":
        pushSharedComponent(location.deckId as string, componentId);
        break;
      case "InHand":
        pushPlayerComponent(
          location.handId as string,
          location.playerId as string,
          componentId,
        );
        break;
      case "InZone":
        pushSharedComponent(location.zoneId as string, componentId);
        break;
      default:
        break;
    }
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
    zones: {
      shared: sharedZones,
      perPlayer: perPlayerZones,
      visibility: zoneVisibility,
      cardSetIdsByZoneId: zoneCardSetIdsByZoneId,
    },
    decks: cloneJson(sharedZones),
    hands: cloneJson(perPlayerZones),
    handVisibility,
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
