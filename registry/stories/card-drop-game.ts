import { compileManifest } from "@dreamboard-games/sdk/reducer";
import { createGame } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const target = z.object({
  boardId: z.string(),
  spaceId: z.string(),
});
const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        cards: [
          {
            id: "card",
            name: "Card",
            cardType: "card",
            count: 1,
            scope: "perPlayer",
            properties: {},
          },
        ],
        defaultHome: { type: "zone", zoneId: "table" },
      },
    ],
    zones: [
      {
        id: "table",
        name: "Table",
        scope: "shared",
        visibility: "public",
        allowedCardSetIds: ["cards"],
      },
    ],
    tileTypes: [
      {
        id: "cell",
        name: "Cell",
        layout: "hex",
        cells: [{ id: "cell", at: { q: 0, r: 0 } }],
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
          layout: "hex",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
    ],
    boards: [
      {
        id: "mat",
        name: "Mat",
        scope: "perPlayer",
        layout: "hex",
      },
    ],
  }),
  phases: { play: z.object({}) },
  state: {
    public: z.object({
      placed: target.nullable(),
      discarded: z.string().nullable(),
      destination: z.enum(["left", "right"]).nullable(),
    }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
export const cardDropGame = model.assemble({
  initial: {
    public: () => ({ placed: null, discarded: null, destination: null }),
  },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, state }) {
        tx.setActivePlayers([state.table.playerOrder[0]]);
      },
      interactions: {
        place: play.interaction({
          commit: { mode: "manual" },
          inputs: {
            card: play.inputs.card({ from: ["table"] }),
            space: play.inputs.board.playerSpace({ boardId: "mat" }),
          },
          reduce({ tx, input }) {
            tx.patchPublicState({ placed: input.params.space });
          },
        }),
        // Card-only: a dragged card lands on an area that runs it.
        discard: play.interaction({
          inputs: { card: play.inputs.card({ from: ["table"] }) },
          reduce({ tx, input }) {
            tx.patchPublicState({ discarded: input.params.card });
          },
        }),
        move: play.interaction({
          commit: { mode: "manual" },
          inputs: {
            card: play.inputs.card({ from: ["table"] }),
            destination: play.inputs.form.choice({
              choices: [
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ],
              defaultValue: () => undefined,
            }),
          },
          reduce({ tx, input }) {
            tx.patchPublicState({ destination: input.params.destination });
          },
        }),
        refresh: play.interaction({ inputs: {}, reduce() {} }),
      },
    }),
  },
  view: model.view(({ state }) => ({
    placed: state.publicState.placed,
    discarded: state.publicState.discarded,
    destination: state.publicState.destination,
  })),
});
