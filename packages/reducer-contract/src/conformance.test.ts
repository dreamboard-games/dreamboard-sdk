import { describe, expect, test } from "bun:test";

import { FIXTURES } from "../fixtures";
import * as Builders from "../generated/builders";
import * as Wire from "../generated/wire";
import * as Zod from "../generated/zod";
import { REDUCER_CONTRACT_VERSION } from "../generated/version";

// Wire conformance: every canonical fixture must parse cleanly under the
// generated Zod schema that corresponds to its declared type. If this test
// fails, the JSON Schema, the generated Zod, or the fixture are out of sync
// — which is exactly the drift class the catan bug belonged to.
describe("wire fixtures parse under generated Zod", () => {
  const schemaForTypeName: Record<string, { parse: (v: unknown) => unknown }> =
    {
      DispatchRequest: Zod.DispatchRequestSchema,
      Effect: Zod.EffectSchema,
      ReduceResult: Zod.ReduceResultSchema,
      DispatchResult: Zod.DispatchResultSchema,
      GameInput: Zod.GameInputSchema,
      InitializePhaseRequest: Zod.InitializePhaseRequestSchema,
      InitializeRequest: Zod.InitializeRequestSchema,
      ProjectSeatsDynamicRequest: Zod.ProjectSeatsDynamicRequestSchema,
      ReduceRequest: Zod.ReduceRequestSchema,
      ReducerRuntimeLogEntry: Zod.ReducerRuntimeLogEntrySchema,
      ReducerRuntimeState: Zod.ReducerRuntimeStateSchema,
      ReducerSessionState: Zod.ReducerSessionStateSchema,
      SeatProjection: Zod.SeatProjectionSchema,
      SeatProjectionBundle: Zod.SeatProjectionBundleSchema,
      ValidateInputRequest: Zod.ValidateInputRequestSchema,
    };

  for (const fixture of FIXTURES) {
    test(`${fixture.name} (${fixture.typeName}) — ${fixture.why}`, () => {
      const schema = schemaForTypeName[fixture.typeName];
      if (!schema) {
        throw new Error(
          `Unknown fixture typeName ${fixture.typeName}; add it to schemaForTypeName.`,
        );
      }
      expect(() => schema.parse(fixture.value)).not.toThrow();
    });
  }
});

describe("generated builders produce wire-valid effects", () => {
  test("rollDie without continuation has NO __continuation and NO resume key", () => {
    const mint = Builders.createEffectIdMinter();
    const fx = Builders.createEffectBuilders(mint);

    const pending = fx.rollDie({ dieId: "die-red" });

    expect(pending.effectId).toBe("ef0");
    expect(pending.type).toBe("rollDie");
    // The old catan bug: wire shouldn't have a `resume` key at all.
    expect("resume" in pending).toBe(false);
    // And no `__continuation` tag either.
    expect("__continuation" in pending).toBe(false);

    // Zod should accept it as a bare Effect.
    const parsed = Zod.EffectSchema.parse(pending);
    expect(parsed).toEqual(pending);
  });

  test("rollDie with continuation carries __continuation privately but not on the wire effect", () => {
    const mint = Builders.createEffectIdMinter();
    const fx = Builders.createEffectBuilders(mint);
    const continuation: Wire.ContinuationToken = {
      id: "afterRoll",
      data: { dieId: "die-red" },
    };

    const pending = fx.rollDie({ dieId: "die-red" }, continuation);

    expect(pending.effectId).toBe("ef0");
    expect(
      (pending as unknown as { __continuation: unknown }).__continuation,
    ).toEqual(continuation);

    // materializeAccept strips the tag and routes to the continuations map.
    const materialized = Builders.materializeAccept([pending]);
    expect(materialized.effects).toHaveLength(1);
    expect("__continuation" in materialized.effects[0]!).toBe(false);
    expect("resume" in materialized.effects[0]!).toBe(false);
    expect(materialized.continuations).toEqual({ ef0: continuation });
  });

  test("shufflePlayerZone is a wire-valid Effect with playerId scope", () => {
    const mint = Builders.createEffectIdMinter();
    const fx = Builders.createEffectBuilders(mint);

    const pending = fx.shufflePlayerZone({
      zoneId: "deck",
      playerId: "player-1",
    });

    const parsed = Zod.EffectSchema.parse(
      pending,
    ) as Wire.EffectShufflePlayerZone;
    expect(parsed.type).toBe("shufflePlayerZone");
    expect(parsed.zoneId).toBe("deck");
    expect(parsed.playerId).toBe("player-1");
    expect("resume" in parsed).toBe(false);
  });

  test("materializeAccept builds a Zod-valid ReduceResult.Accept from mixed pending effects", () => {
    const mint = Builders.createEffectIdMinter();
    const fx = Builders.createEffectBuilders(mint);

    const pending = [
      fx.transition({ to: "resolve" }),
      fx.rollDie({ dieId: "die-red" }),
      fx.shuffleSharedZone(
        { zoneId: "dev-deck" },
        { id: "afterShuffle", data: {} },
      ),
      fx.shufflePlayerZone({ zoneId: "deck", playerId: "player-1" }),
    ];

    const { effects, continuations } = Builders.materializeAccept(pending);

    const accept: Wire.ReduceResult = {
      kind: "accept",
      state: {
        domain: {
          table: {
            playerOrder: ["player-1", "player-2"],
            zones: { shared: {}, perPlayer: {}, visibility: {} },
          },
          publicState: {},
          privateState: { "player-1": {}, "player-2": {} },
          hiddenState: {},
          flow: {
            currentPhase: "takeTurn",
            turn: 0,
            round: 0,
            activePlayers: ["player-1"],
          },
          phase: {},
        },
        runtime: {
          rng: { seed: 1337, cursor: 0, trace: [] },
          setup: null,
          simultaneous: { current: null },
          lastTransition: null,
        },
      },
      effects,
      continuations,
    };

    expect(() => Zod.ReduceResultSchema.parse(accept)).not.toThrow();

    // Continuations map only contains the effect that actually has a
    // continuation — no "resume: null" anywhere.
    expect(Object.keys(continuations)).toEqual(["ef2"]);
    for (const effect of effects) {
      expect("resume" in effect).toBe(false);
    }
  });

  test("Zod rejects a rogue effect that carries the legacy `resume` key", () => {
    // Regression guard: if anyone hand-constructs the old shape, the generated
    // Zod schema must reject it because `resume` is no longer in any variant.
    const legacy = {
      effectId: "ef0",
      type: "rollDie",
      dieId: "die-red",
      resume: { id: "afterRoll", data: {} },
    };
    expect(() => Zod.EffectSchema.parse(legacy)).toThrow();
  });

  test("Zod rejects a rogue effect that carries resume: null", () => {
    // The literal catan bug payload shape. New wire format makes it unparseable.
    const legacy = {
      effectId: "ef0",
      type: "rollDie",
      dieId: "die-red",
      resume: null,
    };
    expect(() => Zod.EffectSchema.parse(legacy)).toThrow();
  });
});

describe("protocol version constant", () => {
  test("is semver", () => {
    expect(REDUCER_CONTRACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// Strictness guard: if the generator ever drops `.strict()` on a branch,
// unknown fields would silently pass through and we'd lose the wire-drift
// signal that the whole contract package exists to provide.
describe("strict zod rejects unknown keys", () => {
  test("effects reject an extra field", () => {
    const effectWithExtra = {
      effectId: "ef0",
      type: "rollDie",
      dieId: "die-red",
      hacked: true,
    };
    expect(() => Zod.EffectSchema.parse(effectWithExtra)).toThrow();
  });

  test("reduce result rejects an extra top-level field", () => {
    const resultWithExtra = {
      kind: "reject",
      errorCode: "nope",
      unexpected: 42,
    };
    expect(() => Zod.ReduceResultSchema.parse(resultWithExtra)).toThrow();
  });

  test("dispatch trace entry rejects an extra field", () => {
    const traceEntryWithExtra = {
      kind: "accept",
      state: {},
      trace: [
        {
          kind: "appliedEffect",
          effect: { effectId: "ef0", type: "transition", to: "main" },
          bogus: "please fail",
        },
      ],
    };
    expect(() => Zod.DispatchResultSchema.parse(traceEntryWithExtra)).toThrow();
  });

  test("projection mode rejects unsupported strings", () => {
    const projectFixture = FIXTURES.find(
      (fixture) => fixture.typeName === "ProjectSeatsDynamicRequest",
    );
    if (!projectFixture) {
      throw new Error("Missing ProjectSeatsDynamicRequest fixture");
    }

    expect(() =>
      Zod.ProjectSeatsDynamicRequestSchema.parse({
        ...projectFixture.value,
        projectionMode: "actionsOnly",
      }),
    ).not.toThrow();
    expect(() =>
      Zod.ProjectSeatsDynamicRequestSchema.parse({
        ...projectFixture.value,
        projectionMode: "summary",
      }),
    ).toThrow();
  });
});

describe("round-trip stability", () => {
  // JSON in -> Zod parse -> JSON.stringify -> re-parse -> equal.
  // Catches any Zod transform that would mutate the wire.
  for (const fixture of FIXTURES) {
    test(`${fixture.name} round-trips stably`, () => {
      const schema: { parse: (v: unknown) => unknown } =
        fixture.typeName === "Effect"
          ? Zod.EffectSchema
          : fixture.typeName === "InitializeRequest"
            ? Zod.InitializeRequestSchema
            : fixture.typeName === "InitializePhaseRequest"
              ? Zod.InitializePhaseRequestSchema
              : fixture.typeName === "ValidateInputRequest"
                ? Zod.ValidateInputRequestSchema
                : fixture.typeName === "ReduceRequest"
                  ? Zod.ReduceRequestSchema
                  : fixture.typeName === "DispatchRequest"
                    ? Zod.DispatchRequestSchema
                    : fixture.typeName === "ProjectSeatsDynamicRequest"
                      ? Zod.ProjectSeatsDynamicRequestSchema
                      : fixture.typeName === "SeatProjection"
                        ? Zod.SeatProjectionSchema
                        : fixture.typeName === "SeatProjectionBundle"
                          ? Zod.SeatProjectionBundleSchema
                          : fixture.typeName === "ReducerSessionState"
                            ? Zod.ReducerSessionStateSchema
                            : fixture.typeName === "ReducerRuntimeState"
                              ? Zod.ReducerRuntimeStateSchema
                              : fixture.typeName === "ReducerRuntimeLogEntry"
                                ? Zod.ReducerRuntimeLogEntrySchema
                                : fixture.typeName === "ReduceResult"
                                  ? Zod.ReduceResultSchema
                                  : fixture.typeName === "DispatchResult"
                                    ? Zod.DispatchResultSchema
                                    : Zod.GameInputSchema;
      const parsed = schema.parse(fixture.value);
      const reparsed = schema.parse(JSON.parse(JSON.stringify(parsed)));
      expect(reparsed).toEqual(parsed);
    });
  }
});

// Canonicalize sort keys so structural comparison is order-insensitive.
// The test matters because these fixtures are the canonical reducer bundle
// wire examples. zod-parsed output should match the raw fixture modulo key
// order and whitespace.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, canonicalize(v)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

describe("fixture parity: zod-parsed fixtures match raw fixture JSON", () => {
  // zod-parse(raw) should equal raw up to key ordering.
  for (const fixture of FIXTURES) {
    test(`${fixture.name} zod-parsed output equals raw fixture`, () => {
      const schemaForTypeName: Record<
        string,
        { parse: (v: unknown) => unknown }
      > = {
        DispatchRequest: Zod.DispatchRequestSchema,
        DispatchResult: Zod.DispatchResultSchema,
        Effect: Zod.EffectSchema,
        GameInput: Zod.GameInputSchema,
        InitializePhaseRequest: Zod.InitializePhaseRequestSchema,
        InitializeRequest: Zod.InitializeRequestSchema,
        ProjectSeatsDynamicRequest: Zod.ProjectSeatsDynamicRequestSchema,
        ReduceRequest: Zod.ReduceRequestSchema,
        ReduceResult: Zod.ReduceResultSchema,
        ReducerRuntimeLogEntry: Zod.ReducerRuntimeLogEntrySchema,
        ReducerRuntimeState: Zod.ReducerRuntimeStateSchema,
        ReducerSessionState: Zod.ReducerSessionStateSchema,
        SeatProjection: Zod.SeatProjectionSchema,
        SeatProjectionBundle: Zod.SeatProjectionBundleSchema,
        ValidateInputRequest: Zod.ValidateInputRequestSchema,
      };
      const schema = schemaForTypeName[fixture.typeName];
      if (!schema) {
        throw new Error(
          `Unknown fixture typeName ${fixture.typeName}; add it to schemaForTypeName.`,
        );
      }

      const parsed = schema.parse(fixture.value);
      expect(canonicalize(parsed)).toEqual(canonicalize(fixture.value));
    });
  }
});
