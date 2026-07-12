import type { PlayerId } from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";
import { adjacentCellIds, CELL_IDS, ITEMS } from "./model";

export type Score = {
  readonly printed: number;
  readonly harmony: number;
  readonly total: number;
};

export function scorePlayer(state: GameState, playerId: PlayerId): Score {
  const tableau = state.publicState.tableauByPlayer[playerId] ?? {};
  const printed = CELL_IDS.reduce(
    (sum, cellId) =>
      sum + (tableau[cellId] ? ITEMS[tableau[cellId]!].prestige : 0),
    0,
  );
  let harmony = 0;
  for (const cellId of CELL_IDS) {
    const item = tableau[cellId];
    if (!item) continue;
    for (const neighbor of adjacentCellIds(cellId)) {
      if (
        CELL_IDS.indexOf(neighbor as (typeof CELL_IDS)[number]) <=
        CELL_IDS.indexOf(cellId)
      ) {
        continue;
      }
      const neighborItem = tableau[neighbor];
      if (neighborItem && neighborItem !== item) harmony += 1;
    }
  }
  return { printed, harmony, total: printed + harmony };
}
