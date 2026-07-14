import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  setupPhaseStateSchema,
  type GameContract,
  weatherCardIds,
} from "../game-contract";
import { assertWeatherComposition } from "../rules";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q, random }) {
    const playerIds = q.player.order();
    if (playerIds.length !== 1) {
      throw new Error("Last Light requires exactly one human player.");
    }
    const weatherDeck = random.subset({
      from: weatherCardIds,
      count: weatherCardIds.length,
    });
    assertWeatherComposition(weatherDeck);
    const tx = edit(state);
    tx.patchHiddenState({ weatherDeck: [...weatherDeck] });
    tx.setActivePlayers([]);
    return accept(tx.state, {
      instructions: [fx.transition("playerTurn")],
    });
  },
});
