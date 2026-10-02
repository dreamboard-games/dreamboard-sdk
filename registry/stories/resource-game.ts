import { createGame, many } from "@dreamboard-games/sdk/reducer";
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
/** Steppers must respect the domain's increment, including an unaligned maximum. */
export const numberStepGame = model.assemble({
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
        pick: play.interaction({
          inputs: {
            count: play.inputs.form.number({ min: 0, max: 5, step: 2 }),
            fraction: play.inputs.form.number({
              min: 0.25,
              max: 0.95,
              step: 0.25,
            }),
          },
          reduce({ tx, input }) {
            tx.patchPublicState({
              total: input.params.count + input.params.fraction,
            });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => ({ total: state.publicState.total })),
});
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

/** Array editors must submit arrays even for scalar/object inner domains. */
export const manyValueGame = model.assemble({
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
        batch: play.interaction({
          inputs: {
            counts: many(play.inputs.form.number({ min: 0, max: 5 }), {
              min: 1,
              max: 2,
            }),
            bags: many(
              play.inputs.form.resourceMap({
                resources: [{ resourceId: "wood", min: 0, max: 5 }],
              }),
              { min: 1, max: 2 },
            ),
          },
          reduce({ tx, input }) {
            tx.patchPublicState({
              total:
                input.params.counts.reduce((a, b) => a + b, 0) +
                input.params.bags.reduce(
                  (sum, bag) => sum + (bag.wood ?? 0),
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
