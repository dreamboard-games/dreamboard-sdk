import { describe, expect, test } from "bun:test";
import {
  digestScenarioProjection,
  scenarioProjectionInputMetadata,
  type ScenarioProjectionParity,
} from "./scenario-projection-digest.js";

const projection: ScenarioProjectionParity = {
  perspective: { seat: 0 },
  flow: {
    phase: "turn",
    step: null,
    activeSeats: [0],
    pendingSeats: [],
    continuationWaiterSeats: [],
    blockedBy: [],
  },
  view: { count: 1 },
  interactions: [
    {
      actorSeat: 0,
      interactionId: "increment",
      availability: { status: "available" },
      inputs: [{ key: "amount", kind: "number", eligibleCount: "lazy" }],
    },
  ],
};

describe("scenario projection digest", () => {
  test("shares eligible-count normalization with trusted descriptors", () => {
    expect(
      scenarioProjectionInputMetadata({
        key: "amount",
        kind: "number",
        domain: { type: "boundedNumber", min: 1, max: 5, step: 2 },
      }),
    ).toEqual({ key: "amount", kind: "number", eligibleCount: 3 });
  });

  test("is stable for the same semantic perspective projection", () => {
    expect(digestScenarioProjection(projection)).toBe(
      digestScenarioProjection(structuredClone(projection)),
    );
  });

  test("changes when flow or the selected view changes", () => {
    expect(
      digestScenarioProjection({
        ...projection,
        view: { count: 2 },
      }),
    ).not.toBe(digestScenarioProjection(projection));
    expect(
      digestScenarioProjection({
        ...projection,
        flow: { ...projection.flow, activeSeats: [1] },
      }),
    ).not.toBe(digestScenarioProjection(projection));
  });
});
