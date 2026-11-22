import {
  game,
  metadata,
  skips,
} from "../src/reducer/bundle/__fixtures__/scored-bot-game";
import { defineBots } from "../src/reducer/bundle/define-bots";

defineBots(game, {
  resolve: {
    card: (view) =>
      view.hand.map((card) => ({ ...card, value: card.rank * 2 })),
  },
  strategies: [
    {
      ...metadata,
      score: {
        ...skips,
        "play.end": ({ view }) => view.shield,
        "play.choose": ({ selectedCard, view }) =>
          selectedCard.value + view.shield,
        "passing.submit": ({ cards }) => {
          // @ts-expect-error Resolved selections are readonly.
          const mutable: (typeof cards)[number][] = cards;
          void mutable;
          return cards.reduce((score, card) => score + card.value, 0);
        },
      },
    },
  ],
});

const allSkipped = {
  ...skips,
  "play.end": "skip",
  "play.choose": "skip",
  "passing.submit": "skip",
} as const;
const { "passing.submit": _missingSubmit, ...missingSubmit } = allSkipped;
void _missingSubmit;

defineBots(game, {
  resolve: {},
  // @ts-expect-error Simultaneous submit is required for every strategy.
  strategies: [{ ...metadata, score: missingSubmit }],
});

const scoreCard = () => 1;
const resolve = { card: (view: ReturnType<typeof game.view>) => view.hand };

defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error Two client collectors require an explicit skip.
    { ...metadata, score: { ...allSkipped, "play.multi": scoreCard } },
  ],
});
defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error A card-shaped field name cannot type a form collector.
    { ...metadata, score: { ...allSkipped, "play.form": scoreCard } },
  ],
});
defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error Selections allowing repeated picks require an explicit skip.
    { ...metadata, score: { ...allSkipped, "play.repeated": scoreCard } },
  ],
});
defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error Variable-size selections require an explicit skip.
    { ...metadata, score: { ...allSkipped, "play.variable": scoreCard } },
  ],
});
defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error A single card input must end in Id.
    { ...metadata, score: { ...allSkipped, "play.malformed": scoreCard } },
  ],
});
defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error A card alias may not collide with the injected view.
    { ...metadata, score: { ...allSkipped, "play.reserved": scoreCard } },
  ],
});
// @ts-expect-error Scoring a card input requires a shared card resolver.
defineBots(game, {
  resolve: {},
  strategies: [
    { ...metadata, score: { ...allSkipped, "play.choose": scoreCard } },
  ],
});

const invalid = {
  card: (view: ReturnType<typeof game.view>) =>
    view.hand.map(({ rank }) => ({ rank })),
};
defineBots(game, {
  // @ts-expect-error A resolver must return items bearing card IDs.
  resolve: invalid,
  strategies: [{ ...metadata, score: allSkipped }],
});

defineBots(game, {
  resolve,
  strategies: [
    // @ts-expect-error Committed steps must be skipped even if they begin with a card.
    { ...metadata, score: { ...allSkipped, "play.staged": scoreCard } },
  ],
});
