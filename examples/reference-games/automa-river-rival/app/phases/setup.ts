import { z } from "zod";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: z.object({}),
  initialState: () => ({}),
  enter({ state, accept, fx }) {
    return accept(state, { instructions: [fx.transition("humanTurn")] });
  },
});
