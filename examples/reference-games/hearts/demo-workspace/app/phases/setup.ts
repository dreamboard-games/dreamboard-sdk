import { z } from "zod";
import type { GameContract } from "../game-contract";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import { edit } from "../reducer-support";

const setupPhaseStateSchema = z.object({});

// Auto phase: deal 13 cards to each of the four seats from the setup-profile
// shuffled draw pile, then transition into the simultaneous passing barrier.
export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q }) {
    const playerIds = q.player.order();
    const tx = edit(state);
    for (const playerId of playerIds) {
      tx.dealCardsToPlayerZone({
        fromZoneId: "draw-pile",
        playerId,
        toZoneId: "hand",
        count: 13,
      });
    }
    return accept(tx.state, [fx.transition("passing")]);
  },
});
