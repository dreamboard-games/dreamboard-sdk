import { createGame, many } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const target = z.object({
  boardId: z.string(),
  playerId: z.string(),
  spaceId: z.string(),
});
const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        scope: "perPlayer",
        layout: "square",
        spaces: [{ id: "slot", row: 0, col: 0 }],
        edges: [],
        vertices: [],
        relations: [],
        containers: [],
      },
    ],
  },
  phases: { play: z.object({}) },
  state: {
    public: z.object({ selected: z.array(target) }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
/** Both seats have the same space ID; both complete tuples must survive the UI. */
export const playerBoardGame = model.assemble({
  initial: { public: () => ({ selected: [] }) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers([state.table.playerOrder[0]]);
      },
      interactions: {
        choose: play.interaction({
          inputs: {
            spaces: many(play.inputs.board.playerSpace({ boardId: "mat" }), {
              min: 2,
              max: 2,
              distinct: true,
            }),
          },
          reduce({ tx, input }) {
            tx.patchPublicState({ selected: input.params.spaces });
          },
        }),
      },
    }),
  },
  view: model.view(({ state }) => ({ selected: state.publicState.selected })),
});
