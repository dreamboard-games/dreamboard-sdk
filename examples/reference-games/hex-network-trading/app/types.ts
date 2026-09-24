import type { PlayerId, ResourceId, SpaceId } from "./manifest";

export type ProductionGrant = {
  readonly playerId: PlayerId;
  readonly resourceId: ResourceId;
  readonly count: number;
  readonly hexId: SpaceId;
};
