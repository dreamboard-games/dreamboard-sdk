import { z } from "zod";
import { createGame } from "../../authoring/game";
import { many } from "../../inputs/many";
import { compileManifest } from "../../manifest/compiler";

const cardIds = ["ace", "two", "three", "four"] as const;

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "detached" },
      cards: cardIds.map((id) => ({
        id,
        name: id,
        cardType: "standard",
        count: 1,
        properties: {},
      })),
    },
  ],
  zones: [
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["cards"],
    },
  ],
});

const state = z.object({});
const authoring = createGame({
  manifest,
  state: { public: state, private: state, hidden: state },
  phases: { play: state, passing: state },
});
const play = authoring.phase("play");
const passing = authoring.phase("passing");

const handCard = play.inputs.card({ from: ["hand"] });
const noop = () => undefined;
export const playerView = {
  shield: 3,
  hand: cardIds.map((id, index) => ({
    id: manifest.ids.cardId.parse(id),
    rank: index + 1,
  })),
};
const view = authoring.view(() => playerView);

const playPhase = play.define({
  kind: "player",
  initialState: () => ({}),
  interactions: {
    choose: play.interaction({
      inputs: { selectedCardId: handCard },
      reduce: noop,
    }),
    end: play.interaction({ inputs: {}, reduce: noop }),
    malformed: play.interaction({
      inputs: { cardIds: handCard },
      reduce: noop,
    }),
    reserved: play.interaction({
      inputs: { viewId: handCard },
      reduce: noop,
    }),
    staged: play.interaction({
      steps: play.steps().input("cardId", handCard),
      reduce: noop,
    }),
    multi: play.interaction({
      inputs: { cardId: handCard, otherCardId: handCard },
      reduce: noop,
    }),
    form: play.interaction({
      inputs: {
        cardId: play.inputs.form.choice({
          choices: [{ value: "ace", label: "Ace" }],
          defaultValue: "ace",
        }),
      },
      reduce: noop,
    }),
    repeated: play.interaction({
      inputs: {
        cardIds: many(handCard, {
          count: 2,
        }),
      },
      reduce: noop,
    }),
    variable: play.interaction({
      inputs: {
        cardIds: many(handCard, {
          min: 1,
          max: 2,
          distinct: true,
        }),
      },
      reduce: noop,
    }),
  },
});
export const game = authoring.assemble({
  view,
  phases: {
    play: playPhase,
    passing: passing.define({
      kind: "simultaneousPlayer",
      actors: ({ q }) => q.player.order(),
      initialState: () => ({}),
      submit: {
        inputs: {
          cardIds: many(passing.inputs.card({ from: ["hand"] }), {
            count: 3,
            distinct: true,
          }),
        },
      },
      resolve: noop,
    }),
  },
});

export const metadata = {
  id: "test",
  name: "Test",
  description: "Scores the available moves.",
};

export const skips = {
  "play.malformed": "skip",
  "play.reserved": "skip",
  "play.staged": "skip",
  "play.multi": "skip",
  "play.form": "skip",
  "play.repeated": "skip",
  "play.variable": "skip",
} as const;
