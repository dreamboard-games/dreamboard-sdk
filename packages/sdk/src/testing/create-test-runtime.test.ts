import { describe, expect, test } from "bun:test";
import type { Wire } from "@dreamboard-games/reducer-contract";
import { StaleContractArtifactError } from "../reducer/stale-contract-artifact-error";
import { createTestRuntime } from "./create-test-runtime";

function makeState(phase = "play"): Wire.ReducerSessionState {
  return {
    domain: {
      flow: {
        currentPhase: phase,
        activePlayers: ["player-1"],
      },
    },
    runtime: {},
  } as unknown as Wire.ReducerSessionState;
}

function makeRuntime(options: { valid?: boolean } = {}) {
  const baseState = makeState();
  return createTestRuntime({
    baseId: "start",
    baseStates: {
      start: {
        snapshot: baseState,
        fingerprint: { players: 2 },
      },
    },
    bundle: {
      projectSeatsDynamic() {
        return {
          currentStage: "main",
          stageSeats: ["player-1"],
          simultaneousPhase: null,
          seats: {
            "player-1": {
              view: {},
              availableInteractionRefs: [],
              zones: {},
            },
          },
          interactionsByRef: {},
        };
      },
      async validateInput() {
        return options.valid === false
          ? {
              valid: false,
              errorCode: "NOT_ALLOWED",
              message: "Not allowed.",
            }
          : { valid: true };
      },
      async dispatch() {
        return {
          kind: "accept" as const,
          state: makeState("done"),
          trace: [
            {
              kind: "acceptedClientInput",
              input: {
                kind: "interaction",
                playerId: "player-1",
                interactionId: "score",
                params: {},
              },
            },
            {
              kind: "appliedEffect",
              effect: { kind: "flow.transition", to: "done" },
            },
          ],
        };
      },
    },
  });
}

describe("createTestRuntime diagnostics", () => {
  test("throws an actionable stale-artifact error before materializing stale base states", () => {
    expect(() =>
      createTestRuntime({
        baseId: "start",
        contractFingerprint: "cfp1:current00000000",
        expectedBaseStateFingerprint: "cfp1:stale0000000000",
        baseStates: {
          start: {
            snapshot: makeState(),
            fingerprint: { players: 2 },
          },
        },
        bundle: {
          projectSeatsDynamic() {
            throw new Error("projection should not run for stale base states");
          },
          async validateInput() {
            return { valid: true };
          },
          async dispatch() {
            throw new Error("dispatch should not run");
          },
        },
      }),
    ).toThrow(StaleContractArtifactError);
    expect(() =>
      createTestRuntime({
        baseId: "start",
        contractFingerprint: "cfp1:current00000000",
        expectedBaseStateFingerprint: "cfp1:stale0000000000",
        baseStates: {
          start: {
            snapshot: makeState(),
            fingerprint: { players: 2 },
          },
        },
        bundle: {
          projectSeatsDynamic() {
            throw new Error("projection should not run for stale base states");
          },
          async validateInput() {
            return { valid: true };
          },
          async dispatch() {
            throw new Error("dispatch should not run");
          },
        },
      }),
    ).toThrow(/dreamboard test generate/);
  });

  test("accepted submit captures ordered events and last dispatch trace", async () => {
    const runtime = makeRuntime();

    await runtime.submit("player-1", "score", {});

    expect(runtime.diagnostics.events).toEqual([
      {
        type: "submitReceived",
        submissionId: "sub-1",
        playerId: "player-1",
        interactionId: "score",
        phase: "play",
      },
      {
        type: "submitAccepted",
        submissionId: "sub-1",
        trace: [
          {
            kind: "acceptedClientInput",
            playerId: "player-1",
            interactionId: "score",
          },
          { kind: "appliedInstruction", instruction: "flow.transition" },
        ],
      },
    ]);
    expect(runtime.diagnostics.lastDispatch).toEqual({
      submissionId: "sub-1",
      trace: [
        {
          kind: "acceptedClientInput",
          playerId: "player-1",
          interactionId: "score",
        },
        { kind: "appliedInstruction", instruction: "flow.transition" },
      ],
    });
  });

  test("rejected submit captures error details and clear resets state", async () => {
    const runtime = makeRuntime({ valid: false });

    await expect(runtime.submit("player-1", "score", {})).rejects.toThrow(
      "Not allowed.",
    );
    expect(runtime.diagnostics.events).toEqual([
      {
        type: "submitReceived",
        submissionId: "sub-1",
        playerId: "player-1",
        interactionId: "score",
        phase: "play",
      },
      {
        type: "submitRejected",
        submissionId: "sub-1",
        errorCode: "NOT_ALLOWED",
        message: "Not allowed.",
      },
    ]);
    expect(runtime.diagnostics.lastDispatch).toBeNull();

    runtime.diagnostics.clear();

    expect(runtime.diagnostics.events).toEqual([]);
    expect(runtime.diagnostics.lastDispatch).toBeNull();
  });
});
