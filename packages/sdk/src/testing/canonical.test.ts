import { describe, expect, test } from "vitest";
import {
  canonicalScenarioJson,
  compareCanonicalScenarioJson,
  digestScenarioJson,
} from "./canonical.js";

describe("scenario diagnostic canonical JSON", () => {
  test("orders object keys recursively and hashes the canonical value", () => {
    const left = { z: [{ b: 2, a: 1 }], a: true };
    const right = { a: true, z: [{ a: 1, b: 2 }] };

    expect(canonicalScenarioJson(left)).toBe(canonicalScenarioJson(right));
    expect(digestScenarioJson(left)).toBe(digestScenarioJson(right));
  });

  test("provides a deterministic candidate ordering", () => {
    expect(
      compareCanonicalScenarioJson({ value: 1 }, { value: 2 }),
    ).toBeLessThan(0);
  });
});
