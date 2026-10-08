import type { ViewOf } from "@dreamboard-games/sdk";
import type game from "../../app/game";

export type PlayingCardView = ViewOf<typeof game>["hand"][number];

const SUIT_ORDER: Record<PlayingCardView["properties"]["suit"], number> = {
  clubs: 0,
  diamonds: 1,
  spades: 2,
  hearts: 3,
};

const RANK_ORDER: Record<PlayingCardView["properties"]["rank"], number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

type CardFace = Pick<PlayingCardView, "properties"> | null;

/** Unknown faces remain at the end without inspecting hidden card data. */
function compareFaces(a: CardFace, b: CardFace, rankFirst: boolean) {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  const suit = SUIT_ORDER[a.properties.suit] - SUIT_ORDER[b.properties.suit];
  const rank = RANK_ORDER[a.properties.rank] - RANK_ORDER[b.properties.rank];
  return rankFirst ? rank || suit : suit || rank;
}

export function comparePlayingCards(a: CardFace, b: CardFace) {
  return compareFaces(a, b, false);
}

export function comparePlayingCardRanks(a: CardFace, b: CardFace) {
  return compareFaces(a, b, true);
}
