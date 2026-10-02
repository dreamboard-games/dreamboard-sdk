import { createGame, hexagon } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
const target = z.object({
  boardId: z.string(),
  playerId: z.string(),
  spaceId: z.string(),
});
const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: { properties: {} },
        cards: [
          {
            id: "card",
            name: "Card",
            cardType: "card",
            count: 1,
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
    boards: [
      {
        id: "mat",
        name: "Mat",
        scope: "perPlayer",
        layout: "hex",
        shape: hexagon({ radius: 0 }),
      },
    ],
  },
  phases: { play: z.object({}) },
  state: {
    public: z.object({
      placed: target.nullable(),
      discarded: z.string().nullable(),
    }),
    private: z.object({}),
    hidden: z.object({}),
  },
});
const play = model.phase("play");
export const cardDropGame = model.assemble({
  initial: { public: () => ({ placed: null, discarded: null }) },
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
        refresh: play.interaction({ inputs: {}, reduce() {} }),
      },
    }),
  },
  view: model.view(({ state }) => ({
    placed: state.publicState.placed,
    discarded: state.publicState.discarded,
  })),
});
