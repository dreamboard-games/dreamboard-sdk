import {
  cardInput,
  cardTarget,
  defineCardAction,
  defineInteraction,
} from "@dreamboard-games/sdk/reducer";
import { cardTypes, type CardId } from "../../shared/manifest-contract";
import type {
  GameContract,
  GameState,
  PlayerTurnPhaseState,
} from "../game-contract";
import { SUPPLY_ZONE_IDS } from "../model";
import { appendHistory, costOf, edit, pileForCard } from "../reducer-support";
import { validateTechniquePlay } from "./support";

function hasEligibleSupply(q: Parameters<typeof costOf>[0]): boolean {
  return SUPPLY_ZONE_IDS.some((zoneId) => {
    const cardId = q.zone.sharedCards(zoneId)[0];
    return cardId !== undefined && costOf(q, cardId) <= 4;
  });
}

export const studioVisit = defineCardAction<
  GameContract,
  PlayerTurnPhaseState
>()({
  cardType: cardTypes.studioVisit,
  playFrom: "hand",
  rules: [
    {
      id: "technique-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      available: ({ q }) => hasEligibleSupply(q),
      validate: ({ state, input, q }) =>
        validateTechniquePlay(state, input.playerId) ??
        (hasEligibleSupply(q)
          ? null
          : { errorCode: "NO_ELIGIBLE_STUDIO_VISIT_CARD" }),
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
      pendingTechnique: "studioVisit",
    });
    return accept(
      appendHistory(tx.state, {
        kind: "technique",
        actorPlayerId: input.playerId,
        cardId: input.params.cardId,
        summary:
          "Studio Visit is waiting for a supply card costing at most four.",
      }),
    );
  },
});

const supplyTarget = cardTarget
  .zones<GameState, CardId, typeof SUPPLY_ZONE_IDS>(SUPPLY_ZONE_IDS)
  .where({
    id: "top-card",
    errorCode: "NOT_TOP_CARD",
    test: ({ q, targetId }) =>
      q.zone.sharedCards(pileForCard(q, targetId))[0] === targetId,
  })
  .where({
    id: "cost-limit",
    errorCode: "OVER_COST_LIMIT",
    test: ({ q, targetId }) => costOf(q, targetId) <= 4,
  })
  .build();

export const resolveStudioVisit = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {
    cardId: cardInput<GameState, CardId, typeof SUPPLY_ZONE_IDS>({
      target: supplyTarget,
    }),
  },
  rules: [
    {
      id: "studio-visit-pending",
      errorCode: "NOT_RESOLVING_STUDIO_VISIT",
      available: ({ state }) =>
        state.phase.step === "resolve" &&
        state.phase.pendingTechnique === "studioVisit",
      validate({ state, input, q }) {
        if (state.flow.activePlayers[0] !== input.playerId) {
          return { errorCode: "NOT_YOUR_TURN" };
        }
        if (
          state.phase.step !== "resolve" ||
          state.phase.pendingTechnique !== "studioVisit"
        ) {
          return { errorCode: "NOT_RESOLVING_STUDIO_VISIT" };
        }
        const pileId = pileForCard(q, input.params.cardId);
        if (q.zone.sharedCards(pileId)[0] !== input.params.cardId) {
          return { errorCode: "NOT_TOP_CARD" };
        }
        return costOf(q, input.params.cardId) <= 4
          ? null
          : { errorCode: "OVER_COST_LIMIT" };
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const pileId = pileForCard(q, input.params.cardId);
    const tx = edit(state);
    tx.moveCardFromSharedZoneToPlayerZone({
      playerId: input.playerId,
      fromZoneId: pileId,
      toZoneId: "discard",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      step: "action",
      pendingTechnique: null,
    });
    return accept(
      appendHistory(tx.state, {
        kind: "techniqueResolved",
        actorPlayerId: input.playerId,
        cardId: input.params.cardId,
        summary: "Studio Visit gained a supply card to discard.",
      }),
    );
  },
});
