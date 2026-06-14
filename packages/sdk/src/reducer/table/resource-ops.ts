import type {
  PlayerIdOfTable,
  ResourceBalancesOfTable,
  RuntimeRecord,
  RuntimeTableRecord,
} from "../model";
import type { PerPlayer, PlayerId } from "../per-player";
import { perPlayerGet, perPlayerSet } from "../per-player";

export function getPlayerOrder<Table extends RuntimeTableRecord>(
  table: Table,
): Table["playerOrder"] {
  return table.playerOrder;
}

export function getPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: PlayerIdOfTable<NoInfer<Table>>,
): ResourceBalancesOfTable<Table> {
  return perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as unknown as PlayerId,
  ) as ResourceBalancesOfTable<Table>;
}

/**
 * Read the amount a player holds of a single resource. Returns `0` when the
 * player has never accumulated that resource.
 */
export function getPlayerResourceAmount<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  resourceId: string,
): number {
  const playerResources = perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  );
  if (!playerResources) return 0;
  const value = (playerResources as Record<string, unknown>)[resourceId];
  return typeof value === "number" ? value : 0;
}

/**
 * Sum of every resource amount for a player (e.g. "total cards in hand"
 * games). Skips `undefined` and non-number values.
 */
export function getPlayerResourceTotal<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
): number {
  const playerResources = perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  );
  if (!playerResources) return 0;
  let total = 0;
  for (const key of Object.keys(playerResources)) {
    const value = (playerResources as Record<string, unknown>)[key];
    if (typeof value === "number") total += value;
  }
  return total;
}

/**
 * Next player in seating order after `playerId`, wrapping around to the
 * first seat. Returns `null` when `playerId` is not in the player order or
 * the order is empty.
 */
export function getNextPlayerInOrder<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
): PlayerIdOfTable<Table> | null {
  const order = table.playerOrder as unknown as ReadonlyArray<
    PlayerIdOfTable<Table>
  >;
  if (order.length === 0) return null;
  const idx = order.indexOf(playerId as PlayerIdOfTable<Table>);
  if (idx < 0) return null;
  return order[(idx + 1) % order.length] ?? null;
}

/**
 * Iterate a resource-amounts record, skipping undefined / non-positive entries.
 * Shared by the resource mutation helpers below.
 */
function forEachResourceEntry(
  amounts: Readonly<Record<string, number | undefined>>,
  visit: (resourceId: string, amount: number) => void,
): void {
  for (const resourceId of Object.keys(amounts)) {
    const amount = amounts[resourceId];
    if (typeof amount !== "number" || amount === 0) continue;
    visit(resourceId, amount);
  }
}

/**
 * Return `true` when `playerId` has at least the requested `amounts` of each
 * resource. Unknown resource ids are treated as zero-balance (i.e. requesting
 * one of them returns `false` unless the requested amount is also zero).
 */
export function canAffordResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): boolean {
  for (const resourceId of Object.keys(amounts)) {
    const required = amounts[resourceId];
    if (typeof required !== "number" || required <= 0) continue;
    if (getPlayerResourceAmount(table, playerId, resourceId) < required) {
      return false;
    }
  }
  return true;
}

/**
 * Return the subset of `amounts` that the player cannot afford. The returned
 * record maps resource id → shortfall. Empty when the player can afford the
 * full cost.
 */
export function getMissingResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Record<string, number> {
  const missing: Record<string, number> = {};
  for (const resourceId of Object.keys(amounts)) {
    const required = amounts[resourceId];
    if (typeof required !== "number" || required <= 0) continue;
    const have = getPlayerResourceAmount(table, playerId, resourceId);
    if (have < required) missing[resourceId] = required - have;
  }
  return missing;
}

function writePlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  nextForPlayer: Record<string, number>,
): void {
  table.resources = perPlayerSet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
    nextForPlayer as RuntimeRecord,
  ) as Table["resources"];
}

/**
 * Increment each resource in `amounts` for `playerId`. Negative entries are
 * rejected — prefer {@link spendPlayerResources} for deductions so that
 * affordability is checked explicitly.
 */
export function addPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  const nextTable = { ...table };
  addPlayerResourcesInPlace(nextTable, playerId, amounts);
  return nextTable;
}

export function addPlayerResourcesInPlace<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): void {
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const next: Record<string, number> = { ...prev };
  forEachResourceEntry(amounts, (resourceId, amount) => {
    if (amount < 0) {
      throw new Error(
        `addPlayerResources: negative amount for resource '${resourceId}'. ` +
          `Use spendPlayerResources or transferPlayerResources instead.`,
      );
    }
    next[resourceId] = (next[resourceId] ?? 0) + amount;
  });
  writePlayerResources(table, playerId, next);
}

/**
 * Deduct each resource in `amounts` from `playerId`. Throws when the player
 * cannot afford the full cost — callers must check `canAfford` in their
 * `validate` phase before invoking this op.
 */
export function spendPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  const nextTable = { ...table };
  spendPlayerResourcesInPlace(nextTable, playerId, amounts);
  return nextTable;
}

export function spendPlayerResourcesInPlace<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): void {
  if (!canAffordResources(table, playerId, amounts)) {
    const missing = getMissingResources(table, playerId, amounts);
    throw new Error(
      `spendPlayerResources: player '${playerId}' cannot afford ${JSON.stringify(
        missing,
      )}. Check canAfford in your validate step first.`,
    );
  }
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const next: Record<string, number> = { ...prev };
  forEachResourceEntry(amounts, (resourceId, amount) => {
    if (amount < 0) {
      throw new Error(
        `spendPlayerResources: negative amount for resource '${resourceId}'. ` +
          `Pass positive amounts — the op deducts them from the player.`,
      );
    }
    next[resourceId] = Math.max(0, (next[resourceId] ?? 0) - amount);
  });
  writePlayerResources(table, playerId, next);
}

/**
 * Transfer the specified `amounts` from one player to another. Fails when the
 * source player cannot afford the full cost; on success the destination
 * gains exactly what the source loses.
 */
export function transferPlayerResources<Table extends RuntimeTableRecord>(
  table: Table,
  fromPlayerId: string,
  toPlayerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): Table {
  const nextTable = { ...table };
  transferPlayerResourcesInPlace(nextTable, fromPlayerId, toPlayerId, amounts);
  return nextTable;
}

export function transferPlayerResourcesInPlace<
  Table extends RuntimeTableRecord,
>(
  table: Table,
  fromPlayerId: string,
  toPlayerId: string,
  amounts: Readonly<Record<string, number | undefined>>,
): void {
  spendPlayerResourcesInPlace(table, fromPlayerId, amounts);
  addPlayerResourcesInPlace(table, toPlayerId, amounts);
}

/**
 * Overwrite a single resource balance for a player. Prefer the additive or
 * subtractive helpers — use this only when the new balance is an absolute
 * (e.g. "set coins to 10" for a scripted setup).
 */
export function setPlayerResource<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  resourceId: string,
  amount: number,
): Table {
  const nextTable = { ...table };
  setPlayerResourceInPlace(nextTable, playerId, resourceId, amount);
  return nextTable;
}

export function setPlayerResourceInPlace<Table extends RuntimeTableRecord>(
  table: Table,
  playerId: string,
  resourceId: string,
  amount: number,
): void {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `setPlayerResource: amount must be a non-negative finite number, got ${amount}.`,
    );
  }
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  writePlayerResources(table, playerId, {
    ...prev,
    [resourceId]: amount,
  });
}
