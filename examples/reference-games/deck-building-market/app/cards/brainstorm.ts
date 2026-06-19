import { defineCardAction } from "@dreamboard-games/sdk/reducer";
import { cardTypes } from "../../shared/manifest-contract";
import type { GameContract, PlayerTurnPhaseState } from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";

// Brainstorm: +3 cards. The simplest Smithy-style card.
//
// This is also the canonical reshuffle showcase — when the deck has
// fewer than 3 cards, the reducer transaction pulls discard back into
// the deck and continues drawing.
export const brainstorm = defineCardAction<
  GameContract,
  PlayerTurnPhaseState
>()({
  cardType: cardTypes.brainstorm,
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
      actionsLeft: state.phase.actionsLeft - 1,
    });
    const deckSize = q.zone.playerCards(input.playerId, "deck").length;
    if (deckSize < 3) {
      tx.dealCardsBetweenPlayerZones({
        playerId: input.playerId,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: deckSize,
      });
      for (const cardId of q.zone.playerCards(input.playerId, "discard")) {
        tx.moveCardBetweenPlayerZones({
          playerId: input.playerId,
          fromZoneId: "discard",
          toZoneId: "deck",
          cardId,
        });
      }
      tx.dealCardsBetweenPlayerZones({
        playerId: input.playerId,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: 3 - deckSize,
      });
    } else {
      tx.dealCardsBetweenPlayerZones({
        playerId: input.playerId,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: 3,
      });
    }
    return accept(tx.state);
  },
});
