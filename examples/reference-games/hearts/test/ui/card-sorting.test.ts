import { expect, test } from "vitest";
import {
  comparePlayingCards,
  comparePlayingCardRanks,
  type PlayingCardView,
} from "../../ui/components/cards";

type Face = Pick<PlayingCardView, "properties">;
const face = (
  suit: Face["properties"]["suit"],
  rank: Face["properties"]["rank"],
): Face => ({ properties: { suit, rank } });

const cards = [
  face("hearts", "2"),
  face("spades", "A"),
  face("diamonds", "2"),
  face("clubs", "10"),
  face("clubs", "2"),
  face("clubs", "A"),
  face("clubs", "K"),
  face("clubs", "Q"),
  face("clubs", "J"),
  face("spades", "2"),
];
const names = (values: readonly Face[]) =>
  values.map(({ properties: { suit, rank } }) => `${suit}-${rank}`);

test("Suit groups clubs, diamonds, spades and hearts with 2 through Ace within each suit", () => {
  expect(names([...cards].sort(comparePlayingCards))).toEqual([
    "clubs-2",
    "clubs-10",
    "clubs-J",
    "clubs-Q",
    "clubs-K",
    "clubs-A",
    "diamonds-2",
    "spades-2",
    "spades-A",
    "hearts-2",
  ]);
});

test("Rank uses 2 through Ace with the same suit order to break equal ranks", () => {
  expect(names([...cards].sort(comparePlayingCardRanks))).toEqual([
    "clubs-2",
    "diamonds-2",
    "spades-2",
    "hearts-2",
    "clubs-10",
    "clubs-J",
    "clubs-Q",
    "clubs-K",
    "clubs-A",
    "spades-A",
  ]);
});

for (const compare of [comparePlayingCards, comparePlayingCardRanks]) {
  test(`${compare.name} keeps hidden views last with stable equal-card ties`, () => {
    const shown = face("clubs", "2");
    expect(compare(null, null)).toBe(0);
    expect(compare(shown, shown)).toBe(0);
    expect(compare(null, shown)).toBeGreaterThan(0);
    expect(compare(shown, null)).toBeLessThan(0);
    expect([null, shown, null].sort(compare)).toEqual([shown, null, null]);
  });
}
