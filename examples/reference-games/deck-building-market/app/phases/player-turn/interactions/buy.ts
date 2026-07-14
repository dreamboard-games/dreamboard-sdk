import {
  cardInput,
  cardTarget,
  defineInteraction,
} from "@dreamboard-games/sdk/reducer";
import type { CardId } from "../../../../shared/manifest-contract";
import type {
  GameContract,
  GameState,
  PlayerTurnPhaseState,
} from "../../../game-contract";
import { SUPPLY_ZONE_IDS } from "../../../model";
import {
  appendHistory,
  costOf,
  edit,
  pileForCard,
} from "../../../reducer-support";
import { notYourTurn } from "../rules";

const buyTarget = cardTarget
  .zones<GameState, CardId, typeof SUPPLY_ZONE_IDS>(SUPPLY_ZONE_IDS)
  .where({
    id: "top-card",
    errorCode: "NOT_TOP_CARD",
    test: ({ q, targetId }) =>
      q.zone.sharedCards(pileForCard(q, targetId))[0] === targetId,
  })
  .where({
    id: "affordable",
    errorCode: "INSUFFICIENT_INSPIRATION",
    test: ({ state, q, targetId }) => {
      const phase = state.phase.get("playerTurn");
      return (
        !!phase &&
        phase.buysLeft > 0 &&
        phase.inspiration >= costOf(q, targetId)
      );
    },
  })
  .build();

export const buyCard = defineInteraction<GameContract, PlayerTurnPhaseState>()({
  inputs: {
    cardId: cardInput<GameState, CardId, typeof SUPPLY_ZONE_IDS>({
      target: buyTarget,
    }),
  },
  rules: [
    {
      id: "legal-buy",
      errorCode: "INVALID_BUY",
      validate({ state, input, q }) {
        const turn = notYourTurn(state, input.playerId);
        if (turn) return turn;
        if (state.phase.buysLeft < 1) return { errorCode: "NO_BUYS" };
        const pileId = pileForCard(q, input.params.cardId);
        if (q.zone.sharedCards(pileId)[0] !== input.params.cardId) {
          return { errorCode: "NOT_TOP_CARD" };
        }
        return state.phase.inspiration >= costOf(q, input.params.cardId)
          ? null
          : { errorCode: "INSUFFICIENT_INSPIRATION" };
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const pileId = pileForCard(q, input.params.cardId);
    const cost = costOf(q, input.params.cardId);
    const tx = edit(state);
    tx.moveCardFromSharedZoneToPlayerZone({
      playerId: input.playerId,
      fromZoneId: pileId,
      toZoneId: "discard",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      inspiration: state.phase.inspiration - cost,
      buysLeft: state.phase.buysLeft - 1,
    });
    return accept(
      appendHistory(tx.state, {
        kind: "cardGained",
        actorPlayerId: input.playerId,
        cardId: input.params.cardId,
        summary: `${input.playerId} acquired a card for ${cost} inspiration.`,
      }),
    );
  },
});
