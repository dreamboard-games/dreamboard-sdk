import {
  cardInput,
  cardTarget,
  defineInteraction,
} from "@dreamboard-games/sdk/reducer";
import type {
  GameContract,
  GameState,
  PlayerTurnPhaseState,
} from "../../../game-contract";
import { edit } from "../../../reducer-support";
import { literals, type CardId } from "../../../../shared/manifest-contract";
import { notYourTurn } from "../rules";

const BUYABLE_SUPPLY_ZONES = [
  "supply-brainstorm",
  "supply-studio",
  "supply-gallery",
  "supply-open-mic",
  "supply-critic",
  "supply-eraser",
  "supply-sketchpad",
  "supply-studio-visit",
  "supply-doodle",
  "supply-sketch",
  "supply-inkwork",
  "supply-idea",
  "supply-concept",
  "supply-masterpiece",
  "supply-smudge",
] as const;

export const buyCard = defineInteraction<GameContract, PlayerTurnPhaseState>()({
  inputs: {
    cardId: cardInput<GameState, CardId, typeof BUYABLE_SUPPLY_ZONES>({
      target: cardTarget
        .zones<GameState, CardId, typeof BUYABLE_SUPPLY_ZONES>(
          BUYABLE_SUPPLY_ZONES,
        )
        .where({
          id: "top-card",
          errorCode: "NOT_TOP_CARD",
          message: "Buy the top card of a supply pile.",
          test: ({ q, targetId }) => {
            const card = q.card.get(targetId);
            const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
            return q.zone.sharedCards(pileId)[0] === targetId;
          },
        })
        .where({
          id: "can-afford",
          errorCode: "INSUFFICIENT_COINS",
          message: "Not enough coins.",
          test: ({ state, q, targetId }) => {
            const phase = state.phase.get("playerTurn");
            if (!phase || phase.buysLeft <= 0) {
              return false;
            }
            return phase.coins >= q.card.get(targetId).properties.cost;
          },
        })
        .build(),
    }),
  },
  rules: [
    {
      id: "can-buy-card",
      errorCode: "INVALID_BUY",
      validate({ state, input, q }) {
        const turn = notYourTurn(state, input.playerId);
        if (turn) return turn;
        if (state.phase.buysLeft <= 0) {
          return { errorCode: "NO_BUYS", message: "No buys left." };
        }
        const cardId = input.params.cardId;
        if (!cardId) return null;
        const card = q.card.get(cardId);
        const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
        const pile = q.zone.sharedCards(pileId);
        if (pile[0] !== cardId) {
          return { errorCode: "NOT_TOP_CARD", message: "Buy the top card." };
        }
        if (state.phase.coins < card.properties.cost) {
          return {
            errorCode: "INSUFFICIENT_COINS",
            message: `Need ${card.properties.cost} coins.`,
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const cardId = input.params.cardId;
    const card = q.card.get(cardId);
    const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
    const tx = edit(state);
    tx.moveCardFromSharedZoneToPlayerZone({
      playerId: input.playerId,
      fromZoneId: pileId,
      toZoneId: "discard",
      cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      coins: state.phase.coins - card.properties.cost,
      buysLeft: state.phase.buysLeft - 1,
    });
    return accept(tx.state);
  },
});
