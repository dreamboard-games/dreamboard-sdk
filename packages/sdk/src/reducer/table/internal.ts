import type { RuntimeComponentLocation, RuntimeTableRecord } from "../model";

export function ensureArray<T>(value: readonly T[] | T[] | undefined): T[] {
  return Array.isArray(value) ? [...value] : [];
}

function locationPosition(location: RuntimeComponentLocation): number {
  return "position" in location && typeof location.position === "number"
    ? location.position
    : Number.MAX_SAFE_INTEGER;
}

export function orderedComponentIdsForLocation(
  table: RuntimeTableRecord,
  predicate: (location: RuntimeComponentLocation) => boolean,
): string[] {
  return Object.entries(table.componentLocations)
    .filter(([, location]) => predicate(location))
    .sort(
      (left, right) => locationPosition(left[1]) - locationPosition(right[1]),
    )
    .map(([componentId]) => componentId);
}
