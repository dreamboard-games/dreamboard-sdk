import type { PlayerId } from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";
import { edit } from "../reducer-support";

export const PICKS_PER_ROUND = 6;
export const ROUND_COUNT = 2;

/** Deal one card per seat repeatedly, preserving the one seeded deck order. */
export function dealRound(state: GameState, playerIds: readonly PlayerId[]) {
  const tx = edit(state);
  for (let pick = 0; pick < PICKS_PER_ROUND; pick += 1) {
    for (const playerId of playerIds) {
      tx.dealCardsToPlayerZone({
        fromZoneId: "market-deck",
        playerId,
        toZoneId: "hand",
        count: 1,
      });
    }
  }
  return tx.state;
}
