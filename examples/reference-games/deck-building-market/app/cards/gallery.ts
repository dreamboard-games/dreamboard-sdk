import { defineCardAction } from "@dreamboard-games/sdk/reducer";
import { cardTypes } from "../../shared/manifest-contract";
import type { GameContract, PlayerTurnPhaseState } from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";

// Gallery: +1 card, +1 action, +1 buy, +$1. The all-rounder Market.
export const gallery = defineCardAction<GameContract, PlayerTurnPhaseState>()({
  cardType: cardTypes.gallery,
  playFrom: "hand",
  rules: [
    {
      id: "action-card-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      validate: ({ state, input }) => validateActionPlay(state, input.playerId),
    },
  ],
  reduce({ state, input, accept, q }) {
    const tx = edit(state);
    tx.moveCardBetweenPlayerZones({
      playerId: input.playerId,
      fromZoneId: "hand",
      toZoneId: "in-play",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      buysLeft: state.phase.buysLeft + 1,
      coins: state.phase.coins + 1,
    });
    tx.dealCardsBetweenPlayerZones({
      playerId: input.playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: 1,
    });
    return accept(tx.state);
  },
});
