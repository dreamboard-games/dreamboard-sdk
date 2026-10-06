import { createGame, many } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const target = z.object({
  boardId: z.string(),
  spaceId: z.string(),
});
function createPlayerBoardGame(layout: "square" | "generic") {
  const geometry =
    layout === "square"
      ? ({ layout: "square" } as const)
      : ({ layout: "generic", spaces: [{ id: "slot" }] } as const);
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      zones: [],
      ...(layout === "square"
        ? ({
            tileTypes: [
              {
                id: "cell",
                name: "Cell",
                layout: "square",
                cells: [{ id: "slot", at: { col: 0, row: 0 } }],
              },
            ],
            tileSeeds: [
              {
                id: "cell",
                typeId: "cell",
                scope: "perPlayer",
                home: {
                  type: "board",
                  boardId: "mat",
                  layout: "square",
                  col: 0,
                  row: 0,
                  rotation: 0,
                },
              },
            ],
          } as const)
        : {}),
      boards: [
        {
          id: "mat",
          name: "Mat",
          scope: "perPlayer",
          ...geometry,
          relations: [],
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
  /** Both seats have the same local cell; both runtime targets must survive the UI. */
  return model.assemble({
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
}
export const playerBoardGame = createPlayerBoardGame("square");
export const genericBoardGame = createPlayerBoardGame("generic");
