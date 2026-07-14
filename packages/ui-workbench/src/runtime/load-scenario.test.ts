import { describe, expect, test } from "bun:test";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "@dreamboard-games/sdk/browser-interaction";
import {
  UI_SCENARIO_FIXTURE_PLUGIN_RUNTIME_PROTOCOL,
  digestUIFixtureJson,
  type UIScenarioFixture,
} from "@dreamboard-games/sdk/testing";
import {
  assertContractFingerprint,
  createUIScenarioRuntime,
} from "./load-scenario.js";

const interactionId = "play-card:player-1";
const actionSetVersion =
  "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const fixtureClockIso = "2026-01-02T03:04:05.000Z";

function makeFixture(): UIScenarioFixture {
  const frame = {
    basis: {
      generation: 0,
      version: 1,
      actionSetVersion,
      perspectivePlayerId: "player-1",
    },
    view: { hand: ["card-a"] },
    flow: {
      currentPhase: "play",
      currentStage: "main",
      activePlayers: ["player-1"],
      simultaneousPhase: null,
    },
    availableInteractions: [
      {
        phaseName: "play",
        interactionKey: "play-card",
        interactionId,
        label: "Play card",
        kind: "action",
        availability: { status: "available" },
        commit: { mode: "manual" },
        inputs: [],
      },
    ],
    zones: {},
    recentEvents: [],
  };
  const projectionDigest = digestUIFixtureJson({ frame });
  return {
    schemaVersion: 2,
    browserInteractionProtocol: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    pluginRuntimeProtocol: UI_SCENARIO_FIXTURE_PLUGIN_RUNTIME_PROTOCOL,
    id: "hearts.pass-three.mobile",
    title: "Pass three cards on mobile",
    gameId: "hearts",
    tags: ["touch"],
    source: {
      scenarioId: "pass-three",
      reducerFingerprint: "cfp1:test",
      uiContractFingerprint: digestUIFixtureJson("contract"),
      renderModule: "modules/hearts.pass-three.mobile.mjs",
      renderModuleDigest: digestUIFixtureJson("module"),
      sourceDigest: digestUIFixtureJson("source"),
    },
    viewer: { seatId: "south", playerId: "player-1" },
    environment: {
      clockIso: fixtureClockIso,
      randomSeed: "seed-one",
      locale: "en-US",
      timezone: "UTC",
      viewportTags: ["phone", "touch"],
    },
    protocol: {
      session: {
        sessionId: "session-1",
        players: [{ playerId: "player-1", displayName: "Player 1" }],
      },
      frames: [{ id: "initial", frame, projectionDigest }],
      steps: [
        { id: "initial.host-frame", kind: "host.frame", frameId: "initial" },
      ],
    },
    replay: [],
    expected: {
      initialProjectionDigest: projectionDigest,
      finalProjectionDigest: projectionDigest,
      finalSemanticDigest: digestUIFixtureJson("semantic"),
      submissionDigest: digestUIFixtureJson("submission"),
    },
  } as UIScenarioFixture;
}

async function runDeterministicRuntime(fixture: UIScenarioFixture) {
  const { harness, runtime } = createUIScenarioRuntime({ fixture });
  try {
    await harness.flush();
    harness.assertConsumed();
    return {
      frameId: harness.getCurrentFrameId(),
      events: harness.getEvents(),
    };
  } finally {
    runtime.disconnect();
  }
}

describe("load-scenario runtime guards", () => {
  test("contract fingerprint mismatch gives a regeneration instruction", () => {
    expect(() =>
      assertContractFingerprint("sha256:render", "sha256:fixture"),
    ).toThrow(/Regenerate the UI fixture bundle/);
  });

  test("runtime creation derives deterministic clock and ids from fixture environment", async () => {
    const fixture = makeFixture();

    const first = await runDeterministicRuntime(fixture);
    const second = await runDeterministicRuntime(fixture);

    expect(first).toEqual(second);
    expect(first.frameId).toBe("initial");
    expect(
      first.events.every((event) => event.atMs === Date.parse(fixtureClockIso)),
    ).toBe(true);
  });
});
