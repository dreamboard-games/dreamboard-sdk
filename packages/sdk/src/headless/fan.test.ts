import { describe, expect, it } from "vitest";
import { fanLayout, liftFanCard, type FanCard } from "./fan.js";

const card = { cardWidth: 72, cardHeight: 100 };
const phone = { ...card, width: 358 };

function corners({ x, y, rotate }: FanCard) {
  const theta = (rotate * Math.PI) / 180;
  const cx = x + card.cardWidth / 2;
  const cy = y + card.cardHeight / 2;
  return [-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => {
      const dx = (sx * card.cardWidth) / 2;
      const dy = (sy * card.cardHeight) / 2;
      return {
        x: cx + dx * Math.cos(theta) - dy * Math.sin(theta),
        y: cy + dx * Math.sin(theta) + dy * Math.cos(theta),
      };
    }),
  );
}
const centre = ({ x, y }: FanCard) => ({
  x: x + card.cardWidth / 2,
  y: y + card.cardHeight / 2,
});
const distance = (a: FanCard, b: FanCard) =>
  Math.hypot(centre(a).x - centre(b).x, centre(a).y - centre(b).y);

describe("fanLayout", () => {
  it("lays nothing for no cards and one upright card for one", () => {
    expect(fanLayout({ ...phone, count: 0 })).toEqual({
      cards: [],
      width: 0,
      height: 0,
    });
    expect(fanLayout({ ...phone, count: 1 })).toEqual({
      cards: [{ x: 0, y: 0, rotate: 0 }],
      width: 72,
      height: 100,
    });
  });

  it("fits the width with every card inside its bounding box", () => {
    for (let count = 2; count <= 15; count++) {
      const fan = fanLayout({ ...phone, count });
      expect(fan.width).toBeLessThanOrEqual(phone.width + 1e-9);
      const points = fan.cards.flatMap(corners);
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      expect(Math.min(...xs)).toBeCloseTo(0, 9);
      expect(Math.max(...xs)).toBeCloseTo(fan.width, 9);
      expect(Math.min(...ys)).toBeCloseTo(0, 9);
      expect(Math.max(...ys)).toBeCloseTo(fan.height, 9);
    }
  });

  it("is symmetric about its centre", () => {
    for (const count of [2, 5, 8, 13]) {
      const { cards, width } = fanLayout({ ...phone, count });
      cards.forEach((left, index) => {
        const right = cards[count - 1 - index];
        expect(left.x + right.x).toBeCloseTo(width - card.cardWidth, 9);
        expect(left.y).toBeCloseTo(right.y, 9);
        expect(left.rotate).toBeCloseTo(-right.rotate, 9);
      });
    }
  });

  it("tilts cards outward and drops them along the arc", () => {
    const { cards } = fanLayout({ ...phone, count: 5 });
    [-10, -5, 0, 5, 10].forEach((rotate, index) =>
      expect(cards[index].rotate).toBeCloseTo(rotate, 9),
    );
    expect(cards[2].y).toBeLessThan(cards[3].y);
    expect(cards[3].y).toBeLessThan(cards[4].y);
  });

  it("grows the spread with the count up to the cap", () => {
    const spread = (count: number) =>
      fanLayout({ ...phone, count }).cards.at(-1)!.rotate * 2;
    expect(spread(2)).toBeCloseTo(5, 9);
    expect(spread(4)).toBeCloseTo(15, 9);
    expect(spread(7)).toBeCloseTo(30, 9);
    expect(spread(13)).toBeCloseTo(30, 9);
  });

  it("overlaps at the preferred step when there is room", () => {
    const { cards, width } = fanLayout({ ...card, width: 1200, count: 3 });
    expect(distance(cards[0], cards[1])).toBeCloseTo(72 * 0.6, 1);
    expect(width).toBeLessThan(1200);
  });

  it("keeps a minimum visible slice and overflows instead", () => {
    const { cards, width } = fanLayout({ ...phone, count: 30 });
    expect(width).toBeGreaterThan(phone.width);
    for (let index = 1; index < cards.length; index++)
      expect(distance(cards[index - 1], cards[index])).toBeCloseTo(
        72 * 0.25,
        2,
      );
  });

  it("moves every card by at most the width change", () => {
    let previous = fanLayout({ ...card, width: 120, count: 9 });
    for (let width = 121; width <= 900; width++) {
      const next = fanLayout({ ...card, width, count: 9 });
      next.cards.forEach((fanned, index) => {
        expect(
          Math.abs(fanned.x - previous.cards[index].x),
        ).toBeLessThanOrEqual(1 + 1e-9);
        expect(
          Math.abs(fanned.y - previous.cards[index].y),
        ).toBeLessThanOrEqual(1 + 1e-9);
      });
      previous = next;
    }
  });

  it("grows and tightens monotonically as cards are added", () => {
    let previous = fanLayout({ ...phone, count: 2 });
    for (let count = 3; count <= 24; count++) {
      const next = fanLayout({ ...phone, count });
      expect(next.width).toBeGreaterThanOrEqual(previous.width - 1e-9);
      expect(next.cards.at(-1)!.rotate).toBeGreaterThanOrEqual(
        previous.cards.at(-1)!.rotate - 1e-9,
      );
      expect(distance(next.cards[0], next.cards[1])).toBeLessThanOrEqual(
        distance(previous.cards[0], previous.cards[1]) + 1e-3,
      );
      previous = next;
    }
  });

  it("lays a straight row without an angle", () => {
    const { cards, width, height } = fanLayout({
      ...card,
      width: 600,
      count: 3,
      angle: 0,
      step: 80,
    });
    expect(cards).toEqual([
      { x: 0, y: 0, rotate: 0 },
      { x: 80, y: 0, rotate: 0 },
      { x: 160, y: 0, rotate: 0 },
    ]);
    expect({ width, height }).toEqual({ width: 232, height: 100 });
  });
});

describe("liftFanCard", () => {
  it("lifts a card along its own tilt", () => {
    expect(liftFanCard({ x: 10, y: 20, rotate: 0 }, 12)).toEqual({
      x: 10,
      y: 8,
      rotate: 0,
    });
    const tilted = liftFanCard({ x: 10, y: 20, rotate: 30 }, 12);
    expect(tilted.x).toBeCloseTo(16, 9);
    expect(tilted.y).toBeCloseTo(20 - 12 * Math.cos(Math.PI / 6), 9);
    expect(tilted.rotate).toBe(30);
  });
});
