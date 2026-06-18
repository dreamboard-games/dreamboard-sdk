import type { CardId, PlayerId } from "../../shared/manifest-contract";
import type { GameContract } from "../game-contract";
import { scoreRoundPhaseStateSchema } from "../game-contract";
import { handSizeForPlayerCount } from "../rules/deal";
import { scorePuddingForAll, scoreRoundForAll } from "../rules/scoring";
import { definePhase } from "@dreamboard-games/sdk/reducer";

function addScores(
  base: Record<string, number>,
  delta: Record<string, number>,
  playerIds: readonly PlayerId[],
): Record<string, number> {
  const out: Record<string, number> = { ...base };
  for (const pid of playerIds) {
    out[pid] = (out[pid] ?? 0) + (delta[pid] ?? 0);
  }
  return out;
}

function findWinners(
  totals: Record<string, number>,
  playerIds: readonly PlayerId[],
): PlayerId[] {
  const max = Math.max(...playerIds.map((id) => totals[id] ?? 0));
  return playerIds.filter((id) => (totals[id] ?? 0) === max);
}

export const scoreRound = definePhase<GameContract>()({
  kind: "auto",
  state: scoreRoundPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const playerIds = q.player.order();
    const roundScores = scoreRoundForAll(playerIds, q);
    const totalScoreByPlayer = addScores(
      state.publicState.totalScoreByPlayer ?? {},
      roundScores,
      playerIds,
    );

    const tx = edit(state);
    tx.patchPublicState({
      roundScoreByPlayer: roundScores,
      totalScoreByPlayer,
    });

    for (const playerId of playerIds) {
      for (const cardId of tx.q.zone.playerCards(playerId, "played")) {
        tx.moveCardFromPlayerZoneToSharedZone({
          playerId,
          fromZoneId: "played",
          toZoneId: "round-discard",
          cardId,
        });
      }
    }

    const round = state.publicState.round ?? 1;
    if (round >= 3) {
      const puddingScores = scorePuddingForAll(playerIds, tx.q);
      const finalTotals = addScores(
        totalScoreByPlayer,
        puddingScores,
        playerIds,
      );
      const winners = findWinners(finalTotals, playerIds);

      tx.patchPublicState({
        puddingScoreByPlayer: puddingScores,
        totalScoreByPlayer: finalTotals,
        winnerPlayerIds: winners,
      });
      return accept(tx.state, [fx.transition("gameOver")]);
    }

    const handSize = handSizeForPlayerCount(playerIds.length);
    for (const playerId of playerIds) {
      tx.dealCardsToPlayerZone({
        fromZoneId: "draw-pile",
        playerId,
        toZoneId: "hand",
        count: handSize,
      });
    }

    tx.patchPublicState({
      round: round + 1,
      roundScoreByPlayer: {},
    });
    return accept(tx.state, [fx.transition("drafting")]);
  },
});
