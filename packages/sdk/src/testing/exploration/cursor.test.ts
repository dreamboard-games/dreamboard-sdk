import { describe, expect, test } from "bun:test";
import {
  createExploreCursor,
  ExploreCursorError,
  readExploreCursor,
} from "./cursor.js";
import type { PerspectiveRef, ScenarioIdentity } from "../inspection/types.js";

const scenario: ScenarioIdentity = {
  id: "fixture",
  path: "test/scenarios/fixture.scenario.ts",
  sourceDigest: "sha256:source",
};
const perspective: PerspectiveRef = {
  kind: "player",
  actor: { seat: 0, playerId: "player-1" },
};

describe("explore cursor", () => {
  test("round-trips authority and next ordinal", () => {
    const cursor = createExploreCursor({
      scenario,
      checkpointDigest: "sha256:checkpoint",
      perspective,
      seedOverride: 17,
      nextOrdinal: 51,
    });

    expect(
      readExploreCursor({
        cursor,
        scenario,
        checkpointDigest: "sha256:checkpoint",
        perspective,
        seedOverride: 17,
      }),
    ).toBe(51);
  });

  test.each([
    ["source", { ...scenario, sourceDigest: "sha256:changed" }],
    ["checkpoint", scenario],
  ])("rejects a stale %s authority", (kind, selectedScenario) => {
    const cursor = createExploreCursor({
      scenario,
      checkpointDigest: "sha256:checkpoint",
      perspective,
      nextOrdinal: 1,
    });

    expect(() =>
      readExploreCursor({
        cursor,
        scenario: selectedScenario,
        checkpointDigest:
          kind === "checkpoint" ? "sha256:changed" : "sha256:checkpoint",
        perspective,
      }),
    ).toThrow(ExploreCursorError);
  });

  test("rejects tampering", () => {
    const cursor = createExploreCursor({
      scenario,
      checkpointDigest: "sha256:checkpoint",
      perspective,
      nextOrdinal: 1,
    });

    expect(() =>
      readExploreCursor({
        cursor: `${cursor}x`,
        scenario,
        checkpointDigest: "sha256:checkpoint",
        perspective,
      }),
    ).toThrow(ExploreCursorError);
  });
});
