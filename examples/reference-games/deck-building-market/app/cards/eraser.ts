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

const TRASH_LIMIT = 4;

// Eraser: trash up to 4 cards from your hand. The Chapel.
//
// Playing the Eraser is a two-step interaction so the trash targets are
// selected from the *real* hand (canonical card-target selection), the same
// way Hearts' pass picks cards. Step one (`eraser`) just plays the card and
// arms the "resolve" step; step two (`resolveEraser`) collects the hand cards
// to trash. Splitting the play from the selection keeps the hand-tap router
// unambiguous: only `resolveEraser` is offered while the step is "resolve".
export const eraser = defineCardAction<GameContract, PlayerTurnPhaseState>()({
  cardType: cardTypes.eraser,
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
      actionsLeft: state.phase.actionsLeft - 1,
      step: "resolve",
      pendingAction: { kind: "eraser" },
    });
    return accept(tx.state);
  },
});

// "Trash" moves the chosen cards into the shared `trash` zone, where they
// cannot re-enter play. The collector accepts 0..4 cardIds from the hand —
// choosing none is legal (you simply commit the empty selection). The played
// Eraser is already in `in-play`, so the hand target naturally excludes it.
const trashTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .build();

export const resolveEraser = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  commit: { mode: "manual" },
  inputs: {
    trashedCardIds: many(
      cardInput<GameState, CardId, readonly ["hand"]>({ target: trashTarget }),
      { max: TRASH_LIMIT },
    ),
  },
  rules: [
    {
      id: "eraser-resolution-pending",
      errorCode: "NOT_RESOLVING_ERASER",
      available({ state }) {
        return (
          state.phase.step === "resolve" &&
          state.phase.pendingAction?.kind === "eraser"
        );
      },
      validate({ state, input }) {
        const turn = notYourTurn(state, input.playerId);
        if (turn) return turn;
        if (
          state.phase.step !== "resolve" ||
          state.phase.pendingAction?.kind !== "eraser"
        ) {
          return {
            errorCode: "NOT_RESOLVING_ERASER",
            message: "No Eraser to resolve.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept }) {
    const trashed = input.params.trashedCardIds ?? [];
    const tx = edit(state);
    for (const cardId of trashed) {
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
      pendingAction: null,
    });
    return accept(tx.state);
  },
});
