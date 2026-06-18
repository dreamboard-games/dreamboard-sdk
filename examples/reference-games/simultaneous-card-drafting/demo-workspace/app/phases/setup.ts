import type { GameContract } from "../game-contract";
import { setupPhaseStateSchema } from "../game-contract";
import { handSizeForPlayerCount } from "../rules/deal";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import { edit } from "../reducer-support";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q }) {
    const playerIds = q.player.order();
    const handSize = handSizeForPlayerCount(playerIds.length);
    const tx = edit(state);
    for (const playerId of playerIds) {
      tx.dealCardsToPlayerZone({
        fromZoneId: "draw-pile",
        playerId,
        toZoneId: "hand",
        count: handSize,
      });
    }
    tx.patchPublicState({
      round: 1,
      roundScoreByPlayer: {},
    });
    return accept(tx.state, { instructions: [fx.transition("drafting")] });
  },
});
