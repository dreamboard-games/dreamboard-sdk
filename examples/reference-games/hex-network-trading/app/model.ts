import { createTableQueries } from "@dreamboard-games/sdk/reducer";
import {
  literals,
  manifestContract,
  staticBoards,
  type EdgeId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "./manifest";
import type { ResourceCounts } from "./game-model";

export const BOARD_ID = "frontier" as const;

export type Terrain = "pineForest" | "clayFlats" | "grainFields" | "barrens";

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
export const FRONTIER_GEOMETRY = createTableQueries(
  manifestContract.createInitialTable(),
).board(BOARD_ID);
export const INTERSECTION_IDS = FRONTIER_GEOMETRY.vertices.map(
  (vertex) => vertex.id,
);
export const EDGE_IDS = FRONTIER_GEOMETRY.edges.map((edge) => edge.id);

if (
  Object.keys(FRONTIER.spaces).length !== 7 ||
  INTERSECTION_IDS.length !== 24 ||
  EDGE_IDS.length !== 30
) {
  throw new Error(
    "Stormtrail topology must contain 7 hexes, 24 intersections, and 30 edges.",
  );
}

export function edgeTouchesIntersection(
  edgeId: EdgeId,
  intersectionId: VertexId,
): boolean {
  return FRONTIER_GEOMETRY.verticesOf(edgeId).includes(intersectionId);
}

export function producingHexesAtIntersection(
  intersectionId: VertexId,
): readonly { readonly hexId: SpaceId; readonly resourceId: ResourceId }[] {
  return FRONTIER_GEOMETRY.spacesAt(intersectionId).flatMap((hexId) => {
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

export function hasPositiveResource(
  resources: Readonly<ResourceCounts>,
): boolean {
  return Object.values(resources).some((count) => (count ?? 0) > 0);
}

export function resourceMapsOverlap(
  left: Readonly<ResourceCounts>,
  right: Readonly<ResourceCounts>,
): boolean {
  return RESOURCE_IDS.some(
    (resourceId) => (left[resourceId] ?? 0) > 0 && (right[resourceId] ?? 0) > 0,
  );
}
