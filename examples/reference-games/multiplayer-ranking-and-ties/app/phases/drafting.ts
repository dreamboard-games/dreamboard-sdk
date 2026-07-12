import {
  cardInput,
  cardTarget,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";
import {
  draftingPhaseStateSchema,
  type CardId,
  type GameContract,
  type GameState,
} from "../game-contract";
import { activePlayerId, draftStall } from "../rules";

const MARKET_ZONES = ["market"] as const;
const marketStallTarget = cardTarget
  .zones<GameState, CardId, typeof MARKET_ZONES>(MARKET_ZONES)
  .where({
    id: "current-market-stall",
    errorCode: "CARD_NOT_AVAILABLE",
    message: "Choose a face-up stall currently in the market.",
    test: ({ state, targetId }) => state.publicState.market.includes(targetId),
  })
  .build();

const draftStallInteraction = defineInteraction<
  GameContract,
  typeof draftingPhaseStateSchema
>()({
  presentation: {
    label: "Draft stall",
    help: "Add one face-up market stall to your public festival row.",
  },
  inputs: {
    stallId: cardInput<GameState, CardId, typeof MARKET_ZONES>({
      target: marketStallTarget,
    }),
  },
  reduce({ state, input, accept, edit, endGame, fx, reject }) {
    const result = draftStall({
      publicState: state.publicState,
      hiddenState: state.hiddenState,
      playerId: input.playerId,
      stallId: input.params.stallId,
    });
    if (!result.accepted) {
      return reject(result.errorCode, result.message);
    }

    const tx = edit(state);
    tx.moveCardFromSharedZoneToPlayerZone({
      playerId: input.playerId,
      fromZoneId: "market",
      toZoneId: "festival-row",
      cardId: result.draftedCardId,
    });
    for (const move of result.refillMoves) {
      tx.moveCardBetweenSharedZones({
        fromZoneId: "draw-pile",
        toZoneId: move.destination,
        cardId: move.cardId,
      });
    }
    tx.patchPublicState(result.publicState);
    tx.patchHiddenState(result.hiddenState);
    tx.setActivePlayers([]);

    if (result.publicState.completed) {
      const outcome = result.publicState.outcome;
      if (!outcome) {
        throw new Error("Harbor Fair completed without an outcome.");
      }
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    tx.setActivePlayers([activePlayerId(result.publicState)]);
    return accept(tx.state);
  },
});

export const drafting = definePhase<GameContract>()({
  kind: "player",
  state: draftingPhaseStateSchema,
  initialState: () => ({}),
  actor: ({ state }) => activePlayerId(state.publicState),
  enter({ state, accept, edit }) {
    const tx = edit(state);
    tx.setActivePlayers([activePlayerId(state.publicState)]);
    return accept(tx.state);
  },
  interactions: {
    draftStall: draftStallInteraction,
  },
});
