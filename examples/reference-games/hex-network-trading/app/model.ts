import type { Q } from "./reducer-support";
import {
  literals,
  type EdgeId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "./manifest";
import type { ResourceCounts } from "./game-model";

export const BOARD_ID = "frontier" as const;

export type Terrain = "pineForest" | "clayFlats" | "grainFields" | "barrens";

export const RESOURCE_IDS = literals.resourceIds;
export function edgeTouchesIntersection(
  q: Q,
  edgeId: EdgeId,
  intersectionId: VertexId,
): boolean {
  return q.board(BOARD_ID).verticesOf(edgeId).includes(intersectionId);
}

export function producingHexesAtIntersection(
  q: Q,
  intersectionId: VertexId,
): readonly { readonly hexId: SpaceId; readonly resourceId: ResourceId }[] {
  return q
    .board(BOARD_ID)
    .spacesAt(intersectionId)
    .flatMap((hexId) => {
      const resourceId = q.board(BOARD_ID).space(hexId).fields.resourceId;
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
