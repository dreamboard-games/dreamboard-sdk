import {
  cardInput,
  cardTarget,
  defineInteraction,
} from "@dreamboard-games/sdk/reducer";
import type {
  GameContract,
  GameState,
  PlayerTurnPhaseState,
} from "../../../game-contract";
import { edit } from "../../../reducer-support";
import type { CardId } from "../../../../shared/manifest-contract";
import { notYourTurn, treasureCoins } from "../rules";

export const endActionPhase = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {},
  rules: [
    {
      id: "active-player-can-end-action-phase",
      errorCode: "NOT_YOUR_TURN",
      validate({ state, input }) {
        return notYourTurn(state, input.playerId);
      },
    },
  ],
  reduce({ state, accept }) {
    const tx = edit(state);
    tx.patchPhaseState({ step: "buy" as const });
    return accept(tx.state);
  },
});

// Play a single treasure from hand for its coins. Lets players tap an
// individual treasure in the buy step instead of only the bulk
// `playAllTreasures`. The collector filters the hand to treasure cards.
const treasureTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .where({
    id: "is-treasure",
    errorCode: "NOT_A_TREASURE",
    message: "Only treasures can be played for coins.",
    test: ({ q, targetId }) => treasureCoins(q.card.get(targetId)) !== null,
  })
  .build();

export const playTreasure = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {
    cardId: cardInput<GameState, CardId, readonly ["hand"]>({
      target: treasureTarget,
    }),
  },
  rules: [
    {
      id: "active-player-can-play-treasure",
      errorCode: "NOT_YOUR_TURN",
      validate({ state, input }) {
        return notYourTurn(state, input.playerId);
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const coins = treasureCoins(q.card.get(input.params.cardId)) ?? 0;
    const tx = edit(state);
    tx.moveCardBetweenPlayerZones({
      playerId: input.playerId,
      fromZoneId: "hand",
      toZoneId: "in-play",
      cardId: input.params.cardId,
    });
    tx.patchPhaseState({
      ...state.phase,
      coins: state.phase.coins + coins,
    });
    return accept(tx.state);
  },
});

export const playAllTreasures = defineInteraction<
  GameContract,
  PlayerTurnPhaseState
>()({
  inputs: {},
  rules: [
    {
      id: "active-player-can-play-treasures",
      errorCode: "NOT_YOUR_TURN",
      validate({ state, input }) {
        return notYourTurn(state, input.playerId);
      },
    },
    {
      id: "has-treasures-in-hand",
      errorCode: "NO_TREASURES",
      message: "No treasures in hand.",
      available({ input, q }) {
        return q.zone
          .playerCards(input.playerId, "hand")
          .some((cardId) => treasureCoins(q.card.get(cardId)) !== null);
      },
      validate({ input, q }) {
        const hasTreasure = q.zone
          .playerCards(input.playerId, "hand")
          .some((cardId) => treasureCoins(q.card.get(cardId)) !== null);
        if (!hasTreasure) {
          return {
            errorCode: "NO_TREASURES",
            message: "No treasures in hand.",
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const treasureCards = q.zone
      .playerCards(input.playerId, "hand")
      .map((cardId) => ({ cardId, coins: treasureCoins(q.card.get(cardId)) }))
      .filter(
        (entry): entry is { cardId: CardId; coins: number } =>
          entry.coins !== null,
      );
    const coins = treasureCards.reduce((sum, card) => sum + card.coins, 0);
    const tx = edit(state);
    for (const { cardId } of treasureCards) {
      tx.moveCardBetweenPlayerZones({
        playerId: input.playerId,
        fromZoneId: "hand",
        toZoneId: "in-play",
        cardId,
      });
    }
    tx.patchPhaseState({
      ...state.phase,
      coins: state.phase.coins + coins,
    });
    return accept(tx.state);
  },
});
