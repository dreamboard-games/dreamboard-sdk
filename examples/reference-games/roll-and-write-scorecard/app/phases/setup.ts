import { definePhase } from "@dreamboard-games/sdk/reducer";
import { setupPhaseStateSchema, type GameContract } from "../game-contract";
import { createInitialPublicState, startRound } from "../model";
import { edit } from "../reducer-support";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q }) {
    const playerIds = q.player.order();
    const firstPlayer = playerIds[0];
    if (!firstPlayer) {
      throw new Error("Cloudline Survey requires at least one player.");
    }
    const tx = edit(state);
    tx.patchPublicState(startRound(createInitialPublicState(playerIds)));
    tx.setActivePlayers([firstPlayer]);
    return accept(tx.state, { instructions: [fx.transition("markSurvey")] });
  },
});
