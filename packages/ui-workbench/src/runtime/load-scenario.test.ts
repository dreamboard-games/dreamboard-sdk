import { describe, expect, test } from "bun:test";
import { assertContractFingerprint } from "./load-scenario.js";

describe("load-scenario runtime guards", () => {
  test("contract fingerprint mismatch gives a regeneration instruction", () => {
    expect(() =>
      assertContractFingerprint("sha256:render", "sha256:fixture"),
    ).toThrow(/Regenerate the UI fixture bundle/);
  });
});
