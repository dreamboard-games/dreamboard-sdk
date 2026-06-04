import { expect, test } from "bun:test";
import {
  HAND_MODE_GEOMETRY,
  chooseHandLayoutMode,
  computeFanLayout,
} from "./hand-layout-math.js";

test("computeFanLayout returns a single centered position for one card", () => {
  const result = computeFanLayout({
    availableWidth: 400,
    cardWidth: 96,
    cardHeight: 144,
    count: 1,
    minVisibleSlice: 44,
    maxAngle: 5,
    arcDepth: 12,
  });
  expect(result.positions).toHaveLength(1);
  expect(result.positions[0]).toEqual({
    left: 0,
    rotate: 0,
    translateY: 0,
    zIndex: 1,
  });
  expect(result.step).toBe(96);
});

test("computeFanLayout spreads cards evenly when there is room", () => {
  const result = computeFanLayout({
    availableWidth: 600,
    cardWidth: 96,
    cardHeight: 144,
    count: 5,
    minVisibleSlice: 44,
    maxAngle: 5,
    arcDepth: 12,
  });
  expect(result.positions).toHaveLength(5);
  // step is exactly (600 - 96) / (5 - 1) = 126 — but clamped to cardWidth.
  expect(result.step).toBe(96);
  expect(result.positions[0]?.rotate).toBeCloseTo(-5);
  expect(result.positions[4]?.rotate).toBeCloseTo(5);
  // Outermost cards drop by the full arc depth.
  expect(result.positions[0]?.translateY).toBeCloseTo(12);
  expect(result.positions[4]?.translateY).toBeCloseTo(12);
  // Center card sits flat.
  expect(result.positions[2]?.rotate).toBeCloseTo(0);
  expect(result.positions[2]?.translateY).toBeCloseTo(0);
});

test("computeFanLayout clamps step to minVisibleSlice on narrow widths", () => {
  const result = computeFanLayout({
    availableWidth: 320,
    cardWidth: 96,
    cardHeight: 144,
    count: 13,
    minVisibleSlice: 44,
    maxAngle: 4,
    arcDepth: 8,
  });
  expect(result.step).toBe(44);
  expect(result.totalWidth).toBe(96 + 12 * 44);
});

test("chooseHandLayoutMode keeps the desktop fan when slice is comfortable", () => {
  const mode = chooseHandLayoutMode({
    containerWidth: 800,
    cardCount: 5,
    cardWidth: 96,
    desktop: "fan",
    mobile: "tray",
  });
  expect(mode).toBe("fan");
});

test("chooseHandLayoutMode downgrades a crowded fan to compressed-fan", () => {
  // 13 cards in 700px → step = (700 - 96) / 12 ≈ 50 — between 44 and 64 → compressed.
  const mode = chooseHandLayoutMode({
    containerWidth: 700,
    cardCount: 13,
    cardWidth: 96,
    desktop: "fan",
    mobile: "tray",
  });
  expect(mode).toBe("compressed-fan");
});

test("chooseHandLayoutMode falls back to the mobile policy on unusable widths", () => {
  // 13 cards in 280px → step ≈ 15 — below the compressed floor → tray.
  const mode = chooseHandLayoutMode({
    containerWidth: 280,
    cardCount: 13,
    cardWidth: 96,
    desktop: "fan",
    mobile: "tray",
  });
  expect(mode).toBe("tray");
});

test("chooseHandLayoutMode returns the desktop preference when unmeasured", () => {
  expect(
    chooseHandLayoutMode({
      containerWidth: 0,
      cardCount: 5,
      cardWidth: 96,
      desktop: "fan",
      mobile: "tray",
    }),
  ).toBe("fan");
});

test("HAND_MODE_GEOMETRY exposes documented starting values", () => {
  expect(HAND_MODE_GEOMETRY.fan.minVisibleSlice).toBe(64);
  expect(HAND_MODE_GEOMETRY["compressed-fan"].minVisibleSlice).toBe(44);
});
