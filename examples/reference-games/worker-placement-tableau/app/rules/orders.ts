import type {
  PlayerId,
  ResourceId,
  SpaceId,
} from "../../shared/manifest-contract";
import type { GameState, ItemId } from "../game-contract";
import {
  ITEMS,
  MAT_CELL_IDS,
  MAT_COL_COUNT,
  MAT_ROW_COUNT,
  buildCellId,
  playerMatItems,
  type ItemMaterialType,
} from "./items";

// ── Orders ───────────────────────────────────────────────────────────────
//
// Order ids alias the manifest's card ids 1:1 (manifest-types.ts §
// OrderCardsCardId), so we re-use the manifest-typed `CardId` for the
// owning column rather than introducing a parallel string union. The
// runtime checks `cardSetIdByCardId[id] === "order-cards"` before
// dispatching into this table.
export type OrderId =
  | "furniture-commission"
  | "stone-sculpture"
  | "masters-display"
  | "forge-order"
  | "weavers-request"
  | "apprentice-trial"
  | "mixed-set"
  | "architects-plan"
  | "row-of-pride"
  | "grand-atelier";

export type OrderRequirement =
  | { kind: "count-by-type"; itemType: ItemMaterialType; count: number }
  | { kind: "count-by-itemId"; itemId: ItemId; count: number }
  | { kind: "set-of-itemIds"; itemIds: readonly ItemId[] }
  | { kind: "count-any"; count: number }
  | { kind: "one-of-each-type"; types: readonly ItemMaterialType[] }
  | { kind: "rectangle"; rows: number; cols: number }
  | { kind: "line"; orientation: "row" | "col"; count: number }
  | { kind: "cells-filled"; count: number };

export type OrderDef = {
  readonly orderId: OrderId;
  readonly name: string;
  readonly requirement: OrderRequirement;
  readonly rewardVP: number;
  readonly rewardCoin: number;
};

export const ORDERS: Readonly<Record<OrderId, OrderDef>> = {
  "furniture-commission": {
    orderId: "furniture-commission",
    name: "Furniture Commission",
    requirement: { kind: "count-by-type", itemType: "wood", count: 2 },
    rewardVP: 3,
    rewardCoin: 0,
  },
  "stone-sculpture": {
    orderId: "stone-sculpture",
    name: "Stone Sculpture",
    requirement: { kind: "count-by-type", itemType: "stone", count: 2 },
    rewardVP: 3,
    rewardCoin: 0,
  },
  "masters-display": {
    orderId: "masters-display",
    name: "Master's Display",
    requirement: { kind: "count-by-itemId", itemId: "showroom", count: 1 },
    rewardVP: 4,
    rewardCoin: 2,
  },
  "forge-order": {
    orderId: "forge-order",
    name: "Forge Order",
    requirement: { kind: "set-of-itemIds", itemIds: ["anvil", "kiln"] },
    rewardVP: 5,
    rewardCoin: 0,
  },
  "weavers-request": {
    orderId: "weavers-request",
    name: "Weaver's Request",
    requirement: { kind: "count-by-itemId", itemId: "loom", count: 2 },
    rewardVP: 4,
    rewardCoin: 0,
  },
  "apprentice-trial": {
    orderId: "apprentice-trial",
    name: "Apprentice Trial",
    requirement: { kind: "count-any", count: 3 },
    rewardVP: 2,
    rewardCoin: 2,
  },
  "mixed-set": {
    orderId: "mixed-set",
    name: "Mixed Set",
    requirement: { kind: "one-of-each-type", types: ["wood", "stone"] },
    rewardVP: 3,
    rewardCoin: 1,
  },
  "architects-plan": {
    orderId: "architects-plan",
    name: "Architect's Plan",
    requirement: { kind: "rectangle", rows: 2, cols: 2 },
    rewardVP: 6,
    rewardCoin: 0,
  },
  "row-of-pride": {
    orderId: "row-of-pride",
    name: "Row of Pride",
    requirement: { kind: "line", orientation: "row", count: 3 },
    rewardVP: 5,
    rewardCoin: 0,
  },
  "grand-atelier": {
    orderId: "grand-atelier",
    name: "Grand Atelier",
    requirement: { kind: "cells-filled", count: 6 },
    rewardVP: 7,
    rewardCoin: 0,
  },
} as const;

export function isOrderId(value: string): value is OrderId {
  return Object.prototype.hasOwnProperty.call(ORDERS, value);
}

// ── Apprentice cards (one-shot subset) ───────────────────────────────────
//
// Persistent apprentice cards (Foreman / Tireless Master / Guild Scholar
// / Patron's Favor) live as tableau-resident state and resolve at
// scoring time; they are NOT in this table. The 6 one-shots below
// resolve immediately on play.
export type OneShotApprenticeId =
  | "quick-delivery"
  | "lumber-stash"
  | "stone-cache"
  | "spare-hands"
  | "inspiration"
  | "reassign";

const ONE_SHOT_APPRENTICE_IDS = new Set<string>([
  "quick-delivery",
  "lumber-stash",
  "stone-cache",
  "spare-hands",
  "inspiration",
  "reassign",
]);

export function isOneShotApprenticeId(
  value: string,
): value is OneShotApprenticeId {
  return ONE_SHOT_APPRENTICE_IDS.has(value);
}

// ── Apprentice cards (persistent subset) ─────────────────────────────────
//
// Persistent cards move from `apprentice-hand` to the player's
// `apprentice-tableau` (per-player public zone) on play and stay there
// for the rest of the game. Their effects are dispatched via hook
// callbacks consulted by `placeWorker` (`onPlaceWorker`) and the
// `cleanup` phase (`onSeasonEnd`). Hooks are intentionally
// closure-free: they take a small context and return a list of
// data instructions for the caller to apply through its reducer transaction.
export type PersistentApprenticeId =
  | "foreman"
  | "tireless-master"
  | "guild-scholar"
  | "patrons-favor";

const PERSISTENT_APPRENTICE_IDS = new Set<string>([
  "foreman",
  "tireless-master",
  "guild-scholar",
  "patrons-favor",
]);

export function isPersistentApprenticeId(
  value: string,
): value is PersistentApprenticeId {
  return PERSISTENT_APPRENTICE_IDS.has(value);
}

// ── Hook payloads ────────────────────────────────────────────────────────
export type PlacementHookEvent = {
  readonly playerId: PlayerId;
  readonly spaceId: SpaceId;
  readonly actionId: string | null;
  readonly pieceTypeId: "apprentice" | "master" | null;
};

export type PlacementHookEffect =
  | { kind: "addResources"; amounts: Partial<Record<ResourceId, number>> }
  | { kind: "drawApprenticeCard" }
  | { kind: "trackTirelessMaster"; spaceId: SpaceId };

export type SeasonEndHookEffect = {
  readonly kind: "addResources";
  readonly amounts: Partial<Record<ResourceId, number>>;
};

/**
 * Persistent-card hook table. Each card declares the events it cares
 * about; the placement / cleanup dispatchers iterate every player's
 * tableau and call the matching entry. Effects are returned as plain
 * data so the caller can map them into typed transaction calls without
 * sharing a deeply-generic type with this module.
 */
export const PERSISTENT_HOOKS: Readonly<
  Record<
    PersistentApprenticeId,
    {
      readonly onPlaceWorker?: (
        event: PlacementHookEvent,
      ) => readonly PlacementHookEffect[];
      readonly onSeasonEnd?: (ctx: {
        playerId: PlayerId;
      }) => readonly SeasonEndHookEffect[];
    }
  >
> = {
  foreman: {
    onPlaceWorker: ({ actionId }) =>
      actionId === "lumberyard"
        ? [{ kind: "addResources", amounts: { wood: 1 } }]
        : [],
  },
  "guild-scholar": {
    onPlaceWorker: ({ actionId }) =>
      actionId === "guild-hall" ? [{ kind: "drawApprenticeCard" }] : [],
  },
  "patrons-favor": {
    onSeasonEnd: () => [{ kind: "addResources", amounts: { coin: 1 } }],
  },
  "tireless-master": {
    onPlaceWorker: ({ pieceTypeId, spaceId }) =>
      pieceTypeId === "master"
        ? [{ kind: "trackTirelessMaster", spaceId }]
        : [],
  },
};

/**
 * Per-card-id ordering used by `placeWorker` and `cleanup` so multi-hook
 * fires are deterministic. Sorted alphabetically — stable across
 * future card additions without bespoke positions.
 */
export const PERSISTENT_HOOK_ORDER: readonly PersistentApprenticeId[] = [
  "foreman",
  "guild-scholar",
  "patrons-favor",
  "tireless-master",
];

/** Player ids carrying a given persistent card in their tableau. */
export function persistentCardsFor(
  state: GameState,
  playerId: PlayerId,
): readonly PersistentApprenticeId[] {
  const tableau = state.publicState.playedPersistentApprentices[playerId] ?? [];
  return tableau.filter(isPersistentApprenticeId);
}

/** True if a player holds a specific persistent card in their tableau. */
export function hasPersistentCard(
  state: GameState,
  playerId: PlayerId,
  cardId: PersistentApprenticeId,
): boolean {
  return persistentCardsFor(state, playerId).includes(cardId);
}

// ── Requirement evaluator ─────────────────────────────────────────────────
//
// All matchers run against `publicState.matOccupancyByPlayer`. We materialise
// the player's cell→item map once per check and re-use it across the
// per-kind branches; the mat is small (12 cells) so the constant-factor
// cost is negligible.
function ownedItems(
  state: GameState,
  playerId: PlayerId,
): Map<SpaceId, ItemId> {
  const out = new Map<SpaceId, ItemId>();
  const occupancy = playerMatItems(state, playerId);
  for (const cellId of MAT_CELL_IDS) {
    const itemId = occupancy[cellId as SpaceId];
    if (itemId) out.set(cellId as SpaceId, itemId);
  }
  return out;
}

function countItemsByType(
  owned: Map<SpaceId, ItemId>,
  itemType: ItemMaterialType,
): number {
  let count = 0;
  for (const itemId of owned.values()) {
    if (ITEMS[itemId].types.includes(itemType)) count++;
  }
  return count;
}

function countItemsById(owned: Map<SpaceId, ItemId>, itemId: ItemId): number {
  let count = 0;
  for (const owned_itemId of owned.values()) {
    if (owned_itemId === itemId) count++;
  }
  return count;
}

function hasItemId(owned: Map<SpaceId, ItemId>, itemId: ItemId): boolean {
  for (const owned_itemId of owned.values()) {
    if (owned_itemId === itemId) return true;
  }
  return false;
}

/**
 * Does the mat contain a `rows × cols` block of cells fully owned by the
 * player? Enumerate every top-left position; return true on the first
 * match.
 */
function hasFilledRectangle(
  owned: Map<SpaceId, ItemId>,
  blockRows: number,
  blockCols: number,
): boolean {
  if (blockRows > MAT_ROW_COUNT || blockCols > MAT_COL_COUNT) return false;
  for (let row = 0; row + blockRows <= MAT_ROW_COUNT; row++) {
    for (let col = 0; col + blockCols <= MAT_COL_COUNT; col++) {
      let allFilled = true;
      for (let dr = 0; dr < blockRows && allFilled; dr++) {
        for (let dc = 0; dc < blockCols && allFilled; dc++) {
          if (!owned.has(buildCellId(row + dr, col + dc))) {
            allFilled = false;
          }
        }
      }
      if (allFilled) return true;
    }
  }
  return false;
}

function hasLine(
  owned: Map<SpaceId, ItemId>,
  orientation: "row" | "col",
  count: number,
): boolean {
  if (orientation === "row") {
    for (let row = 0; row < MAT_ROW_COUNT; row++) {
      let inRow = 0;
      for (let col = 0; col < MAT_COL_COUNT; col++) {
        if (owned.has(buildCellId(row, col))) inRow++;
      }
      if (inRow >= count) return true;
    }
  } else {
    for (let col = 0; col < MAT_COL_COUNT; col++) {
      let inCol = 0;
      for (let row = 0; row < MAT_ROW_COUNT; row++) {
        if (owned.has(buildCellId(row, col))) inCol++;
      }
      if (inCol >= count) return true;
    }
  }
  return false;
}

export function orderRequirementMet(
  state: GameState,
  playerId: PlayerId,
  requirement: OrderRequirement,
): boolean {
  const owned = ownedItems(state, playerId);
  switch (requirement.kind) {
    case "count-by-type":
      return countItemsByType(owned, requirement.itemType) >= requirement.count;
    case "count-by-itemId":
      return countItemsById(owned, requirement.itemId) >= requirement.count;
    case "set-of-itemIds":
      return requirement.itemIds.every((id) => hasItemId(owned, id));
    case "count-any":
      return owned.size >= requirement.count;
    case "one-of-each-type":
      return requirement.types.every((t) => countItemsByType(owned, t) >= 1);
    case "rectangle":
      return hasFilledRectangle(owned, requirement.rows, requirement.cols);
    case "line":
      return hasLine(owned, requirement.orientation, requirement.count);
    case "cells-filled":
      return owned.size >= requirement.count;
    default: {
      const _exhaustive: never = requirement;
      void _exhaustive;
      return false;
    }
  }
}
