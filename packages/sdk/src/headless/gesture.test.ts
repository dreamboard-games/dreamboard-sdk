import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGestureRecognizer,
  magneticDropPoint,
  GESTURE_THRESHOLDS,
  type GestureCallbacks,
} from "./gesture.js";

const at = (pointerType: string, x: number, y: number, pointerId = 1) => ({
  pointerId,
  pointerType,
  clientX: x,
  clientY: y,
});

function press(pointerType: string, { draggable = true } = {}) {
  const log: string[] = [];
  const callbacks: GestureCallbacks = {
    hold: () => log.push("hold"),
    dragStart: (origin) => {
      log.push(`dragStart ${origin.x},${origin.y}`);
      return draggable;
    },
    dragMove: (point) => log.push(`dragMove ${point.x},${point.y}`),
    end: (kind, point) => log.push(`end ${kind} ${point.x},${point.y}`),
    cancel: (kind) => log.push(`cancel ${kind}`),
  };
  const recognizer = createGestureRecognizer(
    at(pointerType, 100, 100),
    callbacks,
  );
  return { log, recognizer };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("gesture recognizer", () => {
  it("leaves a still press to the native click as a tap", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 103, 104));
    vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs - 1);
    recognizer.up(at("touch", 103, 104));
    vi.runAllTimers();
    expect(log).toEqual(["end tap 103,104"]);
  });

  it("inspects a held touch and keeps inspecting when the finger then moves", () => {
    const { log, recognizer } = press("touch");
    vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs);
    recognizer.move(at("touch", 100, 40));
    recognizer.up(at("touch", 100, 40));
    expect(log).toEqual(["hold", "end hold 100,40"]);
  });

  it("drags a finger moving upward and reports every later move", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 103, 90));
    recognizer.move(at("touch", 110, 40));
    recognizer.up(at("touch", 112, 30));
    vi.runAllTimers();
    expect(log).toEqual([
      "dragStart 100,100",
      "dragMove 103,90",
      "dragMove 110,40",
      "end drag 112,30",
    ]);
  });

  it("browses a sideways finger and lets the browser's cancel end it", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 80, 96));
    recognizer.move(at("touch", 60, 40));
    recognizer.cancel(at("touch", 60, 40));
    expect(log).toEqual(["cancel browse"]);
  });

  it("browses a downward finger", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 100, 120));
    recognizer.up(at("touch", 100, 120));
    expect(log).toEqual(["end browse 100,120"]);
  });

  it("lets a pile drag downward on touch without changing hand scrolling", () => {
    const log: string[] = [];
    const recognizer = createGestureRecognizer(
      at("touch", 100, 100),
      {
        hold: () => log.push("hold"),
        dragStart: () => true,
        dragMove: () => log.push("move"),
        end: (kind) => log.push(kind),
        cancel: (kind) => log.push(`cancel ${kind}`),
      },
      { dragDirection: "any" },
    );
    recognizer.move(at("touch", 100, 120));
    recognizer.up(at("touch", 100, 150));
    vi.runAllTimers();
    expect(log).toEqual(["move", "drag"]);
  });

  it("drags a mouse in any direction and never holds", () => {
    const { log, recognizer } = press("mouse");
    vi.advanceTimersByTime(GESTURE_THRESHOLDS.holdMs * 3);
    recognizer.move(at("mouse", 120, 101));
    recognizer.up(at("mouse", 130, 102));
    expect(log).toEqual([
      "dragStart 100,100",
      "dragMove 120,101",
      "end drag 130,102",
    ]);
  });

  it("browses when the card refuses to drag", () => {
    const { log, recognizer } = press("mouse", { draggable: false });
    recognizer.move(at("mouse", 100, 80));
    recognizer.move(at("mouse", 100, 60));
    recognizer.up(at("mouse", 100, 60));
    expect(log).toEqual(["dragStart 100,100", "end browse 100,60"]);
  });

  it("cancels a drag without dropping and ignores events after it ends", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 100, 80));
    recognizer.cancel();
    recognizer.move(at("touch", 100, 60));
    recognizer.up(at("touch", 100, 60));
    vi.runAllTimers();
    expect(log).toEqual([
      "dragStart 100,100",
      "dragMove 100,80",
      "cancel drag",
    ]);
  });

  it("ignores other pointers", () => {
    const { log, recognizer } = press("touch");
    recognizer.move(at("touch", 100, 20, 2));
    recognizer.up(at("touch", 100, 20, 2));
    recognizer.cancel({ pointerId: 2 });
    recognizer.up(at("touch", 100, 100));
    expect(log).toEqual(["end tap 100,100"]);
  });
});

describe("magnetic drop edges", () => {
  const box = { x: 100, y: 100, width: 200, height: 120 };
  it("acquires early, resists leaving, then releases without moving the pointer inside", () => {
    expect(magneticDropPoint({ x: 85, y: 160 }, box, false, false)).toEqual({
      x: 100,
      y: 160,
    });
    expect(magneticDropPoint({ x: 70, y: 160 }, box, false, false)).toBeNull();
    expect(magneticDropPoint({ x: 70, y: 160 }, box, true, false)).toEqual({
      x: 100,
      y: 160,
    });
    expect(magneticDropPoint({ x: 60, y: 160 }, box, true, false)).toBeNull();
    expect(magneticDropPoint({ x: 210, y: 140 }, box, true, false)).toEqual({
      x: 210,
      y: 140,
    });
  });
  it("touch has a larger acquisition band and corners use distance, not a bounding square", () => {
    expect(magneticDropPoint({ x: 75, y: 160 }, box, false, true)).toEqual({
      x: 100,
      y: 160,
    });
    expect(magneticDropPoint({ x: 75, y: 75 }, box, false, true)).toBeNull();
    expect(
      magneticDropPoint({ x: 75, y: 160 }, { ...box, width: 0 }, true, true),
    ).toBeNull();
  });
});
