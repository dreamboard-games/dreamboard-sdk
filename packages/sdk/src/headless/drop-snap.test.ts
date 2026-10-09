import { describe, expect, it } from "vitest";
import { snapDrop, type Box, type SnapArea } from "./drop-snap.js";

/** A 60 × 90 card centred on a point. */
const card = (x: number, y: number): Box => ({
  x: x - 30,
  y: y - 45,
  width: 60,
  height: 90,
});
const pile = (x: number): SnapArea => ({
  box: { x, y: 0, width: 60, height: 90 },
  slot: true,
  depth: 0,
});
const zone = (box: Box, depth = 0): SnapArea => ({ box, slot: false, depth });
/** The card is centred on the pointer unless `from` says where it hangs. */
const snap = (
  pointer: { x: number; y: number },
  areas: readonly (SnapArea | null)[],
  { retained = -1, hit = -1, coarse = false, from = pointer } = {},
) =>
  snapDrop({
    pointer,
    card: card(from.x, from.y),
    areas,
    hit,
    retained,
    coarse,
  });

describe("piles", () => {
  // Two piles 80 px apart: centres at x 30 and x 110, y 45.
  const piles = [pile(0), pile(80)];
  it("catch a card near the slot and draw it there, still giving toward the pointer", () => {
    const caught = snap({ x: 60, y: 70 }, piles);
    expect(caught.index).toBe(0);
    expect(caught.held).toBe(true);
    expect(caught.center.x).toBeCloseTo(30 + 30 * 0.15);
    expect(caught.center.y).toBeCloseTo(45 + 25 * 0.15);
    expect(snap({ x: 30, y: 200 }, piles).index).toBe(-1);
  });
  it("keep a caught card past the catch distance, then let it go", () => {
    expect(snap({ x: 30, y: 125 }, piles).index).toBe(-1);
    expect(snap({ x: 30, y: 125 }, piles, { retained: 0 }).index).toBe(0);
    expect(snap({ x: 30, y: 150 }, piles, { retained: 0 }).index).toBe(-1);
  });
  it("pass a card to a neighbour only when it is clearly closer", () => {
    // Midway, the pile holding the card keeps it.
    expect(snap({ x: 72, y: 45 }, piles, { retained: 0 }).index).toBe(0);
    expect(snap({ x: 72, y: 45 }, piles, { retained: 1 }).index).toBe(1);
    expect(snap({ x: 80, y: 45 }, piles, { retained: 0 }).index).toBe(1);
  });
  it("reach further for a finger", () => {
    expect(snap({ x: 30, y: 117 }, piles).index).toBe(-1);
    expect(snap({ x: 30, y: 117 }, piles, { coarse: true }).index).toBe(0);
  });
  it("draw a card in the slot when the pointer is over the pile's label", () => {
    const labelled: SnapArea = { ...pile(0), box: pile(0).box };
    const under = snap({ x: 30, y: 300 }, [labelled], { hit: 0 });
    expect(under).toMatchObject({ index: 0, held: true });
    expect(under.center.y).toBeCloseTo(45 + 255 * 0.15);
  });
});

describe("zones", () => {
  const mat = zone({ x: 0, y: 0, width: 300, height: 120 });
  it("take a card under the pointer without moving it", () => {
    expect(snap({ x: 100, y: 60 }, [mat], { hit: 0 })).toEqual({
      index: 0,
      center: { x: 100, y: 60 },
      held: false,
    });
  });
  it("take a card that covers enough of them and hold it inside the edge", () => {
    // Held by its bottom edge, far beyond the pointer's own reach of the zone.
    const hanging = (top: number) => ({
      from: { x: 100, y: top + 45 },
      pointer: { x: 100, y: top + 105 },
    });
    // 40 px of the card's 90 px height lie inside: 44 %.
    const enter = hanging(80);
    const entering = snap(enter.pointer, [mat], enter);
    expect(entering.index).toBe(0);
    expect(entering.held).toBe(true);
    expect(entering.center).toEqual({ x: 100, y: 120 + 5 * 0.25 });
    // 20 px inside is 22 %: too little to enter, enough to stay.
    const stay = hanging(100);
    expect(snap(stay.pointer, [mat], stay).index).toBe(-1);
    expect(snap(stay.pointer, [mat], { ...stay, retained: 0 }).index).toBe(0);
    const leave = hanging(115);
    expect(snap(leave.pointer, [mat], { ...leave, retained: 0 }).index).toBe(
      -1,
    );
  });
  it("still take a card the pointer nearly reaches when nothing is measured", () => {
    const pointer = { x: 100, y: 130 };
    const point = snapDrop({
      pointer,
      card: { ...pointer, width: 0, height: 0 },
      areas: [mat],
      hit: -1,
      retained: -1,
      coarse: false,
    });
    expect(point.index).toBe(0);
  });
  it("prefer the innermost zone the card covers", () => {
    const inner = zone({ x: 0, y: 0, width: 100, height: 120 }, 1);
    const from = { x: 50, y: 125 };
    expect(snap({ x: 50, y: 185 }, [mat, inner], { from }).index).toBe(1);
  });
  it("yield to a pile that catches the card", () => {
    expect(
      snap({ x: 30, y: 60 }, [mat, pile(0)], { retained: 0, hit: 0 }).index,
    ).toBe(1);
  });
  it("yield to the area under the pointer", () => {
    const next = zone({ x: 0, y: 140, width: 300, height: 120 });
    expect(
      snap({ x: 100, y: 150 }, [mat, next], { retained: 0, hit: 1 }),
    ).toMatchObject({ index: 1, held: false });
  });
  it("leave targets they cannot measure to the browser's hit testing", () => {
    const svg: SnapArea = { box: null, slot: false, depth: 0 };
    expect(snap({ x: 5, y: 5 }, [svg]).index).toBe(-1);
    expect(snap({ x: 5, y: 5 }, [svg], { hit: 0 }).index).toBe(0);
    expect(snap({ x: 5, y: 5 }, [null], { hit: 0 }).index).toBe(-1);
  });
});
