import { z } from "zod";
import { createGame } from "@dreamboard-games/sdk/reducer";
import manifest from "../manifest";
export const game = createGame({
  manifest,
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const play = game.phase("play");
export default game.assemble({
  initial: { public: () => ({}), private: () => ({}), hidden: () => ({}) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      actor: ({ state }) => state.table.playerOrder[0] ?? null,
      interactions: {},
    }),
  },
  views: { shared: game.views.empty(), player: game.views.empty() },
});
