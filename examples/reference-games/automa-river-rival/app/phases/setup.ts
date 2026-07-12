import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { setupPhaseStateSchema } from "../game-contract";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const playerIds = q.player.order();
    if (playerIds.length < 1 || playerIds.length > 2) {
      throw new Error("River Guild supports one or two human players.");
    }
    const tx = edit(state);
    for (let position = 0; position < 4; position += 1) {
      const cargoId = tx.q.zone.sharedCards("cargo-deck")[0];
      if (!cargoId) throw new Error("River Guild cargo deck is incomplete.");
      tx.moveCardBetweenSharedZones({
        fromZoneId: "cargo-deck",
        toZoneId: "river",
        cardId: cargoId,
      });
    }
    return accept(tx.state, {
      instructions: [fx.transition("humanTurn")],
    });
  },
});
