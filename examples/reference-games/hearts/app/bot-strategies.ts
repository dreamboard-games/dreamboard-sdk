import { defineBots } from "@dreamboard-games/sdk/reducer";
import game from "./game";
import { RANK_VALUE } from "./rules";

type Card = ReturnType<typeof game.view>["hand"][number];

function rank(card: Card) {
  return RANK_VALUE[card.properties.rank];
}

function passRisk(card: Card) {
  if (card.id === "spades-Q") return 100;
  if (card.properties.suit === "spades" && rank(card) > 12)
    return 50 + rank(card);
  return rank(card);
}

export const botStrategies = defineBots(game, {
  resolve: { card: (view) => view.hand },
  strategies: [
    {
      id: "penalty-dodger",
      name: "Penalty Dodger",
      description: "Passes dangerous spades and ducks tricks.",
      score: {
        "passing.submit": {
          *candidates({ eligible, selection }) {
            const ranked = [...eligible.cards].sort(
              (a, b) => passRisk(b) - passRisk(a),
            );
            yield { cards: ranked.slice(0, selection.cards.count) };
          },
          score({ cards }) {
            return cards.reduce((sum, card) => sum + passRisk(card), 0);
          },
        },
        "playing.playCard"({ card, view }) {
          const lead = view.currentTrick[0]?.properties.suit;
          if (!lead) return -rank(card);
          if (card.properties.suit !== lead) {
            if (card.id === "spades-Q") return 100;
            return (card.properties.suit === "hearts" ? 20 : 0) + rank(card);
          }
          const winning = Math.max(
            ...view.currentTrick
              .filter((c) => c.properties.suit === lead)
              .map(rank),
          );
          return rank(card) < winning ? rank(card) : -rank(card);
        },
      },
    },
    {
      id: "moon-chaser",
      name: "Moon Chaser",
      description: "Keeps high cards and plays to win tricks.",
      score: {
        "passing.submit": {
          *candidates({ eligible, selection }) {
            const lowFirst = [...eligible.cards].sort(
              (a, b) => rank(a) - rank(b),
            );
            yield { cards: lowFirst.slice(0, selection.cards.count) };
          },
          score({ cards }) {
            return -cards.reduce((sum, card) => sum + rank(card), 0);
          },
        },
        "playing.playCard": ({ card }) => rank(card),
      },
    },
  ],
});
