import type { CardId } from "../../shared/manifest-contract";
import type { GameContract, RoundHistoryEntry } from "../game-contract";
import { scoreRoundPhaseStateSchema } from "../game-contract";
import { dealRound, ROUND_COUNT } from "../rules/deal";
import { addScores, buildOutcome, scoreStalls } from "../rules/scoring";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const scoreRound = definePhase<GameContract>()({
  kind: "auto",
  state: scoreRoundPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, endGame, fx, q }) {
    const playerIds = q.player.order();
    const round = state.publicState.round;
    const cardIdsByPlayer = Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        [...q.zone.playerCards(playerId, "stall")],
      ]),
    ) as Partial<Record<(typeof playerIds)[number], CardId[]>>;
    const roundScoreByPlayer = scoreStalls(q, playerIds);
    const totalScoreByPlayer = addScores(
      state.publicState.totalScoreByPlayer,
      roundScoreByPlayer,
      playerIds,
    );
    const roundEntry: RoundHistoryEntry = {
      round,
      scoreByPlayer: roundScoreByPlayer,
      cardIdsByPlayer,
    };
    const roundHistory = [...state.publicState.roundHistory, roundEntry];

    const tx = edit(state);
    for (const playerId of playerIds) {
      for (const cardId of cardIdsByPlayer[playerId] ?? []) {
        tx.moveCardBetweenPlayerZones({
          playerId,
          fromZoneId: "stall",
          toZoneId: "scored-history",
          cardId,
        });
      }
    }
    tx.patchPublicState({
      roundScoreByPlayer,
      totalScoreByPlayer,
      roundHistory,
    });

    if (round >= ROUND_COUNT) {
      const outcome = buildOutcome(totalScoreByPlayer, playerIds, roundHistory);
      tx.patchPublicState({ outcome });
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    const nextRound = dealRound(tx.state, playerIds);
    return accept(
      {
        ...nextRound,
        publicState: {
          ...nextRound.publicState,
          round: round + 1,
          pick: 1,
        },
      },
      { instructions: [fx.transition("drafting")] },
    );
  },
});
