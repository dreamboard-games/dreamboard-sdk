import type { SpaceId } from "../shared/manifest-contract";

export const charge = {
  actor: { seat: 0 },
  interactionId: "charge",
  params: {},
} as const;

export const reinforce = {
  actor: { seat: 0 },
  interactionId: "reinforce",
  params: {},
} as const;

export function repair(beaconId: SpaceId) {
  return {
    actor: { seat: 0 },
    interactionId: "repairBeacon",
    params: { beaconId },
  } as const;
}
