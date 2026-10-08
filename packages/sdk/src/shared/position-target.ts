import * as z from "zod";

/**
 * An insertion point in one zone host's order. `index` counts the
 * components there now: 0 is before the first, the zone's size after the
 * last. Moving a component within its own zone, both points beside it leave
 * it where it is.
 */
export type PositionTarget<
  ZoneId extends string = string,
  HostId extends string = string,
> = {
  readonly zoneId: ZoneId;
  readonly hostId: HostId;
  readonly index: number;
};

export const PositionTargetSchema = z.strictObject({
  zoneId: z.string(),
  hostId: z.string(),
  index: z.number().int().nonnegative(),
});

export function isPositionTarget(value: unknown): value is PositionTarget {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 3 &&
    "zoneId" in value &&
    typeof value.zoneId === "string" &&
    "hostId" in value &&
    typeof value.hostId === "string" &&
    "index" in value &&
    Number.isSafeInteger(value.index) &&
    (value.index as number) >= 0
  );
}

export function samePositionTarget(
  left: PositionTarget,
  right: PositionTarget,
): boolean {
  return (
    left.zoneId === right.zoneId &&
    left.hostId === right.hostId &&
    left.index === right.index
  );
}

/** Every insertion point in the given zone hosts, in zone order. */
export function zonePositions(
  zones: readonly {
    readonly zoneId: string;
    readonly hostId: string;
    readonly size: number;
  }[],
): PositionTarget[] {
  return zones.flatMap(({ zoneId, hostId, size }) =>
    Array.from({ length: size + 1 }, (_, index) => ({ zoneId, hostId, index })),
  );
}
