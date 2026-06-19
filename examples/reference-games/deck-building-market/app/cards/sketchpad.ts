import {
  cardInput,
  cardTarget,
  defineCardAction,
  defineInteraction,
  many,
} from "@dreamboard-games/sdk/reducer";
import { cardTypes, type CardId } from "../../shared/manifest-contract";
import {
  type GameContract,
  type GameState,
  type PlayerTurnPhaseState,
} from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";
import { notYourTurn } from "../phases/player-turn/rules";

// Sketchpad: +1 action. Discard any number of cards from your hand, then draw
// that many. Cellar.
//
// Two-step like Eraser: `sketchpad` plays the card and arms the "resolve"
// step, then `resolveSketchpad` collects the hand cards to discard directly
// from the real hand. The "+1 action" cancels the play cost, so playing it is
// net-neutral on `actionsLeft` (we leave the count untouched).
export const sketchpad = defineCardAction<GameContract, PlayerTurnPhaseState>()(
  {
    cardType: cardTypes.sketchpad,
    playFrom: "hand",
    rules: [
      {
        id: "action-card-playable",
        errorCode: "ACTION_CARD_NOT_PLAYABLE",
        validate: ({ state, input }) =>
          validateActionPlay(state, input.playerId),
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
        step: "resolve",
        pendingAction: { kind: "sketchpad" },
      });
      return accept(tx.state);
    },
  },
);

const discardTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .build();

export const resolveSketchpad = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  commit: { mode: "manual" },
  inputs: {
    discardedCardIds: many(
      cardInput<GameState, CardId, readonly ["hand"]>({
        target: discardTarget,
      }),
      { min: 0 },
    ),
  },
  rules: [
    {
      id: "sketchpad-resolution-pending",
      errorCode: "NOT_RESOLVING_SKETCHPAD",
      available({ state }) {
        return (
          state.phase.step === "resolve" &&
          state.phase.pendingAction?.kind === "sketchpad"
        );
      },
      validate({ state, input }) {
        const turn = notYourTurn(state, input.playerId);
        if (turn) return turn;
        if (
          state.phase.step !== "resolve" ||
          state.phase.pendingAction?.kind !== "sketchpad"
        ) {
          return {
            errorCode: "NOT_RESOLVING_SKETCHPAD",
            message: "No Sketchpad to resolve.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const player = input.playerId;
    const discarded = input.params.discardedCardIds ?? [];
    const tx = edit(state);
    for (const cardId of discarded) {
      tx.moveCardBetweenPlayerZones({
        playerId: player,
        fromZoneId: "hand",
        toZoneId: "discard",
        cardId,
      });
    }
    const deckSize = q.zone.playerCards(player, "deck").length;
    const drawCount = discarded.length;
    if (deckSize < drawCount) {
      tx.dealCardsBetweenPlayerZones({
        playerId: player,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: deckSize,
      });
      for (const cardId of q.zone.playerCards(player, "discard")) {
        tx.moveCardBetweenPlayerZones({
          playerId: player,
          fromZoneId: "discard",
          toZoneId: "deck",
          cardId,
        });
      }
      tx.dealCardsBetweenPlayerZones({
        playerId: player,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: drawCount - deckSize,
      });
    } else if (drawCount > 0) {
      tx.dealCardsBetweenPlayerZones({
        playerId: player,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: drawCount,
      });
    }
    tx.patchPhaseState({
      ...state.phase,
      step: "action",
      pendingAction: null,
    });
    return accept(tx.state);
  },
});
