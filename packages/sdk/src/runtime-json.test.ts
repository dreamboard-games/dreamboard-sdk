import { describe, expect, test } from "bun:test";
import {
  JsonValidationError,
  assertJsonWithinLimits,
  parseBrowserAttributeJson,
  parseTransportJson,
} from "./runtime-json.js";

const smallLimits = {
  maxDepth: 2,
  maxNodes: 5,
  maxStringBytes: 4,
  maxCollectionEntries: 4,
};

function expectJsonError(code: JsonValidationError["code"], fn: () => void) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(JsonValidationError);
    expect((error as JsonValidationError).code).toBe(code);
    return;
  }
  throw new Error(`Expected JsonValidationError '${code}'.`);
}

describe("runtime JSON structural validation", () => {
  test("accepts JSON values at the configured structural limits", () => {
    expect(() =>
      assertJsonWithinLimits({ a: [true, "é"] }, smallLimits, "payload"),
    ).not.toThrow();
  });

  test("reports stable categories for structural limit failures", () => {
    expectJsonError("depth", () =>
      assertJsonWithinLimits([[[null]]], smallLimits, "payload"),
    );
    expectJsonError("nodes", () =>
      assertJsonWithinLimits(
        { a: { b: { c: null } } },
        { ...smallLimits, maxDepth: 4, maxNodes: 3 },
        "payload",
      ),
    );
    expectJsonError("string-bytes", () =>
      assertJsonWithinLimits("hello", smallLimits, "payload"),
    );
    expectJsonError("collection-entries", () =>
      assertJsonWithinLimits([[1, 2], [3, 4], [5]], smallLimits, "payload"),
    );
  });

  test("rejects cycles and non-JSON values before schema parsing", () => {
    const directCycle: unknown[] = [];
    directCycle.push(directCycle);
    expectJsonError("cycle", () =>
      assertJsonWithinLimits(directCycle, smallLimits, "payload"),
    );

    const indirectCycle: { next?: unknown } = {};
    indirectCycle.next = { indirectCycle };
    expectJsonError("cycle", () =>
      assertJsonWithinLimits(indirectCycle, smallLimits, "payload"),
    );

    for (const value of [
      new Date(),
      new Map(),
      new Set(),
      BigInt(1),
      () => undefined,
      Symbol("x"),
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expectJsonError("non-json", () =>
        assertJsonWithinLimits(value, smallLimits, "payload"),
      );
    }
  });

  test("accepts null-prototype records and counts multibyte strings as UTF-8", () => {
    const record = Object.create(null) as Record<string, unknown>;
    record.ok = true;
    expect(() =>
      assertJsonWithinLimits(record, smallLimits, "payload"),
    ).not.toThrow();
    expectJsonError("string-bytes", () =>
      assertJsonWithinLimits("ééé", smallLimits, "payload"),
    );
  });

  test("public parsers retain valid JSON and reject browser profile overages", () => {
    expect(parseTransportJson({ a: [1, null] })).toEqual({ a: [1, null] });
    expect(() => parseBrowserAttributeJson("x".repeat(65_537))).toThrow(
      JsonValidationError,
    );
  });
});
