import { compileManifest } from "@dreamboard-games/sdk/reducer";
import { createGame, z, type PlayerId } from "@dreamboard-games/sdk/reducer";

const model = createGame({
  manifest: compileManifest({
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "zone", zoneId: "deck" },
        cards: [
          {
            id: "card",
            cardType: "card",
            name: "Card",
            count: 4,
            properties: {},
          },
        ],
      },
    ],
    zones: [
      { id: "deck", name: "Deck", scope: "shared", visibility: "hidden" },
      { id: "hand", name: "Hand", scope: "perPlayer", visibility: "public" },
    ],
  }),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
export const hostHandGame = model.assemble({
  initial: { public: () => ({}) },
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      enter({ tx, q }) {
        const players = q.player.order();
        for (const hostId of players)
          tx.deal({
            from: { zoneId: "deck" },
            to: { zoneId: "hand", hostId },
            count: 1,
          });
        tx.setActivePlayers([players[0]]);
      },
      interactions: {
        draw: play.interaction({
          inputs: {
            source: play.inputs.form.choice({
              choices: [{ value: "deck", label: "Deck" }],
              defaultValue: () => undefined,
            }),
            destination: play.inputs.form.choice<PlayerId>({
              choices: ({ q }) =>
                q.player.order().map((value) => ({ value, label: value })),
              defaultValue: () => undefined,
            }),
          },
          reduce({ tx, input }) {
            tx.deal({
              from: { zoneId: input.params.source },
              to: { zoneId: "hand", hostId: input.params.destination },
              count: 1,
            });
          },
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
