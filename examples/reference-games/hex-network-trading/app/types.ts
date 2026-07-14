import type {
  PlayerId,
  ResourceId,
  SpaceId,
} from "../shared/manifest-contract";

export type ProductionGrant = {
  readonly playerId: PlayerId;
  readonly resourceId: ResourceId;
  readonly count: number;
  readonly hexId: SpaceId;
};
