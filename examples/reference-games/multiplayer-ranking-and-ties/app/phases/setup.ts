import { definePhase } from "@dreamboard-games/sdk/reducer";
import { festivalCardIds, assertFestivalDeckComposition } from "../cards";
import {
  setupPhaseStateSchema,
  type GameContract,
  type PlayerId,
} from "../game-contract";
import {
  activePlayerId,
  assertPlayerCount,
  createCancellationOutcome,
  refillMarketPositions,
} from "../rules";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, endGame, fx, q, random }) {
    const playerIds = q.player.order() as readonly PlayerId[];
    assertPlayerCount(playerIds);
    const tableDeck = q.zone.sharedCards(
      "draw-pile",
    ) as readonly (typeof festivalCardIds)[number][];
    assertFestivalDeckComposition(tableDeck);
    const shuffledDeck = random.subset({
      from: festivalCardIds,
      count: festivalCardIds.length,
    });
    assertFestivalDeckComposition(shuffledDeck);
    const refill = refillMarketPositions({
      publicState: state.publicState,
      hiddenState: { festivalDeck: [...shuffledDeck] },
      marketIndices: [0, 1, 2, 3],
    });
    const tx = edit(state);
    for (const move of refill.moves) {
      tx.moveCardBetweenSharedZones({
        fromZoneId: "draw-pile",
        toZoneId: move.destination,
        cardId: move.cardId,
      });
    }
    tx.patchPublicState(refill.publicState);
    tx.patchHiddenState(refill.hiddenState);
    tx.setActivePlayers([]);

    if (refill.publicState.completed) {
      const outcome =
        refill.publicState.outcome ?? createCancellationOutcome(playerIds);
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    tx.setActivePlayers([activePlayerId(refill.publicState)]);
    return accept(tx.state, {
      instructions: [fx.transition("drafting")],
    });
  },
});
