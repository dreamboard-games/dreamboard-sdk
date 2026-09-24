import { z } from "zod";
import { createGame } from "../../../reducer.js";

export function providerGame(onInitialize: () => void = () => {}) {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      zones: [],
    },
    options: z.object({ finishImmediately: z.boolean().default(false) }),
    phases: { play: z.object({ finish: z.boolean() }), end: z.object({}) },
    state: {
      public: z.object({ count: z.number() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initial: {
      public: () => {
        onInitialize();
        return { count: 0 };
      },
    },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: ({ options }) => ({ finish: options.finishImmediately }),
        enter({ tx, state }) {
          if (state.phase.finish)
            return tx.endGame(
              {
                reason: { code: "complete" },
                standings: [
                  {
                    playerId: state.table.playerOrder[0],
                    rank: 1,
                    result: "win",
                  },
                  {
                    playerId: state.table.playerOrder[1],
                    rank: 2,
                    result: "loss",
                  },
                ],
              },
              { transition: "end" },
            );
          tx.setActivePlayers([state.table.playerOrder[0]]);
        },
        interactions: {
          add: play.interaction({
            inputs: {
              amount: play.inputs.form.number({
                min: 1,
                max: 3,
                defaultValue: 1,
              }),
            },
            reduce({ tx, input }) {
              tx.patchPublicState({ count: input.params.amount });
            },
          }),
        },
      }),
      end: model
        .phase("end")
        .define({ kind: "auto", initialState: () => ({}) }),
    },
    view: model.view(({ state }) => ({ count: state.publicState.count })),
  });
}
