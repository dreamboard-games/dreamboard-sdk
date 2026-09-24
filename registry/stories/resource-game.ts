import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
  },
  phases: { play: z.object({}) },
  state: {
    public: z.object({ total: z.number() }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
/** A real reducer fixture proves partially edited resource bags and final total rules. */
export const resourceGame = model.assemble({
  initial: { public: () => ({ total: 0 }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers([state.table.playerOrder[0]]);
      },
      interactions: {
        pay: play.interaction({
          inputs: {
            resources: play.inputs.form.resourceMap({
              resources: [
                { resourceId: "wood", min: 1, max: 2 },
                { resourceId: "stone", min: 1, max: 2 },
              ],
            }),
          },
          rules: [
            {
              id: "exact-total",
              errorCode: "EXACT_TOTAL",
              validate: ({ input }) =>
                Object.values(input.params.resources).reduce(
                  (sum, value) => sum + value,
                  0,
                ) === 2,
            },
          ],
          reduce({ tx, input }) {
            tx.patchPublicState({
              total: Object.values(input.params.resources).reduce(
                (sum, value) => sum + value,
                0,
              ),
            });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => ({ total: state.publicState.total })),
});
