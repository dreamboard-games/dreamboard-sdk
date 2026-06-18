import { definePhase } from "@dreamboard-games/sdk/reducer";
import { scoringPhaseStateSchema, type GameContract } from "../game-contract";
import { computeFinalVP, edit, resolveWinner } from "../reducer-support";
import { type PlayerId } from "../../shared/manifest-contract";

/**
 * Endgame scoring. `kind: "auto"`, single onEnter:
 *   1. Compute finalVP[player] = playerVP (already accrued from
 *      fulfillOrder + Patron's Favor) + items VP + adjacency VP +
 *      floor(coin / 5).
 *   2. Overwrite `publicState.playerVP` with the totals. (We
 *      intentionally clobber the running counter — by the time scoring
 *      runs no further VP can be earned, and the player view reads
 *      `playerVP` as the canonical "final score" map.)
 *   3. Resolve `winnerPlayerId` with rule.md's tiebreaker (most items,
 *      then most coin); ties beyond that latch null.
 *   4. `fx.transition("gameOver")`.
 */
export const scoring = definePhase<GameContract>()({
  kind: "auto",
  state: scoringPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx }) {
    const players = state.publicState.turnOrderThisSeason;
    const finalVP: Record<PlayerId, number> = {} as Record<PlayerId, number>;
    for (const playerId of players) {
      finalVP[playerId] = computeFinalVP(state, playerId);
    }

    const winnerPlayerId = resolveWinner(state, finalVP);

    const tx = edit(state);
    tx.patchPublicState({
      playerVP: finalVP,
      winnerPlayerId,
    });
    return accept(tx.state, [fx.transition("gameOver")]);
  },
});
