import type { GameContract } from "../game-contract";
import { setupPhaseStateSchema } from "../game-contract";
import { dealRound } from "../rules/deal";
import { definePhase } from "@dreamboard-games/sdk/reducer";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q }) {
    const dealt = dealRound(state, q.player.order());
    return accept(
      {
        ...dealt,
        publicState: {
          ...dealt.publicState,
          round: 1,
          pick: 1,
          roundScoreByPlayer: {},
        },
      },
      { instructions: [fx.transition("drafting")] },
    );
  },
});
