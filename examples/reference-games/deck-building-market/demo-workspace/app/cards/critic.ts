import { defineCardAction } from "@dreamboard-games/sdk/reducer";
import { cardTypes, literals } from "../../shared/manifest-contract";
import type { GameContract, PlayerTurnPhaseState } from "../game-contract";
import { edit } from "../reducer-support";
import { validateActionPlay } from "./support";

// Critic: +2 cards. Each opponent gains a Smudge (-1 VP) into their
// discard pile.
//
// This is the canonical attack pattern. Witch in Dominion is also
// unconditional — there's no Moat-style reaction defense in
// Sketchbook's Wave 2 cut. If the Smudge pile is empty, opponents
// simply don't gain anything; the +2 cards still resolves.
export const critic = defineCardAction<GameContract, PlayerTurnPhaseState>()({
  cardType: cardTypes.critic,
  playFrom: "hand",
  rules: [
    {
      id: "action-card-playable",
      errorCode: "ACTION_CARD_NOT_PLAYABLE",
      validate: ({ state, input }) => validateActionPlay(state, input.playerId),
    },
  ],
  reduce({ state, input, accept, q }) {
    const player = input.playerId;
    const opponents = q.player.order().filter((id) => id !== player);
    const smudgePileId = literals.homeSharedZoneIdByCardType[cardTypes.smudge];

    const smudgePile = q.zone.sharedCards(smudgePileId);
    const tx = edit(state);
    tx.moveCardBetweenPlayerZones({
      playerId: player,
      fromZoneId: "hand",
      toZoneId: "in-play",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      actionsLeft: state.phase.actionsLeft - 1,
    });
    const deckSize = q.zone.playerCards(player, "deck").length;
    if (deckSize < 2) {
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
        count: 2 - deckSize,
      });
    } else {
      tx.dealCardsBetweenPlayerZones({
        playerId: player,
        fromZoneId: "deck",
        toZoneId: "hand",
        count: 2,
      });
    }
    for (const [index, opponentId] of opponents.entries()) {
      const smudgeId = smudgePile[index];
      if (!smudgeId) continue;
      tx.moveCardFromSharedZoneToPlayerZone({
        playerId: opponentId,
        fromZoneId: smudgePileId,
        toZoneId: "discard",
        cardId: smudgeId,
      });
    }

    return accept(tx.state);
  },
});
