import { z } from "zod";
import { createGame } from "@dreamboard-games/sdk/reducer";
import manifest from "../manifest";
export const game = createGame({
  manifest,
  state: {
    public: z.object({ count: z.number().int() }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: { play: z.object({}) },
});
const play = game.phase("play");
export default game.assemble({
  initial: { public: () => ({ count: 0 }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers([state.table.playerOrder[0]]);
      },
      interactions: {
        increment: play.interaction({
          inputs: {},
          reduce({ tx, state }) {
            tx.patchPublicState({ count: state.publicState.count + 1 });
          },
        }),
      },
    }),
  },
  view: game.view(({ state }) => ({ count: state.publicState.count })),
});
