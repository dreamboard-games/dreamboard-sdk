import { expect, test } from "vitest";
import { fanLayout } from "@dreamboard-games/sdk";
import { spring } from "motion";
import { handFocusLayout, handReturn, handEnter } from "../items/hand-layout";

const options = { cardWidth: 80, cardHeight: 112, width: 640, count: 9 };
const fan = fanLayout(options);
const settings = {
  fan,
  active: 4,
  cardWidth: 80,
  cardHeight: 112,
  readableWidth: 144,
  lift: 30,
  gutter: 28,
  visibleLeft: 0,
  visibleWidth: 640,
};

test("all readable cards are upright at one baseline and the local push ends after three neighbours", () => {
  const normal = handFocusLayout({ ...settings, active: -1 });
  const focused = handFocusLayout({ ...settings, readableWidth: 80 });
  const pushes = [0, -0.1, -0.19, -0.29, 0, 0.29, 0.19, 0.1, 0];
  focused.forEach((card, index) =>
    expect((card.x - normal[index].x) / 80).toBeCloseTo(pushes[index]),
  );
  for (let active = 0; active < 9; active++) {
    const pose = handFocusLayout({ ...settings, active })[active];
    expect(pose.rotate).toBe(0);
    expect(pose.y + (112 * (pose.scale + 1)) / 2).toBeCloseTo(30 + fan.height);
    expect(pose.scale * 80).toBe(144);
  }
});

test("readable end faces stay inside the visible window after horizontal scrolling", () => {
  for (const active of [0, 8]) {
    const pose = handFocusLayout({
      ...settings,
      active,
      visibleLeft: 170,
      visibleWidth: 280,
    })[active];
    const center = pose.x + 40;
    expect(center - pose.scale * 40).toBeGreaterThanOrEqual(170);
    expect(center + pose.scale * 40).toBeLessThanOrEqual(450);
  }
});

test("configured Motion response is monotone, fast on entry and over 90 percent home at 300ms", () => {
  for (const config of [handReturn, handEnter]) {
    for (const [from, to] of [
      [0, 100],
      [100, 0],
      [37, 20],
    ]) {
      const animation = spring({ ...config, keyframes: [from, to] });
      let previous = from;
      for (let time = 0; time <= 800; time += 8) {
        const current = animation.next(time).value;
        expect(current).toBeGreaterThanOrEqual(Math.min(from, to));
        expect(current).toBeLessThanOrEqual(Math.max(from, to));
        expect(Math.abs(to - current)).toBeLessThanOrEqual(
          Math.abs(to - previous) + 1e-8,
        );
        previous = current;
      }
      const sampled = spring({ ...config, keyframes: [from, to] });
      const time = config === handEnter ? 64 : 300;
      expect(
        Math.abs(to - sampled.next(time).value) / Math.abs(to - from),
      ).toBeLessThan(0.1);
    }
  }
});

test("crowded and sparse fans preserve ordering, rotation and vertical geometry for every focused card", () => {
  for (const count of [1, 2, 5, 20, 50])
    for (const width of [260, 390, 1280])
      for (const aspect of [5 / 7, 5 / 8, 8 / 5]) {
        const cardWidth = width === 1280 ? 104 : 74;
        const cardHeight = cardWidth / aspect;
        const fan = fanLayout({
          count,
          width: width - cardWidth * 0.7,
          cardWidth,
          cardHeight,
        });
        for (let active = 0; active < count; active++) {
          const poses = handFocusLayout({
            fan,
            active,
            cardWidth,
            cardHeight,
            readableWidth: 320,
            lift: cardHeight * 0.28,
            gutter: cardWidth * 0.35,
            visibleLeft: 0,
            visibleWidth: width,
          });
          for (let index = 1; index < count; index++)
            expect(poses[index].x - poses[index - 1].x).toBeGreaterThanOrEqual(
              cardWidth * 0.2 - 1e-8,
            );
          for (let index = 0; index < count; index++)
            if (index !== active) {
              expect(poses[index].rotate).toBe(fan.cards[index].rotate);
              expect(poses[index].y).toBe(
                fan.cards[index].y + cardHeight * 0.28,
              );
            }
          const pose = poses[active];
          const w = pose.scale * cardWidth;
          const left = pose.x + cardWidth / 2 - w / 2;
          const right = pose.x + cardWidth / 2 + w / 2;
          const exposed = cardWidth * 0.2;
          expect(left).toBeGreaterThanOrEqual(
            active > 0 ? exposed - 1e-8 : -1e-8,
          );
          expect(pose.x + cardWidth / 2 + w / 2).toBeLessThanOrEqual(
            width - (active < count - 1 ? exposed : 0) + 1e-8,
          );
          for (const adjacent of [active - 1, active + 1]) {
            if (adjacent < 0 || adjacent >= count) continue;
            const next = poses[adjacent];
            const middleHalf =
              (cardWidth * Math.cos((next.rotate * Math.PI) / 180)) / 2;
            const nextCenter = next.x + cardWidth / 2;
            if (adjacent < active) {
              expect(nextCenter - middleHalf).toBeGreaterThanOrEqual(-1e-8);
              expect(nextCenter - middleHalf).toBeLessThanOrEqual(
                left - exposed + 1e-8,
              );
            } else {
              expect(nextCenter + middleHalf).toBeLessThanOrEqual(width + 1e-8);
              expect(nextCenter + middleHalf).toBeGreaterThanOrEqual(
                right + exposed - 1e-8,
              );
            }
          }
          for (let index = active + 2; index < count; index++) {
            const next = poses[index];
            const angle = (next.rotate * Math.PI) / 180;
            const halfWidth =
              (cardWidth * Math.cos(angle) +
                cardHeight * Math.abs(Math.sin(angle))) /
              2;
            expect(next.x + cardWidth / 2 - halfWidth).toBeGreaterThanOrEqual(
              right + exposed - 1e-8,
            );
          }
        }
      }
});
