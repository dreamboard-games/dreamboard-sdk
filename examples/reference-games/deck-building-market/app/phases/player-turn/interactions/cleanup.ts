import { defineInteraction } from "@dreamboard-games/sdk/reducer";
import type {
  GameContract,
  PlayerTurnPhaseState,
} from "../../../game-contract";
import { shuffleDeckForDraw } from "../../../effects/deck";
import { appendHistory, edit } from "../../../reducer-support";
import { notYourTurn } from "../rules";

export const endTurn = defineInteraction<GameContract, PlayerTurnPhaseState>()({
  inputs: {},
  rules: [
    {
      id: "active-player",
      errorCode: "NOT_YOUR_TURN",
      validate: ({ state, input }) => notYourTurn(state, input.playerId),
    },
  ],
  reduce({ state, input, accept, q, fx }) {
    const playerId = input.playerId;
    const hand = q.zone.playerCards(playerId, "hand");
    const inPlay = q.zone.playerCards(playerId, "in-play");
    const deck = q.zone.playerCards(playerId, "deck");
    const discard = q.zone.playerCards(playerId, "discard");
    const immediate = Math.min(5, deck.length);
    const remainder = 5 - immediate;
    const recycle = [...discard, ...hand, ...inPlay];
    const shuffledDraw = Math.min(remainder, recycle.length);
    const tx = edit(state);

    for (const cardId of hand) {
      tx.moveCardBetweenPlayerZones({
        playerId,
        fromZoneId: "hand",
        toZoneId: "discard",
        cardId,
      });
    }
    for (const cardId of inPlay) {
      tx.moveCardBetweenPlayerZones({
        playerId,
        fromZoneId: "in-play",
        toZoneId: "discard",
        cardId,
      });
    }
    if (immediate > 0) {
      tx.dealCardsBetweenPlayerZones({
        playerId,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: immediate,
      });
    }
    if (shuffledDraw > 0) {
      for (const cardId of recycle) {
        tx.moveCardBetweenPlayerZones({
          playerId,
          fromZoneId: "discard",
          toZoneId: "deck",
          cardId,
        });
      }
    }
    tx.patchPublicState((publicState) => ({
      ...publicState,
      turnNumber: publicState.turnNumber + 1,
    }));
    const next = appendHistory(tx.state, {
      kind: "cleanup",
      actorPlayerId: playerId,
      cardId: null,
      summary: `${playerId} cleaned up and drew a replacement hand.`,
    });
    return accept(next, {
      instructions:
        shuffledDraw > 0
          ? [
              fx.effect(shuffleDeckForDraw, {
                playerId,
                zoneId: "deck",
                context: {
                  playerId,
                  drawCount: shuffledDraw,
                  checkEndAfterDraw: true,
                },
              }),
            ]
          : [fx.transition("checkGameEnd")],
    });
  },
});
