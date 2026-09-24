import { describe, expect, test } from "vitest";
import { FIXTURES } from "./__fixtures__/runtime";
import type * as Wire from "./runtime-types";
import * as Zod from "./runtime-schema";
import { REDUCER_CONTRACT_VERSION } from "./worker-contract";

describe("completed reductions", () => {
  test("accepts final state and events and rejects pending work", () => {
    const fixture = FIXTURES.find(
      (entry) => entry.name === "dispatch-result-accept",
    )!;
    const accepted = Zod.DispatchResultSchema.parse(fixture.value);
    expect(accepted.kind).toBe("accept");
    expect(() =>
      Zod.DispatchResultSchema.parse({ ...accepted, effects: [] }),
    ).toThrow();
    expect(() =>
      Zod.DispatchResultSchema.parse({ ...accepted, continuations: {} }),
    ).toThrow();
  });
  test("records actual phase entries, including same-phase reentry", () => {
    const entry = { kind: "phaseEntered", from: "play", to: "play" } as const;
    expect(Zod.DispatchTraceSchema.parse(entry)).toEqual(entry);
    expect(
      Zod.ReducerRuntimeLogEntrySchema.parse({ ...entry, version: 1 }),
    ).toEqual({ ...entry, version: 1 });
    expect(() =>
      Zod.DispatchTraceSchema.parse({
        kind: "appliedEffect",
        effect: { type: "transition", to: "play" },
      }),
    ).toThrow();
  });
});

describe("protocol version constant", () => {
  test("is semver", () => {
    expect(REDUCER_CONTRACT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("structured RNG draw compatibility", () => {
  test("accepts legacy RNG state without structured draws", () => {
    expect(() =>
      Zod.RngStateSchema.parse({ seed: 42, cursor: 1, trace: ["legacy"] }),
    ).not.toThrow();
  });

  test("accepts structured draw identity and rejects sampled values", () => {
    const draw = {
      index: 0,
      cursorBefore: 0,
      cursorAfter: 1,
      operation: {
        kind: "integer",
        parameters: { minInclusive: 1, maxInclusive: 6 },
      },
    };
    expect(() => Zod.RngDrawSchema.parse(draw)).not.toThrow();
    expect(() => Zod.RngDrawSchema.parse({ ...draw, value: 4 })).toThrow();
  });

  test("keeps persisted legacy RNG log entries readable", () => {
    expect(() =>
      Zod.ReducerRuntimeLogEntrySchema.parse({
        kind: "rngConsumption",
        version: 1,
        operation: "rollDie",
        traceEntry: "legacy-value-bearing-entry",
      }),
    ).not.toThrow();
    expect(() =>
      Zod.ReducerRuntimeLogEntrySchema.parse({
        kind: "rngConsumption",
        version: 2,
        operation: "rollDie",
        drawIndex: 0,
        traceEntry: "legacy-value-bearing-entry",
      }),
    ).not.toThrow();
  });
});

describe("GameOutcome wire shape", () => {
  test("accepts scoreless tied outcomes", () => {
    const parsed = Zod.GameOutcomeSchema.parse({
      reason: { code: "SECOND_STORM" },
      standings: [
        { playerId: "player-1", rank: 1, result: "draw" },
        { playerId: "player-2", rank: 1, result: "draw" },
      ],
    });

    expect(parsed.standings).toHaveLength(2);
  });

  test("accepts breakdown and tie-break evidence", () => {
    const parsed = Zod.GameOutcomeSchema.parse({
      reason: {
        code: "ROUND_LIMIT_REACHED",
        message: "The final round is complete.",
      },
      standings: [
        {
          playerId: "player-1",
          rank: 1,
          result: "win",
          score: 18,
          scoreBreakdown: [
            { id: "routes", label: "Routes", value: 12 },
            { id: "bonuses", label: "Bonuses", value: 6 },
          ],
          tieBreaks: [
            { id: "cards-left", label: "Cards left", value: 2 },
            { id: "seed-order", label: "Seed order", value: "A" },
          ],
        },
      ],
    });

    expect(parsed.standings[0]?.scoreBreakdown?.[0]?.value).toBe(12);
  });

  test("rejects the legacy winner and score-map terminal payload", () => {
    const legacyWinnerKey = `winner${"Player"}Id`;
    const legacyScoreMapKey = `final${"Scores"}`;
    expect(() =>
      Zod.GameOutcomeSchema.parse({
        [legacyWinnerKey]: "player-1",
        [legacyScoreMapKey]: { "player-1": 12 },
        reason: "Game ended.",
      }),
    ).toThrow();
  });

  test("rejects invalid ranks and non-finite scores", () => {
    expect(() =>
      Zod.GameOutcomeSchema.parse({
        reason: { code: "EMPTY_STANDINGS" },
        standings: [],
      }),
    ).toThrow();
    expect(() =>
      Zod.GameOutcomeSchema.parse({
        reason: { code: "BAD_RANK" },
        standings: [{ playerId: "player-1", rank: 0, result: "win" }],
      }),
    ).toThrow();
    expect(() =>
      Zod.GameOutcomeSchema.parse({
        reason: { code: "BAD_SCORE" },
        standings: [
          { playerId: "player-1", rank: 1, result: "win", score: Infinity },
        ],
      }),
    ).toThrow();
  });
});

// Strictness guard: if the generator ever drops `.strict()` on a branch,
// unknown fields would silently pass through and we'd lose the wire-drift
// signal that the whole contract package exists to provide.
describe("strict zod rejects unknown keys", () => {
  test("phase entries reject an extra field", () => {
    expect(() =>
      Zod.DispatchTraceSchema.parse({
        kind: "phaseEntered",
        from: "play",
        to: "end",
        hacked: true,
      }),
    ).toThrow();
  });

  test("dispatch result rejects an extra top-level field", () => {
    const resultWithExtra = {
      kind: "reject",
      errorCode: "nope",
      unexpected: 42,
    };
    expect(() => Zod.DispatchResultSchema.parse(resultWithExtra)).toThrow();
  });

  test("dispatch trace entry rejects an extra field", () => {
    const traceEntryWithExtra = {
      kind: "accept",
      state: {},
      trace: [
        {
          kind: "phaseEntered",
          from: "setup",
          to: "main",
          bogus: "please fail",
        },
      ],
    };
    expect(() => Zod.DispatchResultSchema.parse(traceEntryWithExtra)).toThrow();
  });

  test("projection rejects obsolete mode options", () => {
    const projectFixture = FIXTURES.find(
      (fixture) => fixture.typeName === "ProjectRequest",
    );
    if (!projectFixture) {
      throw new Error("Missing ProjectRequest fixture");
    }

    expect(() =>
      Zod.ProjectRequestSchema.parse({
        ...projectFixture.value,
        projectionMode: "actionsOnly",
      }),
    ).toThrow();
    expect(() =>
      Zod.ProjectRequestSchema.parse({
        ...projectFixture.value,
        projectionMode: "summary",
      }),
    ).toThrow();
  });

  test("seat projection bundle accepts strict timing metadata", () => {
    const projectionFixture = FIXTURES.find(
      (fixture) => fixture.typeName === "SeatProjectionBundle",
    );
    if (!projectionFixture) {
      throw new Error("Missing SeatProjectionBundle fixture");
    }
    const timing = {
      resolveAvailableInteractionsMs: 1,
      resolveViewMs: 2,
      resolveZoneHandlesMs: 3,
      descriptorHashMs: 4,
    };

    expect(() =>
      Zod.SeatProjectionBundleSchema.parse({
        ...projectionFixture.value,
        timing,
      }),
    ).not.toThrow();
    expect(() =>
      Zod.SeatProjectionBundleSchema.parse({
        ...projectionFixture.value,
        timing: {
          ...timing,
          unexpected: 5,
        },
      }),
    ).toThrow();
  });

  test("scheduler flow projection carries actor identities but no private payload", () => {
    const projectionFixture = FIXTURES.find(
      (fixture) => fixture.typeName === "SeatProjectionBundle",
    );
    if (!projectionFixture) {
      throw new Error("Missing SeatProjectionBundle fixture");
    }
    const schedulerFlow = (
      projectionFixture.value as {
        schedulerFlow?: Wire.SchedulerFlowAuthorityProjection;
      }
    ).schedulerFlow;

    expect(schedulerFlow).toEqual({
      version: 1,
      activePlayerIds: ["player-2"],
      pendingPlayerIds: ["player-2"],
      continuationDependencies: [
        {
          waiterPlayerId: "player-1",
          blockerPlayerIds: ["player-2"],
        },
      ],
    });
    expect(() =>
      Zod.SeatProjectionBundleSchema.parse({
        ...projectionFixture.value,
        schedulerFlow: {
          ...schedulerFlow,
          submittedParams: { answer: "private" },
        },
      }),
    ).toThrow();
  });
});

describe("committed step wire shape", () => {
  test("cancel is an actor command without params", () => {
    const command = {
      kind: "interaction.cancel",
      playerId: "player-1",
      interactionId: "choose",
    };
    expect(Zod.GameInputSchema.parse(command)).toEqual(command);
    expect(() =>
      Zod.GameInputSchema.parse({ ...command, params: {} }),
    ).toThrow();
  });
});
