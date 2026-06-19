import {
  literals,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";
import { ITEMS, ownedItemCount, playerMatItems } from "./items";

// ── Endgame scoring helpers ──────────────────────────────────────────────
//
// All scoring helpers run against `publicState.matOccupancyByPlayer` and per-
// player resource balances. They are pure (read-only) so the scoring
// reducer can fold them into a single `patchPublicState` and tests can
// call them directly.
const MAT_CELL_ID_LIST: readonly SpaceId[] = literals.spaceIds.filter(
  (id): id is SpaceId => /^cell-r\d-c\d$/.test(id),
);

function getPlayerResource(
  state: GameState,
  playerId: PlayerId,
  resourceId: ResourceId,
): number {
  const entry = state.table.resources.entries.find(([pid]) => pid === playerId);
  return entry?.[1][resourceId] ?? 0;
}

/** Sum of ITEMS[itemId].vp across the player's mat cells. */
export function computeItemsVP(state: GameState, playerId: PlayerId): number {
  let total = 0;
  const occupancy = playerMatItems(state, playerId);
  for (const cellId of MAT_CELL_ID_LIST) {
    const itemId = occupancy[cellId];
    if (!itemId) continue;
    total += ITEMS[itemId].vp;
  }
  return total;
}

/**
 * Adjacency bonus: +1 VP per **shared-type pair** of orthogonally
 * neighbouring items the player owns.
 *
 * - Each unordered pair contributes once (i.e. we walk the lower-id
 *   cell as the canonical anchor by only emitting `right` and `down`
 *   neighbour pairs).
 * - The Kiln carries both `wood` and `stone`. A Kiln next to a wood
 *   item contributes +1 (wood pair). A Kiln next to a Kiln contributes
 *   +2 (wood pair AND stone pair) — both shared types count.
 *   This matches the rule.md ergonomics: "Kiln counts as both".
 */
export function computeAdjacencyVP(
  state: GameState,
  playerId: PlayerId,
): number {
  let total = 0;
  const occupancy = playerMatItems(state, playerId);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const here = occupancy[`cell-r${row}-c${col}` as SpaceId];
      if (!here) continue;
      const hereTypes = new Set(ITEMS[here].types);
      // Right neighbour.
      if (col + 1 < 4) {
        const right = occupancy[`cell-r${row}-c${col + 1}` as SpaceId];
        if (right) {
          for (const t of ITEMS[right].types) {
            if (hereTypes.has(t)) total += 1;
          }
        }
      }
      // Down neighbour.
      if (row + 1 < 3) {
        const down = occupancy[`cell-r${row + 1}-c${col}` as SpaceId];
        if (down) {
          for (const t of ITEMS[down].types) {
            if (hereTypes.has(t)) total += 1;
          }
        }
      }
    }
  }
  return total;
}

/** Coin → VP. Floors `coinResource / 5` per rule.md. */
export function computeCoinVP(state: GameState, playerId: PlayerId): number {
  const coin = getPlayerResource(state, playerId, "coin" as ResourceId);
  return Math.floor(coin / 5);
}

/**
 * Compose finalVP for a single player:
 *   playerVP[playerId] (fulfilled-orders + reward-coin runs already
 *     credited during play; persistent-card season grants land here)
 *   + items VP
 *   + adjacency VP
 *   + coin / 5
 */
export function computeFinalVP(state: GameState, playerId: PlayerId): number {
  return (
    (state.publicState.playerVP[playerId] ?? 0) +
    computeItemsVP(state, playerId) +
    computeAdjacencyVP(state, playerId) +
    computeCoinVP(state, playerId)
  );
}

/**
 * Tiebreaker-aware winner resolver. Returns the playerId with the
 * highest `(finalVP, itemCount, coin)` lexicographic tuple. If two or
 * more players are still tied after all three keys, returns null
 * (extremely unlikely in a 6-season game; the rule.md doesn't pin a
 * fourth-level rule).
 */
export function resolveWinner(
  state: GameState,
  finalVP: Readonly<Record<PlayerId, number>>,
): PlayerId | null {
  const players = state.publicState.turnOrderThisSeason;
  if (players.length === 0) return null;
  const tuples = players.map((pid) => ({
    pid,
    vp: finalVP[pid] ?? 0,
    items: ownedItemCount(state, pid),
    coin: getPlayerResource(state, pid, "coin" as ResourceId),
  }));
  tuples.sort((a, b) => {
    if (a.vp !== b.vp) return b.vp - a.vp;
    if (a.items !== b.items) return b.items - a.items;
    return b.coin - a.coin;
  });
  const top = tuples[0]!;
  const second = tuples[1];
  if (
    second &&
    second.vp === top.vp &&
    second.items === top.items &&
    second.coin === top.coin
  ) {
    return null;
  }
  return top.pid;
}
