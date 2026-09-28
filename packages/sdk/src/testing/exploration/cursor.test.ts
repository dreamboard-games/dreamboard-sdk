import { digestPluginRuntimeJson } from "../../shared/protocol/digest.js";
import { describe, expect, test } from "vitest";
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
  ] satisfies [string, ScenarioIdentity][])(
    "rejects a stale %s authority",
    (kind, selectedScenario) => {
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
    },
  );

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

test.each([
  null,
  [],
  {},
  {
    version: 1,
    scenarioSourceDigest: "sha256:source",
    checkpointDigest: "sha256:checkpoint",
    perspective,
    seedOverride: null,
    nextOrdinal: -1,
  },
  {
    version: 1,
    scenarioSourceDigest: "sha256:source",
    checkpointDigest: "sha256:checkpoint",
    perspective,
    seedOverride: null,
    nextOrdinal: 0.5,
  },
  {
    version: 1,
    scenarioSourceDigest: "sha256:source",
    checkpointDigest: "sha256:checkpoint",
    perspective,
    seedOverride: null,
    nextOrdinal: Number.MAX_SAFE_INTEGER + 1,
  },
  {
    version: 1,
    scenarioSourceDigest: "sha256:source",
    checkpointDigest: "sha256:checkpoint",
    perspective: { kind: "player", actor: null },
    seedOverride: null,
    nextOrdinal: 1,
  },
])(
  "rejects malformed checksummed payload %# with the cursor error",
  (payload) => {
    const encoded = btoa(JSON.stringify(payload))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    const digest = digestPluginRuntimeJson(payload).slice("sha256:".length);
    expect(() =>
      readExploreCursor({
        cursor: `dbx1.${encoded}.${digest}`,
        scenario,
        checkpointDigest: "sha256:checkpoint",
        perspective,
      }),
    ).toThrow(ExploreCursorError);
  },
);
