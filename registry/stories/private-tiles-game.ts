import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [{ id: "bag", name: "Bag", scope: "shared", visibility: "hidden" }],
    boards: [{ id: "map", name: "Map", scope: "shared", layout: "square" }],
    tileTypes: [
      {
        id: "secret-island",
        name: "SECRET_ISLAND",
        layout: "square",
        cells: [
          { id: "secret-west", at: { col: 0, row: 0 } },
          { id: "secret-east", at: { col: 1, row: 0 } },
        ],
      },
      {
        id: "secret-grove",
        name: "SECRET_GROVE",
        layout: "square",
        cells: [
          { id: "secret-root", at: { col: 0, row: 0 } },
          { id: "secret-crown", at: { col: 0, row: 1 } },
        ],
      },
    ],
    tileSeeds: [
      {
        id: "island",
        typeId: "secret-island",
        home: { type: "zone", zoneId: "bag" },
        disclosure: {
          face: { audience: "none" },
          appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
        },
      },
      {
        id: "grove",
        typeId: "secret-grove",
        home: { type: "zone", zoneId: "bag" },
        disclosure: {
          face: { audience: "none" },
          appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
        },
      },
    ],
  },
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
export const privateTilesGame = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers(state.table.playerOrder);
      },
      interactions: {
        place: play.interaction({
          steps: play
            .steps()
            .input("tile", play.inputs.tile({ from: ["bag"] }))
            .input(
              "confirm",
              play.inputs.form.choice({
                choices: [{ value: "place", label: "Place" }],
                defaultValue: () => undefined,
              }),
            ),
          reduce({ tx, input }) {
            tx.placeTile({
              boardId: "map",
              tileId: input.tile,
              at: { col: 0, row: 0, rotation: 0 },
            });
          },
        }),
        track: play.interaction({
          steps: play
            .steps()
            .input("tile", play.inputs.tile({ from: ["bag"], boards: ["map"] }))
            .input(
              "confirm",
              play.inputs.form.choice({
                choices: [{ value: "finish", label: "Finish" }],
                defaultValue: () => undefined,
              }),
            ),
          reduce() {},
        }),
        shuffle: play.interaction({
          inputs: {},
          reduce({ tx }) {
            tx.shuffle({ zone: { zoneId: "bag" } });
          },
        }),
        reveal: play.interaction({
          inputs: {},
          reduce({ tx }) {
            for (const tileId of ["island", "grove"] as const)
              if (tx.state.table.componentLocations[tileId].type === "OnBoard")
                tx.setTileDisclosure({
                  tileId,
                  disclosure: { face: { audience: "public" } },
                });
          },
        }),
        cell: play.interaction({
          inputs: { cell: play.inputs.board.space({ boardId: "map" }) },
          reduce() {},
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
