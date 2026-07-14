import { definePhase } from "@dreamboard-games/sdk/reducer";
import { setupPhaseStateSchema, type GameContract } from "../game-contract";

const STARTING_RESOURCES = { wood: 1, stone: 1, coin: 2 } as const;

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const playerIds = q.player.order();
    if (playerIds.length !== 2) {
      throw new Error("Mosaic Workshop requires exactly two players.");
    }
    const tx = edit(state);
    for (const playerId of playerIds) {
      tx.addResources({ playerId, amounts: STARTING_RESOURCES });
    }
    return accept(tx.state, { instructions: [fx.transition("placement")] });
  },
});
