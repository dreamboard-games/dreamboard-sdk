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
import { appendHistory, edit, inspirationOf } from "../../../reducer-support";
import { notYourTurn } from "../rules";

export const endActionStep = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {},
  rules: [
    {
      id: "active-player",
      errorCode: "NOT_YOUR_TURN",
      validate: ({ state, input }) => notYourTurn(state, input.playerId),
    },
  ],
  reduce({ state, input, accept }) {
    const tx = edit(state);
    tx.patchPhaseState({ ...state.phase, step: "buy" });
    return accept(
      appendHistory(tx.state, {
        kind: "actionStepEnded",
        actorPlayerId: input.playerId,
        cardId: null,
        summary: `${input.playerId} entered the buy step.`,
      }),
    );
  },
});

const inspirationTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .where({
    id: "inspiration-card",
    errorCode: "NOT_AN_INSPIRATION_CARD",
    test: ({ q, targetId }) => inspirationOf(q, targetId) !== null,
  })
  .build();

export const playInspiration = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {
    cardId: cardInput<GameState, CardId, readonly ["hand"]>({
      target: inspirationTarget,
    }),
  },
  rules: [
    {
      id: "active-player",
      errorCode: "NOT_YOUR_TURN",
      validate({ state, input, q }) {
        return (
          notYourTurn(state, input.playerId) ??
          (inspirationOf(q, input.params.cardId) === null
            ? { errorCode: "NOT_AN_INSPIRATION_CARD" }
            : null)
        );
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const inspiration = inspirationOf(q, input.params.cardId);
    if (inspiration === null) throw new Error("Expected Inspiration card.");
    const tx = edit(state);
    tx.moveCardBetweenPlayerZones({
      playerId: input.playerId,
      fromZoneId: "hand",
      toZoneId: "in-play",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      inspiration: state.phase.inspiration + inspiration,
    });
    return accept(
      appendHistory(tx.state, {
        kind: "inspirationPlayed",
        actorPlayerId: input.playerId,
        cardId: input.params.cardId,
        summary: `${input.playerId} gained ${inspiration} inspiration.`,
      }),
    );
  },
});
