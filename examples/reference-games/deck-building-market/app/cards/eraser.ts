import {
  cardInput,
  cardTarget,
  defineCardAction,
  defineInteraction,
  many,
} from "@dreamboard-games/sdk/reducer";
import { cardTypes, type CardId } from "../../shared/manifest-contract";
import type {
  GameContract,
  GameState,
  PlayerTurnPhaseState,
} from "../game-contract";
import { appendHistory, edit } from "../reducer-support";
import { validateTechniquePlay } from "./support";

export const eraser = defineCardAction<GameContract, PlayerTurnPhaseState>()({
  cardType: cardTypes.eraser,
  playFrom: "hand",
  rules: [
    {
      id: "technique-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      validate: ({ state, input }) =>
        validateTechniquePlay(state, input.playerId),
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
      actionsLeft: state.phase.actionsLeft - 1,
      step: "resolve",
      pendingTechnique: "eraser",
    });
    return accept(
      appendHistory(tx.state, {
        kind: "technique",
        actorPlayerId: input.playerId,
        cardId: input.params.cardId,
        summary: "Eraser is waiting for zero to four hand cards.",
      }),
    );
  },
});

const handTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .build();

export const resolveEraser = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  commit: { mode: "manual" },
  inputs: {
    cardIds: many(
      cardInput<GameState, CardId, readonly ["hand"]>({ target: handTarget }),
      { min: 0, max: 4 },
    ),
  },
  rules: [
    {
      id: "eraser-pending",
      errorCode: "NOT_RESOLVING_ERASER",
      available: ({ state }) =>
        state.phase.step === "resolve" &&
        state.phase.pendingTechnique === "eraser",
      validate({ state, input, q }) {
        if (state.flow.activePlayers[0] !== input.playerId) {
          return { errorCode: "NOT_YOUR_TURN" };
        }
        if (
          state.phase.step !== "resolve" ||
          state.phase.pendingTechnique !== "eraser"
        ) {
          return { errorCode: "NOT_RESOLVING_ERASER" };
        }
        const cardIds = input.params.cardIds ?? [];
        if (cardIds.length > 4) return { errorCode: "ERASER_LIMIT" };
        if (new Set(cardIds).size !== cardIds.length) {
          return { errorCode: "DUPLICATE_CARD" };
        }
        const hand = new Set(q.zone.playerCards(input.playerId, "hand"));
        return cardIds.every((cardId) => hand.has(cardId))
          ? null
          : { errorCode: "CARD_NOT_IN_HAND" };
      },
    },
  ],
  reduce({ state, input, accept }) {
    const cardIds = input.params.cardIds ?? [];
    const tx = edit(state);
    for (const cardId of cardIds) {
      tx.moveCardFromPlayerZoneToSharedZone({
        playerId: input.playerId,
        fromZoneId: "hand",
        toZoneId: "trash",
        cardId,
      });
    }
    tx.patchPhaseState({
      ...state.phase,
      step: "action",
      pendingTechnique: null,
    });
    return accept(
      appendHistory(tx.state, {
        kind: "techniqueResolved",
        actorPlayerId: input.playerId,
        cardId: null,
        summary: `Eraser trashed ${cardIds.length} card(s).`,
      }),
    );
  },
});
