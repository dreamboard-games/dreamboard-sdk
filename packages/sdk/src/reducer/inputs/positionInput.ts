import {
  isPositionTarget,
  PositionTargetSchema,
  zonePositions,
  type PositionTarget,
} from "../../shared/position-target.js";
import { resolveZoneAccess } from "../table/zones";
import type { CollectorState, InputCollector } from "../model/spec";
import type { ZoneDefinitions } from "../model/table";

type ZoneSize = {
  readonly zoneId: string;
  readonly hostId: string;
  readonly size: number;
};

/**
 * `positionInput` collects an insertion point in one of the given zones, in
 * each host the player may reach: their own, shared ones and public ones.
 * Pair it with a card input and `tx.moveComponentToPosition` to reorder a
 * hand or place a card at a chosen depth.
 */
export function positionInput<
  State extends CollectorState = CollectorState,
  const ZoneIds extends readonly string[] = readonly string[],
>(options: {
  zones: ZoneIds;
  definitions: ZoneDefinitions;
}): InputCollector<
  typeof PositionTargetSchema,
  State,
  "position",
  PositionTarget<ZoneIds[number]>
> & { readonly meta: { readonly zoneIds: ZoneIds } } {
  const { zones: zoneIds, definitions } = options;
  const sizes = (
    state: CollectorState,
    playerId: string,
    q: unknown,
  ): ZoneSize[] => {
    // The compiled query owner admits authored zone IDs; hosts come from state.
    const zones = (q as { zones(zoneId: string): Record<string, string[]> })
      .zones;
    return zoneIds.flatMap((zoneId) =>
      Object.entries(zones(zoneId)).flatMap(([hostId, ids]) =>
        resolveZoneAccess(
          state.table,
          definitions,
          definitions.zoneDefinitions[zoneId],
          hostId,
          playerId,
        )
          ? [{ zoneId, hostId, size: ids.length }]
          : [],
      ),
    );
  };
  return {
    kind: "position",
    schema: PositionTargetSchema,
    eligibleTargets: (state, playerId, q) =>
      zonePositions(sizes(state, playerId, q)),
    validateTarget: (state, playerId, q, target) =>
      isPositionTarget(target) &&
      sizes(state, playerId, q).some(
        (zone) =>
          zone.zoneId === target.zoneId &&
          zone.hostId === target.hostId &&
          target.index <= zone.size,
      )
        ? null
        : {
            errorCode: "POSITION_NOT_ELIGIBLE",
            message: "Position is not eligible.",
          },
    domain: (state, playerId, q) => ({
      type: "zonePosition" as const,
      zones: sizes(state, playerId, q),
    }),
    meta: { zoneIds },
  };
}
