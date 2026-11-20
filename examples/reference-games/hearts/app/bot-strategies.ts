import {
  offeredInteraction,
  offeredInputDomain,
  type BotStrategy,
} from "@dreamboard-games/sdk/reducer";
import type game from "./game";
import { RANK_VALUE } from "./rules";

type Strategy = BotStrategy<typeof game>;
type Frame = Parameters<Strategy["decide"]>[0];
type Card = NonNullable<Frame["view"]>["hand"][number];

function rank(card: Card) {
  return RANK_VALUE[card.properties.rank];
}

function risk(card: Card) {
  if (card.id === "spades-Q") return 100;
  if (card.properties.suit === "spades" && rank(card) > 12)
    return 50 + rank(card);
  return rank(card);
}

// Array.sort is stable, so ties keep the order of the projected hand.
function ordered(cards: readonly Card[], score: (card: Card) => number) {
  return [...cards].sort((left, right) => score(right) - score(left));
}

function chooseCards(
  frame: Frame,
  pass: (cards: readonly Card[]) => Card[],
  play: (cards: readonly Card[], trick: readonly Card[]) => Card,
) {
  if (!frame.view) return null;
  const { hand, currentTrick } = frame.view;
  const passDomain = offeredInputDomain(
    offeredInteraction(frame, "passing.submit"),
    "cardIds",
    "cardTarget",
  );
  if (passDomain) {
    const eligible = hand.filter((card) =>
      passDomain.eligibleTargets.includes(card.id),
    );
    return {
      interactionId: "submit" as const,
      params: {
        cardIds: pass(eligible)
          .slice(0, 3)
          .map((card) => card.id),
      },
    };
  }
  const playDomain = offeredInputDomain(
    offeredInteraction(frame, "playing.playCard"),
    "cardId",
    "cardTarget",
  );
  if (playDomain) {
    const eligible = hand.filter((card) =>
      playDomain.eligibleTargets.includes(card.id),
    );
    return {
      interactionId: "playCard" as const,
      params: { cardId: play(eligible, currentTrick).id },
    };
  }
  return null;
}

export const botStrategies = [
  {
    id: "penalty-dodger",
    name: "Penalty Dodger",
    description: "Passes dangerous spades and ducks under the winning card.",
    decide(frame) {
      return chooseCards(
        frame,
        (cards) => ordered(cards, risk),
        (cards, trick) => {
          const lead = trick[0]?.properties.suit;
          if (lead && cards[0].properties.suit !== lead)
            return ordered(cards, (card) =>
              card.id === "spades-Q"
                ? 100
                : (card.properties.suit === "hearts" ? 20 : 0) + rank(card),
            )[0];
          const winningRank = Math.max(
            ...trick.filter((card) => card.properties.suit === lead).map(rank),
          );
          const ducks = cards.filter((card) => rank(card) < winningRank);
          return ducks.length
            ? ordered(ducks, rank)[0]
            : ordered(cards, (card) => -rank(card))[0];
        },
      );
    },
  },
  {
    id: "moon-chaser",
    name: "Moon Chaser",
    description: "Passes low cards and tries to win tricks with high cards.",
    decide(frame) {
      return chooseCards(
        frame,
        (cards) => ordered(cards, (card) => -rank(card)),
        (cards) => ordered(cards, rank)[0],
      );
    },
  },
] satisfies readonly Strategy[];
