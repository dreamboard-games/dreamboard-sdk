import {
  cardInput,
  cardTarget,
  defineCardAction,
  defineInteraction,
} from "@dreamboard-games/sdk/reducer";
import {
  cardTypes,
  literals,
  type CardId,
} from "../../shared/manifest-contract";
import {
  type GameContract,
  type GameState,
  type PlayerTurnPhaseState,
} from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";
import { notYourTurn } from "../phases/player-turn/rules";

const COST_LIMIT = 4;

const GAINABLE_SUPPLY_ZONES = [
  "supply-brainstorm",
  "supply-studio",
  "supply-gallery",
  "supply-open-mic",
  "supply-critic",
  "supply-eraser",
  "supply-sketchpad",
  "supply-studio-visit",
  "supply-doodle",
  "supply-sketch",
  "supply-inkwork",
  "supply-idea",
  "supply-concept",
  "supply-masterpiece",
  "supply-smudge",
] as const;

// Studio Visit: gain a card costing up to 4 from the supply. Workshop.
//
// Two-step like Eraser/Sketchpad: `studioVisit` plays the card and arms the
// "resolve" step, then `resolveStudioVisit` picks the supply pile to gain from
// by tapping its top card (canonical supply card-target, same shape as
// `buyCard`). The chosen card lands in the player's discard pile.
export const studioVisit = defineCardAction<
  GameContract,
  PlayerTurnPhaseState
>()({
  cardType: cardTypes.studioVisit,
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
      pendingAction: { kind: "studioVisit" },
    });
    return accept(tx.state);
  },
});

const gainTarget = cardTarget
  .zones<GameState, CardId, typeof GAINABLE_SUPPLY_ZONES>(GAINABLE_SUPPLY_ZONES)
  .where({
    id: "top-card",
    errorCode: "NOT_TOP_CARD",
    message: "Gain the top card of a supply pile.",
    test: ({ q, targetId }) => {
      const card = q.card.get(targetId);
      const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
      return q.zone.sharedCards(pileId)[0] === targetId;
    },
  })
  .where({
    id: "cost-limit",
    errorCode: "OVER_COST_LIMIT",
    message: `Studio Visit can only gain cards costing ${COST_LIMIT} or less.`,
    test: ({ q, targetId }) =>
      q.card.get(targetId).properties.cost <= COST_LIMIT,
  })
  .build();

export const resolveStudioVisit = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {
    gainCardId: cardInput<GameState, CardId, typeof GAINABLE_SUPPLY_ZONES>({
      target: gainTarget,
    }),
  },
  rules: [
    {
      id: "studio-visit-resolution-pending",
      errorCode: "NOT_RESOLVING_STUDIO_VISIT",
      available({ state }) {
        return (
          state.phase.step === "resolve" &&
          state.phase.pendingAction?.kind === "studioVisit"
        );
      },
      validate({ state, input, q }) {
        const turn = notYourTurn(state, input.playerId);
        if (turn) return turn;
        if (
          state.phase.step !== "resolve" ||
          state.phase.pendingAction?.kind !== "studioVisit"
        ) {
          return {
            errorCode: "NOT_RESOLVING_STUDIO_VISIT",
            message: "No Studio Visit to resolve.",
          };
        }
        const cardId = input.params.gainCardId;
        if (!cardId) return null;
        const card = q.card.get(cardId);
        const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
        if (q.zone.sharedCards(pileId)[0] !== cardId) {
          return { errorCode: "NOT_TOP_CARD", message: "Gain the top card." };
        }
        if (card.properties.cost > COST_LIMIT) {
          return {
            errorCode: "OVER_COST_LIMIT",
            message: `Studio Visit can only gain cards costing ${COST_LIMIT} or less.`,
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const cardId = input.params.gainCardId;
    const card = q.card.get(cardId);
    const pileId = literals.homeSharedZoneIdByCardType[card.cardType];
    const tx = edit(state);
    tx.moveCardFromSharedZoneToPlayerZone({
      playerId: input.playerId,
      fromZoneId: pileId,
      toZoneId: "discard",
      cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      step: "action",
      pendingAction: null,
    });
    return accept(tx.state);
  },
});
