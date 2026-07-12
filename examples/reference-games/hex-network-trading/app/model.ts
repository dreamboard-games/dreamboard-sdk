import {
  idGuards,
  literals,
  staticBoards,
  type EdgeId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";
import type { ResourceCounts } from "./game-contract";

export const BOARD_ID = "frontier" as const;

export type Terrain =
  | "pineForest"
  | "clayFlats"
  | "grainFields"
  | "barrens";

export type HexRule = {
  readonly terrain: Terrain;
  readonly number: number | null;
  readonly resourceId: ResourceId | null;
};

export const HEX_RULES: Readonly<Record<SpaceId, HexRule>> = {
  northForest: { terrain: "pineForest", number: 5, resourceId: "timber" },
  northEastClay: { terrain: "clayFlats", number: 6, resourceId: "brick" },
  southEastFields: {
    terrain: "grainFields",
    number: 8,
    resourceId: "provisions",
  },
  southForest: { terrain: "pineForest", number: 9, resourceId: "timber" },
  southWestClay: { terrain: "clayFlats", number: 4, resourceId: "brick" },
  northWestFields: {
    terrain: "grainFields",
    number: 10,
    resourceId: "provisions",
  },
  centralBarrens: { terrain: "barrens", number: null, resourceId: null },
};

export const RESOURCE_IDS = literals.resourceIds;
export const FRONTIER = staticBoards.byId.frontier;
export const INTERSECTION_IDS = FRONTIER.vertices.map((vertex) => vertex.id);
export const EDGE_IDS = FRONTIER.edges.map((edge) => edge.id);

if (
  Object.keys(FRONTIER.spaces).length !== 7 ||
  INTERSECTION_IDS.length !== 24 ||
  EDGE_IDS.length !== 30
) {
  throw new Error(
    "Stormtrail topology must contain 7 hexes, 24 intersections, and 30 edges.",
  );
}

export const INTERSECTIONS_BY_HEX_ID = Object.fromEntries(
  literals.spaceIds.map((hexId) => [
    hexId,
    FRONTIER.vertices
      .filter((vertex) => vertex.spaceIds.includes(hexId))
      .map((vertex) => vertex.id),
  ]),
) as unknown as Record<SpaceId, readonly VertexId[]>;

export const INTERSECTION_HEX_IDS = Object.fromEntries(
  FRONTIER.vertices.map((vertex) => [
    vertex.id,
    [...new Set(vertex.spaceIds)].filter(idGuards.isSpaceId),
  ]),
) as unknown as Record<VertexId, readonly SpaceId[]>;

function endpointsForEdge(edgeId: EdgeId): readonly [VertexId, VertexId] {
  const [left, right] = edgeId.replace("hex-edge:", "").split("::");
  if (!left || !right) {
    throw new Error(`Invalid Stormtrail edge id '${edgeId}'.`);
  }
  return [
    idGuards.expectVertexId(`hex-vertex:${left}`),
    idGuards.expectVertexId(`hex-vertex:${right}`),
  ];
}

export const EDGE_INTERSECTION_IDS = Object.fromEntries(
  EDGE_IDS.map((edgeId) => [edgeId, endpointsForEdge(edgeId)]),
) as Record<EdgeId, readonly [VertexId, VertexId]>;

export const EDGES_BY_INTERSECTION_ID = Object.fromEntries(
  INTERSECTION_IDS.map((intersectionId) => [
    intersectionId,
    EDGE_IDS.filter((edgeId) =>
      EDGE_INTERSECTION_IDS[edgeId].includes(intersectionId),
    ),
  ]),
) as unknown as Record<VertexId, readonly EdgeId[]>;

export function edgeTouchesIntersection(
  edgeId: EdgeId,
  intersectionId: VertexId,
): boolean {
  return EDGE_INTERSECTION_IDS[edgeId].includes(intersectionId);
}

export function producingHexesAtIntersection(
  intersectionId: VertexId,
): readonly { readonly hexId: SpaceId; readonly resourceId: ResourceId }[] {
  return INTERSECTION_HEX_IDS[intersectionId].flatMap((hexId) => {
    const resourceId = HEX_RULES[hexId].resourceId;
    return resourceId ? [{ hexId, resourceId }] : [];
  });
}

export function resourceTotal(resources: Readonly<ResourceCounts>): number {
  return Object.values(resources).reduce(
    (total, count) => total + (count ?? 0),
    0,
  );
}

export function hasPositiveResource(resources: Readonly<ResourceCounts>): boolean {
  return Object.values(resources).some((count) => (count ?? 0) > 0);
}

export function resourceMapsOverlap(
  left: Readonly<ResourceCounts>,
  right: Readonly<ResourceCounts>,
): boolean {
  return RESOURCE_IDS.some(
    (resourceId) =>
      (left[resourceId] ?? 0) > 0 && (right[resourceId] ?? 0) > 0,
  );
}
