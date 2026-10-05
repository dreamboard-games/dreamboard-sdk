import { describe, expect, test } from "vitest";
import { materializePluginGameplayFrame } from "./projection.js";
import type { MaterializePluginGameplayFrameInput } from "./projection.js";

function input(): MaterializePluginGameplayFrameInput {
  return {
    sessionId: "authority",
    version: 3,
    actionSetVersion: "actions-3",
    currentPhase: "play",
    activePlayers: ["alice"],
    perspectivePlayerId: "alice",
    dynamicProjection: {
      referenceBasis: { sessionId: "authority", version: 3 },
      seats: {
        alice: { events: [] },
        bob: {
          events: [
            {
              kind: "systemAction",
              procedureId: "private",
              title: "Bob secret",
            },
          ],
        },
      },
    },
  };
}

describe("trusted projection basis and event materialization", () => {
  test.each([
    { sessionId: "different", version: 3 },
    { sessionId: "authority", version: 4 },
  ])(
    "rejects relabeling a projection under another basis: %j",
    (referenceBasis) => {
      const value = input();
      expect(() =>
        materializePluginGameplayFrame({
          ...value,
          dynamicProjection: { ...value.dynamicProjection, referenceBasis },
        }),
      ).toThrow("Projection reference basis does not match");
    },
  );
  test("delivers only selected seat events", () => {
    expect(materializePluginGameplayFrame(input()).events).toEqual([]);
    expect(
      materializePluginGameplayFrame({ ...input(), perspectivePlayerId: "bob" })
        .events,
    ).toHaveLength(1);
    expect(
      materializePluginGameplayFrame({
        ...input(),
        perspectivePlayerId: "spectator",
      }).events,
    ).toEqual([]);
  });
});
