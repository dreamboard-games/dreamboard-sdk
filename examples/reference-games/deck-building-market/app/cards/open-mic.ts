import { defineCardAction } from "@dreamboard-games/sdk/reducer";
import { cardTypes } from "../../shared/manifest-contract";
import type { GameContract, PlayerTurnPhaseState } from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";

// Open Mic: +2 actions, +1 buy, +$2. No card draw. Festival.
export const openMic = defineCardAction<GameContract, PlayerTurnPhaseState>()({
  cardType: cardTypes.openMic,
  playFrom: "hand",
  rules: [
    {
      id: "action-card-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      validate: ({ state, input }) => validateActionPlay(state, input.playerId),
    },
  ],
  reduce({ state, input, accept }) {
    const tx = edit(state);
    tx.moveCardBetweenPlayerZones({
      playerId: input.playerId,
      fromZoneId: "hand",
      toZoneId: "in-play",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      actionsLeft: state.phase.actionsLeft + 1,
      buysLeft: state.phase.buysLeft + 1,
      coins: state.phase.coins + 2,
    });
    return accept(tx.state);
  },
});
