import { defineCardAction } from "@dreamboard-games/sdk/reducer";
import { cardTypes } from "../../shared/manifest-contract";
import type { GameContract, PlayerTurnPhaseState } from "../game-contract";
import { shuffleDeckForDraw } from "../effects/deck";
import { appendHistory, edit, prepareMidTurnDraw } from "../reducer-support";
import { validateTechniquePlay } from "./support";

export const brainstorm = defineCardAction<
  GameContract,
  PlayerTurnPhaseState
>()({
  cardType: cardTypes.brainstorm,
  playFrom: "hand",
  rules: [
    {
      id: "technique-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      validate: ({ state, input }) =>
        validateTechniquePlay(state, input.playerId),
    },
  ],
  reduce({ state, input, accept, q, fx }) {
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
    const draw = prepareMidTurnDraw({
      state: tx.state,
      q,
      playerId: input.playerId,
      count: 3,
    });
    const next = appendHistory(draw.state, {
      kind: "technique",
      actorPlayerId: input.playerId,
      cardId: input.params.cardId,
      summary: "Brainstorm drew three cards where available.",
    });
    return accept(next, {
      instructions:
        draw.shuffleDrawCount > 0
          ? [
              fx.effect(shuffleDeckForDraw, {
                playerId: input.playerId,
                zoneId: "deck",
                context: {
                  playerId: input.playerId,
                  drawCount: draw.shuffleDrawCount,
                  checkEndAfterDraw: false,
                },
              }),
            ]
          : [],
    });
  },
});
