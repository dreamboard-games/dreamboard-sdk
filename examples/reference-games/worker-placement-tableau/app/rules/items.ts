import {
  literals,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../shared/manifest-contract";
import type { GameState, ItemId } from "../game-contract";

// ── Items ────────────────────────────────────────────────────────────────
//
// Static item table. Costs use Partial<Record<ResourceId, number>> so a
// missing entry implicitly means 0 of that resource. The placementRule
// is consumed by `craftAtWorkshopEligibility`. VP values feed scoring
// (T120). Adjacency-bonus mechanics (per rule.md item-cluster bonuses)
// are precomputed via `adjacentOwnedItemCount` here but resolved at
// scoring time, not at placement.
export type ItemPlacementRule =
  | "any"
  | "touch-one"
  | "corner-only"
  | "touch-two";

export type ItemMaterialType = "wood" | "stone";

export type ItemDef = {
  readonly itemId: ItemId;
  readonly name: string;
  readonly cost: Partial<Record<ResourceId, number>>;
  readonly vp: number;
  readonly placementRule: ItemPlacementRule;
  // Material types for Order matching. Per rule.md: a "wood item" is one
  // whose primary cost is wood; a "stone item" is one whose primary cost
  // is stone. The Kiln's mixed cost makes it count as BOTH for matching
  // purposes — encoded explicitly as `["wood", "stone"]`.
  readonly types: readonly ItemMaterialType[];
};

export const ITEMS: Readonly<Record<ItemId, ItemDef>> = {
  workbench: {
    itemId: "workbench",
    name: "Workbench",
    cost: { wood: 1 },
    vp: 1,
    placementRule: "touch-one",
    types: ["wood"],
  },
  anvil: {
    itemId: "anvil",
    name: "Anvil",
    cost: { stone: 1 },
    vp: 2,
    placementRule: "any",
    types: ["stone"],
  },
  loom: {
    itemId: "loom",
    name: "Loom",
    cost: { wood: 2 },
    vp: 2,
    placementRule: "any",
    types: ["wood"],
  },
  kiln: {
    itemId: "kiln",
    name: "Kiln",
    cost: { wood: 1, stone: 1 },
    vp: 3,
    placementRule: "corner-only",
    types: ["wood", "stone"],
  },
  showroom: {
    itemId: "showroom",
    name: "Showroom",
    cost: { stone: 2, coin: 2 },
    vp: 4,
    placementRule: "touch-two",
    types: ["stone"],
  },
} as const;

// ── Mat-cell helpers ──────────────────────────────────────────────────────
//
// Mat is 4 columns × 3 rows. Cell ids follow `cell-r{row}-c{col}` where
// row ∈ {0,1,2} and col ∈ {0,1,2,3}.
export const MAT_ROW_COUNT = 3;
export const MAT_COL_COUNT = 4;

export const MAT_CELL_IDS = new Set<string>(
  literals.spaceIds.filter((id) => /^cell-r\d-c\d$/.test(id)),
);

export function isMatCell(spaceId: SpaceId): boolean {
  return MAT_CELL_IDS.has(spaceId);
}

function parseMatCell(spaceId: SpaceId): { row: number; col: number } | null {
  const m = spaceId.match(/^cell-r(\d+)-c(\d+)$/);
  if (!m) return null;
  const row = Number(m[1]);
  const col = Number(m[2]);
  if (row < 0 || row >= MAT_ROW_COUNT) return null;
  if (col < 0 || col >= MAT_COL_COUNT) return null;
  return { row, col };
}

export function buildCellId(row: number, col: number): SpaceId {
  return `cell-r${row}-c${col}` as SpaceId;
}

/** 4-orthogonal neighbours (up/down/left/right) clipped to the mat. */
export function matCellNeighbors(spaceId: SpaceId): SpaceId[] {
  const parsed = parseMatCell(spaceId);
  if (!parsed) return [];
  const out: SpaceId[] = [];
  const tryPush = (r: number, c: number): void => {
    if (r < 0 || r >= MAT_ROW_COUNT) return;
    if (c < 0 || c >= MAT_COL_COUNT) return;
    out.push(buildCellId(r, c));
  };
  tryPush(parsed.row - 1, parsed.col);
  tryPush(parsed.row + 1, parsed.col);
  tryPush(parsed.row, parsed.col - 1);
  tryPush(parsed.row, parsed.col + 1);
  return out;
}

export function playerMatItems(
  state: GameState,
  playerId: PlayerId,
): Readonly<Partial<Record<SpaceId, ItemId>>> {
  return state.publicState.matOccupancyByPlayer[playerId] ?? {};
}

/** Set of corner cells (top-left, top-right, bottom-left, bottom-right). */
export function matCornerCells(): ReadonlySet<SpaceId> {
  return new Set<SpaceId>([
    buildCellId(0, 0),
    buildCellId(0, MAT_COL_COUNT - 1),
    buildCellId(MAT_ROW_COUNT - 1, 0),
    buildCellId(MAT_ROW_COUNT - 1, MAT_COL_COUNT - 1),
  ]);
}

/**
 * Number of cells orthogonally adjacent to `cellSpaceId` that already hold
 * an item owned by `playerId`. Used by `touch-one` / `touch-two` placement
 * predicates and by scoring's adjacency precompute.
 */
export function adjacentOwnedItemCount(
  state: GameState,
  playerId: PlayerId,
  cellSpaceId: SpaceId,
): number {
  let count = 0;
  const occupancy = playerMatItems(state, playerId);
  for (const neighbor of matCellNeighbors(cellSpaceId)) {
    if (occupancy[neighbor] != null) count++;
  }
  return count;
}

/** Per-player sum of crafted items (independent of cell occupancy). */
export function ownedItemCount(state: GameState, playerId: PlayerId): number {
  let count = 0;
  const occupancy = playerMatItems(state, playerId);
  for (const cellId of MAT_CELL_IDS) {
    if (occupancy[cellId as SpaceId] != null) count++;
  }
  return count;
}
