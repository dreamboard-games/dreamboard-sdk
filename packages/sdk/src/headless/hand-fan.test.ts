import { describe, expect, it } from "vitest";
import { fanLayout } from "./fan.js";
import {
  cssEasing,
  exponentialOut,
  handFan,
  handFanPresets,
  handFanTiming,
} from "./hand-fan.js";

const card = { cardWidth: 80, cardHeight: 112 };
const nine = { ...card, count: 9, width: 584 };
// Geometry checks use fanLayout's own spacing and a fixed strip, not a preset.
const pinned = { spacing: 0.6, exposed: 0.2 };

describe("handFan", () => {
  it("rests on the fan arc and reserves headroom for a focused face", () => {
    const fan = fanLayout(nine);
    const hand = handFan({ ...nine, options: { ...pinned, focusScale: 1.8 } });
    expect(hand.cards.map(({ x, y, rotate }) => ({ x, y, rotate }))).toEqual(
      fan.cards,
    );
    hand.cards.forEach((pose, index) => {
      expect(pose.scale).toBe(1);
      expect(pose.layer).toBe(index);
    });
    expect(hand.width).toBe(fan.width);
    expect(hand.height).toBe(fan.height);
    expect(hand.headroom).toBeCloseTo(112 * 1.8 - fan.height);
  });

  it("stands every focused card upright on one bottom edge and tapers the push over three neighbours", () => {
    const rest = handFan({ ...nine, options: pinned });
    const focused = handFan({
      ...nine,
      focused: 4,
      options: { ...pinned, focusScale: 1 },
    });
    const pushes = [0, -0.1, -0.19, -0.29, 0, 0.29, 0.19, 0.1, 0];
    focused.cards.forEach((pose, index) =>
      expect((pose.x - rest.cards[index].x) / 80).toBeCloseTo(pushes[index]),
    );
    for (let index = 0; index < 9; index++) {
      const pose = handFan({
        ...nine,
        focused: index,
        options: { ...pinned, focusScale: 1.8 },
      }).cards[index];
      expect(pose.rotate).toBe(0);
      expect(pose.layer).toBe(9);
      expect(pose.y + (112 * (pose.scale + 1)) / 2).toBeCloseTo(rest.height);
      expect(pose.scale).toBeCloseTo(1.8);
    }
  });

  it("keeps readable end faces inside a supplied visible window", () => {
    for (const focused of [0, 8]) {
      const pose = handFan({
        ...nine,
        focused,
        visible: { left: 142, width: 280 },
        options: { focusScale: 1.8 },
      }).cards[focused];
      const centre = pose.x + 40;
      expect(centre - pose.scale * 40).toBeGreaterThanOrEqual(142);
      expect(centre + pose.scale * 40).toBeLessThanOrEqual(422);
    }
  });

  it("keeps focused faces of a crowded fan inside the default viewport", () => {
    const input = { ...card, count: 20, width: 260 };
    const fan = fanLayout(input);
    expect(fan.width).toBeCloseTo(input.width, 9);
    const left = (fan.width - input.width) / 2;
    for (let focused = 0; focused < input.count; focused++) {
      const pose = handFan({ ...input, focused }).cards[focused];
      const centre = pose.x + input.cardWidth / 2;
      const half = (pose.scale * input.cardWidth) / 2;
      expect(centre - half).toBeGreaterThanOrEqual(left - 1e-8);
      expect(centre + half).toBeLessThanOrEqual(left + input.width + 1e-8);
    }
  });

  it("keeps empty hands at zero height under every preset", () => {
    for (const options of Object.values(handFanPresets)) {
      const hand = handFan({ ...card, count: 0, width: 260, options });
      expect(hand.cards).toEqual([]);
      expect(hand.width).toBe(0);
      expect(hand.height).toBe(0);
    }
  });

  it("tucks resting cards below the band without moving them", () => {
    const open = handFan(nine);
    const tucked = handFan({
      ...nine,
      options: { tuck: 0.4, focusScale: 1.4 },
    });
    expect(tucked.cards).toEqual(open.cards);
    // The middle card, at the top of the arc, hides the tucked share of itself.
    expect(tucked.height).toBeCloseTo(0.6 * 112);
    expect(tucked.headroom).toBeCloseTo(1.4 * 112 - tucked.height);
    const pose = handFan({
      ...nine,
      focused: 4,
      options: { tuck: 0.4, focusScale: 1.4 },
    }).cards[4];
    // The whole face clears the tuck: its bottom is the band's bottom edge.
    expect(pose.y + (112 * (pose.scale + 1)) / 2).toBeCloseTo(tucked.height);
  });

  it("keeps a tucked hand's edge in place while outer cards sink with the arc", () => {
    const options = handFanPresets.tucked;
    const bands = [1, 2, 3, 5, 8, 12].map((count) => {
      const hand = handFan({ ...card, count, width: 900, options });
      const middle = hand.cards[Math.floor((count - 1) / 2)];
      const end = hand.cards[count - 1];
      // A lone card shows as much as the middle of any hand.
      expect((hand.height - middle.y) / 112).toBeCloseTo(1 - options.tuck, 1);
      expect(end.y).toBeGreaterThanOrEqual(middle.y);
      return hand.height;
    });
    expect(new Set(bands)).toEqual(new Set([(1 - options.tuck) * 112]));
  });

  it("spaces resting cards in card widths", () => {
    const spaced = handFan({ ...nine, options: { spacing: 0.7 } });
    expect(spaced.cards[1].x - spaced.cards[0].x).toBeGreaterThan(80 * 0.6);
    expect(spaced.width).toBeGreaterThan(
      handFan({ ...nine, options: pinned }).width,
    );
    expect(spaced.width).toBeLessThanOrEqual(nine.width + 1e-8);
  });

  it("caps the focused face by the window and by the room above the band, but never below the resting card", () => {
    const scaleWith = (input: { windowHeight?: number; room?: number }) =>
      handFan({ ...nine, ...input, focused: 4 }).cards[4].scale;
    expect(scaleWith({})).toBeCloseTo(2);
    expect(scaleWith({ windowHeight: 400 })).toBeCloseTo((400 * 0.55) / 112);
    expect(scaleWith({ room: 150 })).toBeCloseTo(150 / 112);
    expect(scaleWith({ room: 10 })).toBe(1);
  });

  it("keeps crowded and sparse fans ordered, exposed and on their arc for every focused card", () => {
    for (const count of [1, 2, 5, 20, 50])
      for (const width of [260, 390, 1280])
        for (const aspect of [5 / 7, 5 / 8, 8 / 5]) {
          const cardWidth = width === 1280 ? 104 : 74;
          const cardHeight = cardWidth / aspect;
          // The registry hand keeps a gutter beside the fan; check in its coordinates.
          const gutter = cardWidth * 0.35;
          const fan = fanLayout({
            count,
            width: width - gutter * 2,
            cardWidth,
            cardHeight,
          });
          const exposed = cardWidth * 0.2;
          for (let focused = 0; focused < count; focused++) {
            const poses = handFan({
              count,
              width: width - gutter * 2,
              cardWidth,
              cardHeight,
              focused,
              visible: { left: -gutter, width },
              options: { ...pinned, focusScale: 320 / cardWidth },
            }).cards.map((pose) => ({ ...pose, x: pose.x + gutter }));
            for (let index = 1; index < count; index++)
              expect(
                poses[index].x - poses[index - 1].x,
              ).toBeGreaterThanOrEqual(exposed - 1e-8);
            for (let index = 0; index < count; index++)
              if (index !== focused) {
                expect(poses[index].rotate).toBe(fan.cards[index].rotate);
                expect(poses[index].y).toBe(fan.cards[index].y);
              }
            const pose = poses[focused];
            const w = pose.scale * cardWidth;
            const left = pose.x + cardWidth / 2 - w / 2;
            const right = pose.x + cardWidth / 2 + w / 2;
            expect(left).toBeGreaterThanOrEqual(
              focused > 0 ? exposed - 1e-8 : -1e-8,
            );
            expect(right).toBeLessThanOrEqual(
              width - (focused < count - 1 ? exposed : 0) + 1e-8,
            );
            for (const adjacent of [focused - 1, focused + 1]) {
              if (adjacent < 0 || adjacent >= count) continue;
              const next = poses[adjacent];
              const middleHalf =
                (cardWidth * Math.cos((next.rotate * Math.PI) / 180)) / 2;
              const nextCentre = next.x + cardWidth / 2;
              if (adjacent < focused) {
                expect(nextCentre - middleHalf).toBeGreaterThanOrEqual(-1e-8);
                expect(nextCentre - middleHalf).toBeLessThanOrEqual(
                  left - exposed + 1e-8,
                );
              } else {
                expect(nextCentre + middleHalf).toBeLessThanOrEqual(
                  width + 1e-8,
                );
                expect(nextCentre + middleHalf).toBeGreaterThanOrEqual(
                  right + exposed - 1e-8,
                );
              }
            }
            for (let index = focused + 2; index < count; index++) {
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

  it("never opens a gap between the focused face and its neighbours", () => {
    for (const options of Object.values(handFanPresets))
      for (const count of [3, 6, 9, 13])
        for (let focused = 1; focused < count - 1; focused++) {
          const hand = handFan({
            ...card,
            count,
            width: 1200,
            focused,
            options,
          });
          const face = hand.cards[focused];
          const half = (80 * face.scale) / 2;
          for (const direction of [-1, 1]) {
            const next = hand.cards[focused + direction];
            const middleHalf =
              (80 * Math.cos((next.rotate * Math.PI) / 180)) / 2;
            const inner = next.x + 40 - direction * middleHalf;
            const edge = face.x + 40 + direction * half;
            expect(direction * (inner - edge)).toBeLessThanOrEqual(1e-8);
          }
        }
  });

  it("offers presets that each taper and leave neighbours a strip", () => {
    for (const preset of Object.values(handFanPresets)) {
      expect(preset.focusScale).toBeGreaterThanOrEqual(1);
      expect(preset.exposed).toBeGreaterThan(0);
      expect(preset.tuck).toBeGreaterThanOrEqual(0);
      expect(preset.tuck).toBeLessThan(0.5);
      for (let index = 1; index < preset.push.length; index++)
        expect(preset.push[index]).toBeLessThan(preset.push[index - 1]);
    }
    expect(handFanPresets.open.tuck).toBe(0);
  });
});

describe("hand timing", () => {
  const at = (
    timing: { duration: number; ease(p: number): number },
    ms: number,
  ) => timing.ease(Math.min(1, ms / 1000 / timing.duration));
  const ninety = (timing: { duration: number; ease(p: number): number }) => {
    let ms = 0;
    while (at(timing, ms) < 0.9) ms += 1;
    return ms;
  };

  it("starts at full speed, never overshoots and is 90 percent home at 300ms", () => {
    expect(exponentialOut(0)).toBe(0);
    expect(exponentialOut(1)).toBeCloseTo(1, 12);
    let previous = 0;
    for (let step = 1; step <= 1000; step++) {
      const value = exponentialOut(step / 1000);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThanOrEqual(1);
      // Each step moves less than the one before: the fastest is the first.
      if (step > 1)
        expect(value - previous).toBeLessThan(
          previous - exponentialOut((step - 2) / 1000),
        );
      previous = value;
    }
    // The first 60Hz frame already covers about an eighth of the distance.
    expect(at(handFanTiming.settle, 1000 / 60)).toBeGreaterThan(0.1);
    expect(ninety(handFanTiming.settle)).toBeGreaterThanOrEqual(280);
    expect(ninety(handFanTiming.settle)).toBeLessThanOrEqual(320);
    expect(ninety(handFanTiming.focus)).toBeLessThanOrEqual(50);
  });

  it("continues the curve when a retarget restarts it", () => {
    // Animation libraries restart from the current pose. The restarted
    // curve's speed matches the uninterrupted one, so nothing stalls.
    const rate = (progress: number) =>
      (exponentialOut(progress + 1e-6) - exponentialOut(progress)) / 1e-6;
    for (const progress of [0.05, 0.1, 0.25, 0.5]) {
      const remaining = 1 - exponentialOut(progress);
      const restarted = (rate(0) * remaining) / rate(progress);
      // Landing exactly at the duration costs a little speed late in the
      // curve; a zero-velocity spring would restart at 0.
      expect(restarted).toBeGreaterThan(0.9);
      expect(restarted).toBeLessThanOrEqual(1 + 1e-6);
    }
  });

  it("converts an easing to a CSS linear() function", () => {
    expect(cssEasing((p) => p, 4)).toBe("linear(0, 0.25, 0.5, 0.75, 1)");
    const css = cssEasing(exponentialOut);
    expect(css.startsWith("linear(0, ")).toBe(true);
    expect(css.endsWith(", 1)")).toBe(true);
    expect(css.split(",")).toHaveLength(25);
  });
});
