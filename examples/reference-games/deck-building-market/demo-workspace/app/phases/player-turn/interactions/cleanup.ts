import { defineInteraction } from "@dreamboard-games/sdk/reducer";
import type {
  GameContract,
  PlayerTurnPhaseState,
} from "../../../game-contract";
import { shufflePlayerDeckForDraw } from "../../../effects/deck";
import { edit } from "../../../reducer-support";
import { notYourTurn } from "../rules";

export const endTurn = defineInteraction<GameContract, PlayerTurnPhaseState>()({
  inputs: {},
  rules: [
    {
      id: "can-end-turn",
      errorCode: "NOT_YOUR_TURN",
      validate: ({ state, input }) => notYourTurn(state, input.playerId),
    },
  ],
  reduce({ state, input, accept, fx, q }) {
    const player = input.playerId;
    const handCards = q.zone.playerCards(player, "hand");
    const inPlayCards = q.zone.playerCards(player, "in-play");
    const deckSize = q.zone.playerCards(player, "deck").length;
    const drawCount = 5;
    const drawFromDeck = Math.min(drawCount, deckSize);
    const drawFromRecycledDiscard = drawCount - drawFromDeck;
    const existingDiscardCards = q.zone.playerCards(player, "discard");
    const recycledDiscardCards =
      drawFromRecycledDiscard > 0
        ? [...existingDiscardCards, ...handCards, ...inPlayCards]
        : [];
    const nextEffects =
      drawFromRecycledDiscard > 0
        ? [
            fx.effect(shufflePlayerDeckForDraw, {
              playerId: player,
              zoneId: "deck",
              context: {
                playerId: player,
                drawCount: drawFromRecycledDiscard,
                transitionToPlayerTurn: false,
                transitionToCheckGameEnd: true,
              },
            }),
          ]
        : [fx.transition("checkGameEnd")];

    const tx = edit(state);
    for (const cardId of handCards) {
      tx.moveCardBetweenPlayerZones({
        playerId: player,
        fromZoneId: "hand",
        toZoneId: "discard",
        cardId,
      });
    }
    for (const cardId of inPlayCards) {
      tx.moveCardBetweenPlayerZones({
        playerId: player,
        fromZoneId: "in-play",
        toZoneId: "discard",
        cardId,
      });
    }
    if (drawFromDeck > 0) {
      tx.dealCardsBetweenPlayerZones({
        playerId: player,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: drawFromDeck,
      });
    }
    for (const cardId of recycledDiscardCards) {
      tx.moveCardBetweenPlayerZones({
        playerId: player,
        fromZoneId: "discard",
        toZoneId: "deck",
        cardId,
      });
    }
    tx.patchPublicState((prev) => ({
      ...prev,
      turnNumber: prev.turnNumber + 1,
    }));
    return accept(tx.state, nextEffects);
  },
});
