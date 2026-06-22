import { describe, expect, test } from "bun:test";
import type { Wire } from "@dreamboard-games/reducer-contract";
import { runCandidateVerification } from "./testing-runtime.js";

function makeState(): Wire.ReducerSessionState {
  return {
    domain: {
      flow: {
        currentPhase: "play",
        activePlayers: ["player-1"],
      },
    },
    runtime: {},
  } as unknown as Wire.ReducerSessionState;
}

const reducer = {
  projectStatic: () => null,
  projectSeatsDynamic: () => ({
    currentStage: "main",
    simultaneousPhase: null,
    seats: {
      "player-1": {
        view: { score: 1 },
        availableInteractionRefs: ["play-card"],
        zones: {},
      },
    },
    interactionsByRef: {
      "play-card": {
        interactionId: "play-card",
        availability: { status: "available" },
        kind: "action",
      },
    },
  }),
  validateInput: async () => ({ valid: true }),
  dispatch: async ({ state }: { state: Wire.ReducerSessionState }) => ({
    kind: "accept" as const,
    state,
    trace: [],
  }),
};

describe("runCandidateVerification", () => {
  test("passes reducer scenarios using the shared test runtime", async () => {
    const result = await runCandidateVerification({
      bases: {
        start: {
          snapshot: makeState(),
          fingerprint: { players: 1 },
        },
      },
      reducer,
      scenarios: [
        {
          id: "play-card-visible",
          from: "start",
          phase: "play",
          when: async (ctx) => {
            await ctx.game.submit(ctx.seat(0), "play-card");
          },
          then: (ctx) => {
            ctx
              .expect(ctx.interactions(ctx.seat(0)))
              .toHaveInteraction("play-card");
          },
        },
      ],
    });

    expect(result).toMatchObject({
      status: "passed",
      scenarioSummary: {
        total: 1,
        passed: 1,
        failed: 0,
      },
    });
  });

  test("returns bounded assertion diagnostics for failed scenarios", async () => {
    const result = await runCandidateVerification({
      bases: {
        start: {
          snapshot: makeState(),
          fingerprint: { players: 1 },
        },
      },
      reducer,
      scenarios: [
        {
          id: "missing-interaction",
          from: "start",
          when: () => undefined,
          then: (ctx) => {
            ctx
              .expect(ctx.interactions(ctx.seat(0)))
              .toHaveInteraction("missing");
          },
        },
      ],
    });

    expect(result.status).toBe("failed");
    expect(result.scenarioSummary.failed).toBe(1);
    expect(result.scenarioSummary.scenarios[0]).toMatchObject({
      id: "missing-interaction",
      status: "failed",
      diagnostic: {
        kind: "assertion",
      },
    });
    expect(result.scenarioSummary.scenarios[0]?.diagnostic?.message).toContain(
      "missing",
    );
  });

  test("bounds submitted steps per scenario", async () => {
    const result = await runCandidateVerification({
      bases: {
        start: {
          snapshot: makeState(),
          fingerprint: { players: 1 },
        },
      },
      reducer,
      maxStepsPerScenario: 1,
      scenarios: [
        {
          id: "too-many-submits",
          from: "start",
          phase: "play",
          when: async (ctx) => {
            await ctx.game.submit(ctx.seat(0), "play-card");
            await ctx.game.submit(ctx.seat(0), "play-card");
          },
          then: () => undefined,
        },
      ],
    });

    expect(result.status).toBe("failed");
    expect(result.scenarioSummary.failed).toBe(1);
    expect(result.scenarioSummary.scenarios[0]?.diagnostic?.message).toContain(
      "maxStepsPerScenario",
    );
  });
});
