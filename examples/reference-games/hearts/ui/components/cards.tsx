import type { ViewCard } from "@dreamboard-games/sdk/ui";
import type {
  CardId,
  CardType,
  PlayingCardsCardProperties,
} from "../../shared/manifest-contract";

type Suit = "clubs" | "diamonds" | "spades" | "hearts";

export type PlayingCardView = ViewCard<
  CardId,
  CardType,
  PlayingCardsCardProperties
>;

const SUIT_GLYPH: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  spades: "♠",
  hearts: "♥",
};

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

const RED_SUITS: ReadonlySet<Suit> = new Set(["diamonds", "hearts"]);

function parseSuit(suit: string | undefined): Suit | undefined {
  return suit === "clubs" ||
    suit === "diamonds" ||
    suit === "spades" ||
    suit === "hearts"
    ? suit
    : undefined;
}

function isRed(suit: string | undefined): boolean {
  const parsed = parseSuit(suit);
  return !!parsed && RED_SUITS.has(parsed);
}

export function cardLabel(card: PlayingCardView): string {
  return card.name ?? `${card.properties.rank} of ${card.properties.suit}`;
}

// ─── Card visuals ─────────────────────────────────────────────────────────

export function PlayingCardContent({ card }: { card: PlayingCardView }) {
  const colorClass = isRed(card.properties.suit)
    ? "text-[#c0392b]"
    : "text-slate-800";
  const suit = parseSuit(card.properties.suit);
  const glyph = suit ? SUIT_GLYPH[suit] : "?";

  return (
    <div
      className={`flex h-full select-none flex-col items-stretch justify-between p-1 sm:p-1.5 ${colorClass}`}
    >
      <span className="text-left text-sm font-bold leading-none sm:text-base">
        {card.properties.rank}
      </span>
      <span className="text-center text-2xl leading-none sm:text-3xl">
        {glyph}
      </span>
      <span className="rotate-180 text-right text-sm font-bold leading-none sm:text-base">
        {card.properties.rank}
      </span>
    </div>
  );
}

export function PlayingCardTile({ card }: { card: PlayingCardView }) {
  return (
    <div className="h-[74px] w-[52px] overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_2px_5px_rgba(15,23,42,0.16)]">
      <PlayingCardContent card={card} />
    </div>
  );
}

export function HiddenPlayingCardTile() {
  return (
    <div className="h-[74px] w-[52px] rounded-lg border border-slate-700 bg-slate-800 shadow-[0_2px_5px_rgba(15,23,42,0.16)]" />
  );
}

export function renderPlayingCardContent(viewCard: PlayingCardView) {
  return <PlayingCardContent card={viewCard} />;
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
