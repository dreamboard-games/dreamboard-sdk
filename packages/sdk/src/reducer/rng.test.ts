import { describe, expect, test } from "vitest";
import { nextRandomInt } from "./rng";
import type { RuntimeRngState } from "./model";

function emptyRng(seed: number | null = 1337): RuntimeRngState {
  return { seed, cursor: 0, trace: [], draws: [] };
}

describe("nextRandomInt", () => {
  test("rejects non-positive bounds", () => {
    expect(() => nextRandomInt(0, emptyRng())).toThrow();
    expect(() => nextRandomInt(-1, emptyRng())).toThrow();
  });

  test("keeps values inside [0, bound) for various bounds", () => {
    let rng = emptyRng(1);
    for (const bound of [2, 6, 10, 42, 1000]) {
      for (let i = 0; i < 200; i += 1) {
        const [value, next] = nextRandomInt(bound, rng);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(bound);
        rng = next;
      }
    }
  });

  test("advances cursor and appends one trace entry per call", () => {
    let rng = emptyRng(1);
    for (let i = 0; i < 10; i += 1) {
      const before = rng.cursor;
      const [value, next] = nextRandomInt(6, rng);
      expect(next.cursor).toBe(before + 1);
      expect(next.trace).toHaveLength(i + 1);
      expect(next.trace[i]).toBe(`cursor=${before};bound=6;value=${value}`);
      rng = next;
    }
  });

  test("persists structured draw identity without the sampled value", () => {
    const [value, next, draw] = nextRandomInt(6, emptyRng(42), {
      kind: "integer",
      parameters: { minInclusive: 1, maxInclusive: 6 },
    });

    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(6);
    expect(draw).toEqual({
      index: 0,
      cursorBefore: 0,
      cursorAfter: 1,
      operation: {
        kind: "integer",
        parameters: { minInclusive: 1, maxInclusive: 6 },
      },
    });
    expect(next.draws).toEqual([draw]);
    expect(JSON.stringify(next.draws)).not.toContain('"value"');
  });

  test("is deterministic: same (seed, cursor) always produces the same value", () => {
    const a = nextRandomInt(100, emptyRng(42));
    const b = nextRandomInt(100, emptyRng(42));
    expect(a[0]).toBe(b[0]);
    expect(a[1].cursor).toBe(b[1].cursor);
    // Sum-of-streams equality check over multiple draws.
    let left = emptyRng(42);
    let right = emptyRng(42);
    const values: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const [vl, nl] = nextRandomInt(6, left);
      const [vr, nr] = nextRandomInt(6, right);
      expect(vl).toBe(vr);
      values.push(vl);
      left = nl;
      right = nr;
    }
  });

  test("different seeds produce different streams", () => {
    const stream = (seed: number): number[] => {
      let rng = emptyRng(seed);
      const out: number[] = [];
      for (let i = 0; i < 20; i += 1) {
        const [value, next] = nextRandomInt(6, rng);
        out.push(value);
        rng = next;
      }
      return out;
    };
    expect(stream(1)).not.toEqual(stream(2));
    expect(stream(42)).not.toEqual(stream(1337));
  });

  test("consecutive d6 draws are not a simple +1 counter (regression)", () => {
    // The previous LCG implementation was linear in cursor, so consecutive
    // draws differed by exactly 1 (mod 6): e.g. 1,2,3,4,5,6,1,2,3,... That
    // made dice sums deterministic per turn and broke apparent randomness.
    // This test guards the fix: at least one adjacent pair must differ by
    // something other than +1 (mod 6).
    let rng = emptyRng(1337);
    const values: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const [value, next] = nextRandomInt(6, rng);
      values.push(value);
      rng = next;
    }
    const adjacentDiffs = values
      .slice(1)
      .map((v, i) => (v - values[i]! + 6) % 6);
    const allPlusOne = adjacentDiffs.every((d) => d === 1);
    expect(allPlusOne).toBe(false);
  });

  test("d6 hits every face across a long stream (sanity-level distribution)", () => {
    let rng = emptyRng(7);
    const counts = new Map<number, number>();
    for (let i = 0; i < 600; i += 1) {
      const [value, next] = nextRandomInt(6, rng);
      counts.set(value, (counts.get(value) ?? 0) + 1);
      rng = next;
    }
    for (let face = 0; face < 6; face += 1) {
      const n = counts.get(face) ?? 0;
      // Generous bounds: uniform would hit each face 100/600 times; we
      // just want to catch the "+1 counter" and "always-0" failure modes.
      expect(n).toBeGreaterThan(40);
      expect(n).toBeLessThan(200);
    }
  });

  test("tolerates null seed (fallback) and large seeds without collapsing to a single value", () => {
    const streamOf = (rng: RuntimeRngState): number[] => {
      const values: number[] = [];
      let cur = rng;
      for (let i = 0; i < 10; i += 1) {
        const [value, next] = nextRandomInt(6, cur);
        values.push(value);
        cur = next;
      }
      return values;
    };
    const withNull = streamOf({ seed: null, cursor: 0, trace: [], draws: [] });
    const withLargeNegative = streamOf({
      seed: -5_308_350_261_799_157_000,
      cursor: 0,
      trace: [],
      draws: [],
    });
    // Neither stream should be all-zero (the previous implementation collapsed
    // to all-0 when seed overflowed uint31 precision).
    expect(new Set(withNull).size).toBeGreaterThan(1);
    expect(new Set(withLargeNegative).size).toBeGreaterThan(1);
  });
});
