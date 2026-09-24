import { describe, expect, test } from "vitest";
import { memoize } from "./memoize";

describe("memoize", () => {
  test("shares one result for an immutable input and recomputes for a new identity", () => {
    let calls = 0;
    const project = memoize((state: { count: number }) => {
      calls++;
      return { double: state.count * 2 };
    });
    const first = { count: 2 };
    expect(project(first)).toBe(project(first));
    expect(calls).toBe(1);
    expect(project({ count: 3 })).toEqual({ double: 6 });
    expect(calls).toBe(2);
  });
  test("caches undefined results and leaves thrown computations retryable", () => {
    let calls = 0;
    const absent = memoize<object, undefined>(() => {
      calls++;
      return undefined;
    });
    const input = {};
    absent(input);
    absent(input);
    expect(calls).toBe(1);
    let attempts = 0;
    const retry = memoize<object, number>(() => {
      if (++attempts === 1) throw new Error("retry");
      return 42;
    });
    expect(() => retry(input)).toThrow("retry");
    expect(retry(input)).toBe(42);
    expect(retry(input)).toBe(42);
    expect(attempts).toBe(2);
  });
});
