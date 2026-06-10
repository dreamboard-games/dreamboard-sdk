import type {
  PlayerIdOfTable,
  PlayerZoneIdOfTable,
  RuntimeComponentLocation,
  RuntimeTableRecord,
  SharedZoneIdOfTable,
} from "../model";
import type { PerPlayer, PlayerId } from "../per-player";
import { perPlayerGet, perPlayerSet } from "../per-player";

// Thin wrappers that preserve the existing "look up by player id" idiom used
// throughout this file. `hands`, `zones.perPlayer`, and `resources` are
// `PerPlayer<T>`-shaped at runtime (the ingress codec rejects anything else),
// so these helpers assume the wrapper is always present.
export function ppRead<Value>(
  value: PerPlayer<Value> | undefined,
  playerId: string,
): Value | undefined {
  if (value === undefined) return undefined;
  return perPlayerGet(value, playerId as PlayerId);
}

export function ppWrite<Value>(
  value: PerPlayer<Value> | undefined,
  playerId: string,
  next: Value,
): PerPlayer<Value> {
  const base: PerPlayer<Value> = value ?? { __perPlayer: true, entries: [] };
  return perPlayerSet(base, playerId as PlayerId, next);
}

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

function hasOwnKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isSharedZoneId(table: RuntimeTableRecord, zoneId: string): boolean {
  return (
    hasOwnKey(table.decks, zoneId) || hasOwnKey(table.zones.shared, zoneId)
  );
}

function isPlayerZoneId(table: RuntimeTableRecord, zoneId: string): boolean {
  return (
    hasOwnKey(table.hands, zoneId) ||
    hasOwnKey(table.zones.perPlayer, zoneId) ||
    hasOwnKey(table.handVisibility, zoneId)
  );
}

function zoneScopeForId(
  table: RuntimeTableRecord,
  zoneId: string,
): "shared" | "perPlayer" | null {
  if (isPlayerZoneId(table, zoneId)) {
    return "perPlayer";
  }
  if (isSharedZoneId(table, zoneId)) {
    return "shared";
  }
  return null;
}

export function assertZoneScope(
  table: RuntimeTableRecord,
  zoneId: string,
  expectedScope: "shared" | "perPlayer",
  operation: string,
  argumentName: string,
): void {
  const actualScope = zoneScopeForId(table, zoneId);
  if (actualScope === expectedScope) {
    return;
  }

  if (actualScope === null) {
    throw new Error(
      `Unknown zone '${zoneId}' passed as ${argumentName} to ${operation}.`,
    );
  }

  throw new Error(
    `Zone '${zoneId}' has scope '${actualScope}', but ${operation} requires ${argumentName} to be a ${expectedScope === "shared" ? "shared" : "perPlayer"} zone.`,
  );
}

export function syncSharedZoneWithDeck<
  Table extends RuntimeTableRecord,
  ZoneId extends SharedZoneIdOfTable<Table>,
>(table: Table, zoneId: ZoneId, nextCards: readonly string[]): void {
  table.decks[zoneId] = [...nextCards] as Table["decks"][ZoneId];
  table.zones.shared[zoneId] = [
    ...nextCards,
  ] as Table["zones"]["shared"][ZoneId];
}

export function syncPlayerZoneWithHand<
  Table extends RuntimeTableRecord,
  ZoneId extends PlayerZoneIdOfTable<Table>,
  PlayerId extends PlayerIdOfTable<Table>,
>(
  table: Table,
  zoneId: ZoneId,
  playerId: PlayerId,
  nextCards: readonly string[],
): void {
  table.hands[zoneId] = ppWrite(table.hands[zoneId], playerId as string, [
    ...nextCards,
  ]) as Table["hands"][ZoneId];
  table.zones.perPlayer[zoneId] = ppWrite(
    table.zones.perPlayer[zoneId],
    playerId as string,
    [...nextCards],
  ) as Table["zones"]["perPlayer"][ZoneId];
}
