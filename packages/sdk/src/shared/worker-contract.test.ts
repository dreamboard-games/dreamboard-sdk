import { describe, expect, test } from "vitest";

import { REDUCER_CONTRACT_VERSION } from "./worker-contract";
import { assertReducerBundleContract } from "./worker-contract";

function validBundle(): Record<string, unknown> {
  return {
    reducerContractVersion: REDUCER_CONTRACT_VERSION,
    initialize: () => ({}),
    dispatch: () => ({}),
    boardStatic: () => null,
    project: () => ({}),
  };
}

describe("assertReducerBundleContract", () => {
  test("accepts the exact reducer bundle ABI", () => {
    const candidate: unknown = validBundle();

    expect(() =>
      assertReducerBundleContract(candidate, "candidate.mjs"),
    ).not.toThrow();
  });

  test("rejects a bundle from an older contract version", () => {
    const candidate = {
      ...validBundle(),
      reducerContractVersion: "0.3.0",
    };

    expect(() =>
      assertReducerBundleContract(candidate, "candidate.mjs"),
    ).toThrow(
      `Reducer bundle candidate.mjs requires exact contract ${REDUCER_CONTRACT_VERSION}; received 0.3.0.`,
    );
  });

  test("rejects a different contract version with the same major", () => {
    const [major, minor, patch] = REDUCER_CONTRACT_VERSION.split(".");
    const receivedVersion = `${major}.${minor}.${Number(patch) + 1}`;
    const candidate = {
      ...validBundle(),
      reducerContractVersion: receivedVersion,
    };

    expect(() =>
      assertReducerBundleContract(candidate, "candidate.mjs"),
    ).toThrow(
      `Reducer bundle candidate.mjs requires exact contract ${REDUCER_CONTRACT_VERSION}; received ${receivedVersion}.`,
    );
  });

  test.each(["initialize", "dispatch", "boardStatic", "project"])(
    "rejects a missing or noncallable %s operation",
    (method) => {
      const candidate = validBundle();
      delete candidate[method];
      expect(() =>
        assertReducerBundleContract(candidate, "candidate.js"),
      ).toThrow(`Reducer bundle candidate.js is missing ${method}().`);
      candidate[method] = {};
      expect(() =>
        assertReducerBundleContract(candidate, "candidate.js"),
      ).toThrow(`Reducer bundle candidate.js is missing ${method}().`);
    },
  );
  test.each([null, undefined, [], "bundle", 42])(
    "rejects non-object %s",
    (value) => {
      expect(() => assertReducerBundleContract(value, "candidate.js")).toThrow(
        "did not export an object",
      );
    },
  );
});
