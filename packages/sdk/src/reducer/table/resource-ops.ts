import type {
  PlayerIdOfTable,
  ResourceBalancesOfTable,
  RuntimeRecord,
  RuntimeTableRecord,
} from "../model";
import type { PerPlayer, PlayerId } from "../per-player";
import { perPlayerGet, perPlayerSet } from "../per-player";
import { assertNonNegativeSafeInteger } from "./numeric";

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
  if (value === undefined) return 0;
  if (typeof value !== "number") {
    throw new Error(
      `Resource '${resourceId}' balance must be a non-negative safe integer.`,
    );
  }
  assertNonNegativeSafeInteger(value, `Resource '${resourceId}' balance`);
  return value;
}

/**
 * Sum of every resource amount for a player (e.g. "total cards in hand"
 * games). Skips omitted keys but rejects malformed stored balances.
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
    if (value === undefined) continue;
    if (typeof value !== "number") {
      throw new Error(
        `Resource '${key}' balance must be a non-negative safe integer.`,
      );
    }
    assertNonNegativeSafeInteger(value, `Resource '${key}' balance`);
    const nextTotal = total + value;
    assertNonNegativeSafeInteger(nextTotal, "Resource total");
    total = nextTotal;
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
 * Iterate a resource-amounts record, skipping undefined / zero entries.
 * Shared by the resource mutation helpers below.
 */
function resourceEntries(
  amounts: Readonly<Record<string, number | undefined>>,
): [resourceId: string, amount: number][] {
  const entries: [string, number][] = [];
  for (const resourceId of Object.keys(amounts)) {
    const amount = amounts[resourceId];
    if (amount === undefined || amount === 0) continue;
    if (typeof amount !== "number") {
      throw new Error(
        `Resource '${resourceId}' amount must be a non-negative safe integer.`,
      );
    }
    assertNonNegativeSafeInteger(amount, `Resource '${resourceId}' amount`);
    entries.push([resourceId, amount]);
  }
  return entries;
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
  for (const [resourceId, required] of resourceEntries(amounts)) {
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
  for (const [resourceId, required] of resourceEntries(amounts)) {
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
  for (const [resourceId, amount] of resourceEntries(amounts)) {
    const nextAmount =
      getPlayerResourceAmount(table, playerId, resourceId) + amount;
    assertNonNegativeSafeInteger(
      nextAmount,
      `Resource '${resourceId}' balance`,
    );
    next[resourceId] = nextAmount;
  }
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
  const entries = resourceEntries(amounts);
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
  for (const [resourceId, amount] of entries) {
    const nextAmount =
      getPlayerResourceAmount(table, playerId, resourceId) - amount;
    assertNonNegativeSafeInteger(
      nextAmount,
      `Resource '${resourceId}' balance`,
    );
    next[resourceId] = nextAmount;
  }
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
  const entries = resourceEntries(amounts);
  if (!canAffordResources(table, fromPlayerId, amounts)) {
    const missing = getMissingResources(table, fromPlayerId, amounts);
    throw new Error(
      `spendPlayerResources: player '${fromPlayerId}' cannot afford ${JSON.stringify(
        missing,
      )}. Check canAfford in your validate step first.`,
    );
  }
  if (fromPlayerId === toPlayerId) return;

  const fromPrev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    fromPlayerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const toPrev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    toPlayerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  const fromNext: Record<string, number> = { ...fromPrev };
  const toNext: Record<string, number> = { ...toPrev };

  for (const [resourceId, amount] of entries) {
    const sourceBalance =
      getPlayerResourceAmount(table, fromPlayerId, resourceId) - amount;
    const destinationBalance =
      getPlayerResourceAmount(table, toPlayerId, resourceId) + amount;
    assertNonNegativeSafeInteger(
      sourceBalance,
      `Resource '${resourceId}' balance`,
    );
    assertNonNegativeSafeInteger(
      destinationBalance,
      `Resource '${resourceId}' balance`,
    );
    fromNext[resourceId] = sourceBalance;
    toNext[resourceId] = destinationBalance;
  }

  writePlayerResources(table, fromPlayerId, fromNext);
  writePlayerResources(table, toPlayerId, toNext);
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
  assertNonNegativeSafeInteger(amount, `Resource '${resourceId}' amount`);
  const prev = (perPlayerGet(
    table.resources as PerPlayer<RuntimeRecord>,
    playerId as PlayerId,
  ) ?? {}) as Record<string, number>;
  writePlayerResources(table, playerId, {
    ...prev,
    [resourceId]: amount,
  });
}
