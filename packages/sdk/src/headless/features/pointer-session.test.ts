import { describe, expect, it, vi } from "vitest";
import { createPointerSession, type PointerInput } from "./pointer-session.js";

function surface() {
  const captures = new Set<number>();
  return {
    captures,
    setPointerCapture: vi.fn((id: number) => {
      captures.add(id);
    }),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: vi.fn((id: number) => {
      captures.delete(id);
    }),
  };
}
function event(
  target: ReturnType<typeof surface>,
  overrides: Partial<PointerInput> = {},
): PointerInput {
  return {
    currentTarget: target,
    pointerId: 1,
    button: 0,
    clientX: 10,
    clientY: 20,
    preventDefault: vi.fn(),
    ...overrides,
  };
}

describe("native pointer lifetime", () => {
  it("captures one pointer and releases before committing its final position", () => {
    const target = surface();
    const move = vi.fn();
    const end = vi.fn(() => expect(target.captures.size).toBe(0));
    const session = createPointerSession({ move, end, cancel: vi.fn() });
    expect(session.start(event(target))).toBe(true);
    expect(session.start(event(target, { pointerId: 2 }))).toBe(false);
    session.move(event(target, { pointerId: 2, clientX: 50 }));
    expect(move).not.toHaveBeenCalled();
    session.move(event(target, { clientX: 15, clientY: 23 }));
    expect(move).toHaveBeenCalledWith({
      origin: { x: 10, y: 20 },
      point: { x: 15, y: 23 },
      delta: { x: 5, y: 3 },
    });
    session.end(event(target, { clientX: 18, clientY: 25 }));
    expect(end).toHaveBeenCalledWith({
      origin: { x: 10, y: 20 },
      point: { x: 18, y: 25 },
      delta: { x: 8, y: 5 },
    });
    expect(target.releasePointerCapture).toHaveBeenCalledTimes(1);
    session.dispose();
    expect(target.releasePointerCapture).toHaveBeenCalledTimes(1);
  });

  it.each(["cancel", "dispose"] as const)(
    "%s releases capture without committing",
    (method) => {
      const target = surface();
      const end = vi.fn();
      const cancel = vi.fn();
      const session = createPointerSession({ move: vi.fn(), end, cancel });
      session.start(event(target));
      session[method]();
      session.end(event(target));
      expect(target.captures.size).toBe(0);
      expect(end).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenCalledTimes(1);
    },
  );

  it("lost capture cancels without attempting a second native release", () => {
    const target = surface();
    const cancel = vi.fn();
    const session = createPointerSession({
      move: vi.fn(),
      end: vi.fn(),
      cancel,
    });
    session.start(event(target));
    target.captures.clear();
    session.cancel(event(target));
    expect(cancel).toHaveBeenCalledOnce();
    expect(target.releasePointerCapture).not.toHaveBeenCalled();
  });
});
