import type * as Wire from "./runtime-types";
import { describe, expect, it } from "vitest";
import { FIXTURES } from "./__fixtures__/runtime";
import { RuntimeJsonSchema, type RuntimeJson } from "./runtime-json";
import * as current from "./runtime-schema";

const sessionFixture = FIXTURES.find(
  (fixture) => fixture.typeName === "ReducerSessionState",
)!;
const state = current.ReducerSessionStateSchema.parse(sessionFixture.value);

const checkedInput = {
  kind: "interaction",
  playerId: "player-1",
  interactionId: "play",
  params: { nested: [null, { active: true }, 2.5, "value"] },
} satisfies Wire.GameInput;
const checkedRequest = {
  table: {},
  playerIds: ["player-1"],
  rngSeed: null,
  options: { enabled: true },
} satisfies Wire.InitializeRequest;

const checkedJson: RuntimeJson = checkedInput.params;

describe("canonical runtime schemas", () => {
  it.each(FIXTURES)("preserves fixture $name", (fixture) => {
    const schemaName = `${fixture.typeName}Schema` as const;
    const expected = fixture.value;
    const result = current[schemaName].parse(expected);
    expect(result).toEqual(expected);
    expect(
      current[schemaName].parse(JSON.parse(JSON.stringify(result))),
    ).toEqual(expected);
  });

  it("admits checked inferred DTOs and recursive JSON without coercion", () => {
    expect(current.GameInputSchema.parse(checkedInput)).toEqual(checkedInput);
    expect(current.InitializeRequestSchema.parse(checkedRequest)).toEqual(
      checkedRequest,
    );
    expect(RuntimeJsonSchema.parse(checkedJson)).toEqual(checkedJson);
    expect(
      RuntimeJsonSchema.parse({ meta: { contractFingerprint: "game data" } }),
    ).toEqual({ meta: { contractFingerprint: "game data" } });
  });

  it.each([
    undefined,
    BigInt(1),
    NaN,
    Infinity,
    new Date(),
    () => 1,
    Symbol("x"),
  ])("rejects non-JSON values recursively: %s", (value) => {
    expect(RuntimeJsonSchema.safeParse(value).success).toBe(false);
    expect(RuntimeJsonSchema.safeParse({ nested: [value] }).success).toBe(
      false,
    );
  });

  it("removes fingerprint metadata by rejecting the old envelope", () => {
    expect(
      current.ReducerSessionStateSchema.safeParse({
        ...state,
        meta: { contractFingerprint: "cfp1:0123456789abcdef" },
      }).success,
    ).toBe(false);
    expect(current.ReducerSessionStateSchema.parse(state)).toEqual(state);
  });

  it("rejects unknown envelope keys and malformed required state", () => {
    for (const candidate of [
      { ...state, unexpected: true },
      { ...state, runtime: { ...state.runtime, unexpected: true } },
      { ...state, domain: { ...state.domain, unexpected: true } },
      { ...state, runtime: { ...state.runtime, options: null } },
      {
        ...state,
        runtime: { ...state.runtime, options: { invalid: undefined } },
      },
      { ...state, domain: { ...state.domain, privateState: null } },
      { runtime: state.runtime },
    ]) {
      expect(
        current.ReducerSessionStateSchema.safeParse(candidate).success,
      ).toBe(false);
    }
    expect(
      current.InitializeRequestSchema.safeParse({
        ...checkedRequest,
        setup: {},
      }).success,
    ).toBe(false);
    expect(
      current.GameInputSchema.safeParse({ ...checkedInput, unexpected: true })
        .success,
    ).toBe(false);
  });

  it("preserves absent, nullable and optional nonnullable distinctions", () => {
    const initialize = { table: null, playerIds: [] };
    expect(current.InitializeRequestSchema.parse(initialize)).toEqual(
      initialize,
    );
    expect(
      current.InitializeRequestSchema.parse({ ...initialize, rngSeed: null }),
    ).toEqual({ ...initialize, rngSeed: null });
    expect(
      current.InitializeRequestSchema.safeParse({
        ...initialize,
        options: null,
      }).success,
    ).toBe(false);
    expect(
      current.SeatProjectionBundleSchema.parse({ seats: {}, events: [] }),
    ).toEqual({
      seats: {},
      events: [],
    });
    expect(
      current.SeatProjectionBundleSchema.parse({
        seats: {},
        events: [],
        simultaneousPhase: null,
      }),
    ).toEqual({
      seats: {},
      events: [],
      simultaneousPhase: null,
    });
    expect(
      current.DispatchResultSchema.safeParse({
        kind: "reject",
        errorCode: "invalid",
        message: null,
      }).success,
    ).toBe(false);
    expect(
      current.InitializeResultSchema.safeParse({ state, terminal: null })
        .success,
    ).toBe(false);
  });

  it("preserves integer, finite, lower-bound and event-count semantics", () => {
    // Seeds historically permit integer numbers outside the safe-integer range.
    const seed = Number.MAX_SAFE_INTEGER + 1;
    expect(
      current.RngStateSchema.parse({ seed, cursor: 0, trace: [] }).seed,
    ).toBe(seed);
    expect(
      current.RngStateSchema.safeParse({ seed: 1.5, cursor: 0, trace: [] })
        .success,
    ).toBe(false);
    expect(
      current.RngStateSchema.safeParse({ seed: null, cursor: seed, trace: [] })
        .success,
    ).toBe(false);
    const standing = { playerId: "p", rank: 1, result: "win" };
    expect(
      current.OutcomeStandingSchema.safeParse({ ...standing, rank: 0 }).success,
    ).toBe(false);
    expect(
      current.OutcomeStandingSchema.safeParse({ ...standing, score: Infinity })
        .success,
    ).toBe(false);
    const event = { kind: "systemAction", procedureId: "deal", title: "Deal" };
    const result = {
      kind: "accept",
      state,
      trace: [],
      events: Array(32).fill(event),
    };
    expect(current.DispatchResultSchema.safeParse(result).success).toBe(true);
    expect(
      current.DispatchResultSchema.safeParse({
        ...result,
        events: Array(33).fill(event),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown discriminators and mismatched variant properties", () => {
    expect(
      current.GameInputSchema.safeParse({ ...checkedInput, kind: "unknown" })
        .success,
    ).toBe(false);
    expect(
      current.DispatchResultSchema.safeParse({
        kind: "reject",
        errorCode: "invalid",
        state,
      }).success,
    ).toBe(false);
    expect(
      current.DispatchTraceSchema.safeParse({
        kind: "rngConsumption",
        version: 1,
        operation: "roll",
        drawIndex: 0,
        traceEntry: "x",
      }).success,
    ).toBe(false);
  });
});
