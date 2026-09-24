import type { ViewOf } from "@dreamboard-games/sdk";
import type game from "../../app/game";

type Suit = "clubs" | "diamonds" | "spades" | "hearts";
export type PlayingCardView = ViewOf<typeof game>["hand"][number];

const SUIT_ORDER: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  spades: 2,
  hearts: 3,
};

const RANK_ORDER: Record<string, number> = {
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

function parseSuit(suit: string | undefined): Suit | undefined {
  return suit === "clubs" ||
    suit === "diamonds" ||
    suit === "spades" ||
    suit === "hearts"
    ? suit
    : undefined;
}

function stringProperty(
  properties: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = properties[key];
  return typeof value === "string" ? value : undefined;
}

export function comparePlayingCards(
  a: {
    hidden?: boolean;
    properties?: Record<string, unknown>;
  },
  b: {
    hidden?: boolean;
    properties?: Record<string, unknown>;
  },
) {
  const aProperties = a.hidden ? undefined : a.properties;
  const bProperties = b.hidden ? undefined : b.properties;
  const aSuit = parseSuit(
    aProperties ? stringProperty(aProperties, "suit") : undefined,
  );
  const bSuit = parseSuit(
    bProperties ? stringProperty(bProperties, "suit") : undefined,
  );
  const sa = aSuit ? SUIT_ORDER[aSuit] : 99;
  const sb = bSuit ? SUIT_ORDER[bSuit] : 99;
  if (sa !== sb) return sa - sb;
  const ra =
    RANK_ORDER[
      aProperties ? (stringProperty(aProperties, "rank") ?? "") : ""
    ] ?? 0;
  const rb =
    RANK_ORDER[
      bProperties ? (stringProperty(bProperties, "rank") ?? "") : ""
    ] ?? 0;
  return ra - rb;
}
