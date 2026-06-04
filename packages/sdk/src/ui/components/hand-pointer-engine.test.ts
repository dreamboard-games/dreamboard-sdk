import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  DEFAULT_POINTER_THRESHOLDS,
  HandPointerEngine,
  resolveAxis,
  type CardPointerState,
  type LiftEndEvent,
  type LiftMoveEvent,
  type LiftStartEvent,
} from "./hand-pointer-engine.js";

class FakeClock {
  current = 0;
  advance(ms: number): void {
    this.current += ms;
  }
  now = (): number => this.current;
}

interface CallLog {
  taps: string[];
  previewStarts: string[];
  previewEnds: string[];
  liftStarts: LiftStartEvent[];
  liftMoves: LiftMoveEvent[];
  liftEnds: LiftEndEvent[];
  liftCancels: string[];
  horizontalBrowses: string[];
  states: CardPointerState[];
  lockEvents: boolean[];
}

interface EngineHarness {
  engine: HandPointerEngine;
  log: CallLog;
}

function makeEngine(clock: FakeClock): EngineHarness {
  const log: CallLog = {
    taps: [],
    previewStarts: [],
    previewEnds: [],
    liftStarts: [],
    liftMoves: [],
    liftEnds: [],
    liftCancels: [],
    horizontalBrowses: [],
    states: [],
    lockEvents: [],
  };
  const engine = new HandPointerEngine(
    {
      onTap: (cardId) => log.taps.push(cardId),
      onPreviewStart: (cardId) => log.previewStarts.push(cardId),
      onPreviewEnd: (cardId) => log.previewEnds.push(cardId),
      onLiftStart: (event) => log.liftStarts.push(event),
      onLiftMove: (event) => log.liftMoves.push(event),
      onLiftEnd: (event) => log.liftEnds.push(event),
      onLiftCancel: (cardId) => log.liftCancels.push(cardId),
      onHorizontalBrowse: (cardId) => log.horizontalBrowses.push(cardId),
      onStateChange: (state) => log.states.push(state),
      onLockScroll: (locked) => log.lockEvents.push(locked),
    },
    DEFAULT_POINTER_THRESHOLDS,
    clock.now,
  );
  return { engine, log };
}

const ELIGIBLE = { cardId: "c1", eligible: true, disabled: false };
const DISABLED = { cardId: "c1", eligible: false, disabled: true };

let originalSetTimeout: typeof setTimeout;
let originalClearTimeout: typeof clearTimeout;
let timers: Array<{ fn: () => void; due: number }>;
let fakeClockForTimers: FakeClock | null = null;

beforeEach(() => {
  originalSetTimeout = globalThis.setTimeout;
  originalClearTimeout = globalThis.clearTimeout;
  timers = [];
  fakeClockForTimers = null;
  // @ts-expect-error — tests replace setTimeout to avoid real wall-clock waits.
  globalThis.setTimeout = (fn: () => void, ms: number): number => {
    const due = (fakeClockForTimers?.current ?? 0) + ms;
    const handle = timers.length + 1;
    timers.push({ fn, due });
    return handle as unknown as number;
  };
  // @ts-expect-error — paired with the patched setTimeout above.
  globalThis.clearTimeout = (handle?: number): void => {
    if (typeof handle !== "number") return;
    const index = handle - 1;
    if (timers[index])
      timers[index] = { fn: () => {}, due: Number.MAX_SAFE_INTEGER };
  };
});

afterEach(() => {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
});

function runTimersUntil(ms: number) {
  if (!fakeClockForTimers) return;
  const target = fakeClockForTimers.current + ms;
  fakeClockForTimers.current = target;
  for (const timer of timers) {
    if (timer.due <= target) {
      const fn = timer.fn;
      timer.fn = () => {};
      fn();
    }
  }
}

test("resolveAxis stays undecided inside the slop circle", () => {
  expect(resolveAxis(0, 0)).toBe("undecided");
  expect(resolveAxis(7, -7)).toBe("undecided");
});

test("resolveAxis distinguishes horizontal from upward", () => {
  expect(resolveAxis(40, 5)).toBe("horizontal");
  expect(resolveAxis(-40, 5)).toBe("horizontal");
  expect(resolveAxis(2, -40)).toBe("upward");
  expect(resolveAxis(2, 40)).toBe("undecided");
});

test("tap on an eligible card calls onTap exactly once", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  clock.advance(80);
  engine.handlePointerUp(ELIGIBLE, { pointerId: 1, clientX: 1, clientY: 1 });
  expect(log.taps).toEqual(["c1"]);
  expect(log.liftStarts).toHaveLength(0);
});

test("tap on a disabled card does not fire onTap", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(DISABLED, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerUp(DISABLED, { pointerId: 1, clientX: 0, clientY: 0 });
  expect(log.taps).toHaveLength(0);
});

test("long press emits previewStart and previewEnd without a tap", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  runTimersUntil(DEFAULT_POINTER_THRESHOLDS.pressPreviewMs);
  expect(log.previewStarts).toEqual(["c1"]);
  expect(log.states.some((s) => s.kind === "preview")).toBe(true);
  engine.handlePointerUp(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  expect(log.taps).toHaveLength(0);
  expect(log.previewEnds).toEqual(["c1"]);
});

test("horizontal drag transitions to horizontalBrowse and never taps", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(ELIGIBLE, { pointerId: 1, clientX: 30, clientY: 2 });
  engine.handlePointerMove(ELIGIBLE, { pointerId: 1, clientX: 60, clientY: 2 });
  engine.handlePointerUp(ELIGIBLE, { pointerId: 1, clientX: 60, clientY: 2 });
  expect(log.states.some((s) => s.kind === "horizontalBrowse")).toBe(true);
  expect(log.taps).toHaveLength(0);
  expect(log.horizontalBrowses).toEqual(["c1"]);
});

test("vertical lift past threshold emits onLiftStart with offsets", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, {
    pointerId: 1,
    clientX: 100,
    clientY: 200,
  });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 102,
    clientY: 165,
  });
  expect(log.liftStarts).toHaveLength(1);
  const lift = log.liftStarts[0]!;
  expect(lift.cardId).toBe("c1");
  expect(lift.startX).toBe(100);
  expect(lift.startY).toBe(200);
  expect(lift.pointerX).toBe(102);
  expect(lift.pointerY).toBe(165);
  expect(lift.grabOffsetX).toBe(2);
  expect(lift.grabOffsetY).toBe(-35);
  expect(log.lockEvents).toContain(true);
});

test("lift move forwards pointer coordinates without re-emitting liftStart", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 0,
    clientY: -32,
  });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 50,
    clientY: -60,
  });
  expect(log.liftStarts).toHaveLength(1);
  expect(log.liftMoves).toHaveLength(1);
  expect(log.liftMoves[0]).toMatchObject({
    cardId: "c1",
    pointerX: 50,
    pointerY: -60,
  });
});

test("lifted release fires onLiftEnd, not onTap", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 0,
    clientY: -40,
  });
  engine.handlePointerUp(ELIGIBLE, {
    pointerId: 1,
    clientX: 200,
    clientY: 200,
  });
  expect(log.liftEnds).toHaveLength(1);
  expect(log.liftEnds[0]).toMatchObject({
    cardId: "c1",
    pointerX: 200,
    pointerY: 200,
  });
  expect(log.taps).toHaveLength(0);
});

test("pointer cancel during lift fires onLiftCancel", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 0,
    clientY: -40,
  });
  engine.handlePointerCancel(ELIGIBLE);
  expect(log.liftCancels).toEqual(["c1"]);
  expect(log.liftEnds).toHaveLength(0);
});

test("dispose during a lift cancels through the callback", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 0,
    clientY: -40,
  });
  engine.dispose();
  expect(log.liftCancels).toEqual(["c1"]);
  expect(log.lockEvents).toContain(false);
});

test("ineligible card cannot be lifted", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const card = { cardId: "c1", eligible: false, disabled: false };
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(card, { pointerId: 1, clientX: 0, clientY: 0 });
  engine.handlePointerMove(card, { pointerId: 1, clientX: 0, clientY: -40 });
  engine.handlePointerUp(card, { pointerId: 1, clientX: 0, clientY: -40 });
  expect(log.liftStarts).toHaveLength(0);
  expect(log.taps).toHaveLength(0);
});

test("preview into upward axis transitions to lift and emits previewEnd", () => {
  const clock = new FakeClock();
  fakeClockForTimers = clock;
  const { engine, log } = makeEngine(clock);
  engine.handlePointerDown(ELIGIBLE, { pointerId: 1, clientX: 0, clientY: 0 });
  runTimersUntil(DEFAULT_POINTER_THRESHOLDS.pressPreviewMs);
  expect(log.previewStarts).toEqual(["c1"]);
  engine.handlePointerMove(ELIGIBLE, {
    pointerId: 1,
    clientX: 0,
    clientY: -40,
  });
  expect(log.previewEnds).toEqual(["c1"]);
  expect(log.liftStarts).toHaveLength(1);
});
