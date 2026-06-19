import { z } from "zod";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { activePlayerId } from "./draft-flow";
import { edit } from "../reducer-support";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: z.object({}),
  initialState: () => ({}),
  enter({ state, accept, fx }) {
    const tx = edit(state);
    tx.setActivePlayers([activePlayerId(state.publicState)]);
    return accept(tx.state, { instructions: [fx.transition("drafting")] });
  },
});
