import { describe, expect, test } from "vitest";

import { REDUCER_CONTRACT_VERSION } from "../generated/version";
import { assertReducerBundleContract } from "./bundle";

function validBundle(): Record<string, unknown> {
  return {
    reducerContractVersion: REDUCER_CONTRACT_VERSION,
    initialize: () => ({}),
    initializePhase: () => ({}),
    validateInput: () => ({}),
    reduce: () => ({}),
    dispatch: () => ({}),
    projectStatic: () => null,
    projectSeatsDynamic: () => ({}),
  };
}

describe("assertReducerBundleContract", () => {
  test("accepts the exact generated reducer bundle ABI", () => {
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

  test("rejects a bundle missing any generated callable operation", () => {
    const candidate = validBundle();
    delete candidate.validateInput;

    expect(() =>
      assertReducerBundleContract(candidate, "candidate.mjs"),
    ).toThrow("Reducer bundle candidate.mjs is missing validateInput().");
  });
});
