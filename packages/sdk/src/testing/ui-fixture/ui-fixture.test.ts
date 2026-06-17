import { describe, expect, test } from "bun:test";
import {
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  type PluginGameplayFrame,
} from "@dreamboard-games/plugin-runtime-contract";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "../../browser-interaction/index.js";
import {
  assertDeterministicUIScenarioFixture,
  assertUniqueReplayIdentity,
  compileUIScenarioFixture,
  createFixtureRuntime,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIFixtureTransportRequest,
  digestUIScenarioFixture,
  parseUIScenarioFixture,
  parseUIScenarioFixtureBundleIndex,
  serializeUIScenarioFixture,
  type PluginProtocolTape,
  type UIScenarioFixture,
} from "./index.js";

const interactionId = "play-card:player-1";

function frame(gameVersion: number): PluginGameplayFrame {
  return {
    gameVersion,
    actionSetVersion: `sha256:${String(gameVersion).padStart(64, "0")}`,
    perspectivePlayerId: "player-1",
    view: { hand: ["card-a"], public: { trick: [] }, gameVersion },
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
        kind: "action",
        availability: { status: "available" },
        commit: { mode: "manual" },
        inputs: [],
      },
    ],
    zones: {},
  } as unknown as PluginGameplayFrame;
}

function requestDigest(
  operation: "validate" | "submit",
  sourceFrame: PluginGameplayFrame,
): string {
  return digestUIFixtureTransportRequest({
    operation,
    basis: {
      gameVersion: sourceFrame.gameVersion,
      actionSetVersion: sourceFrame.actionSetVersion,
      perspectivePlayerId: sourceFrame.perspectivePlayerId,
    },
    interactionId,
    payload: {},
  });
}

function makeProtocol(): PluginProtocolTape {
  const initialFrame = frame(1);
  const submittedFrame = frame(2);
  const firstDigest = digestUIFixtureJson({
    frame: "initial",
    projection: initialFrame,
  });
  const secondDigest = digestUIFixtureJson({
    frame: "submitted",
    projection: submittedFrame,
  });
  return {
    session: {
      sessionId: "session-1",
      players: [{ playerId: "player-1", displayName: "Player 1" }],
    },
    frames: [
      {
        id: "initial",
        frame: initialFrame,
        projectionDigest: firstDigest,
      },
      {
        id: "submitted",
        frame: submittedFrame,
        projectionDigest: secondDigest,
      },
    ],
    steps: [
      {
        id: "initial.host-frame",
        kind: "host.frame",
        frameId: "initial",
      },
      {
        id: "validate-pass-three",
        kind: "client.validate",
        fromFrameId: "initial",
        requestDigest: requestDigest("validate", initialFrame),
        response: { valid: true },
      },
      {
        id: "submit-pass-three",
        kind: "client.submit",
        fromFrameId: "initial",
        requestDigest: requestDigest("submit", initialFrame),
        response: { accepted: true },
      },
      {
        id: "submit-pass-three.host-frame",
        kind: "host.frame",
        frameId: "submitted",
      },
    ],
  };
}

function makeFixture(): UIScenarioFixture {
  const protocol = makeProtocol();
  const resolve = {
    surface: "dreamboard-gameplay",
    scopeId: "main",
    interactionKey: "play-card",
    interactionId,
    intent: "invoke",
  };
  const requestDigest = digestUIFixtureRequest(resolve);
  const finalFrame = protocol.frames[1]!;
  return compileUIScenarioFixture({
    id: "hearts.pass-three.mobile",
    title: "Pass three cards on mobile",
    gameId: "hearts",
    tags: ["touch", "private-hand"],
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
      clockIso: "2026-01-01T00:00:00.000Z",
      randomSeed: "hearts-pass-three-v1",
      locale: "en-US",
      timezone: "UTC",
      viewportTags: ["phone", "touch"],
    },
    protocol,
    replay: [
      {
        stepId: "commit-pass",
        requestDigest,
        resolve,
        execute: { kind: "activate" },
        expectedIdentity: {
          stepId: "commit-pass",
          surface: "dreamboard-gameplay",
          scopeId: "main",
          interactionKey: "play-card",
          interactionId,
          actuatorId: "commit",
        },
        expect: {
          frameId: "submitted",
          projectionDigest: finalFrame.projectionDigest,
          visibleInteractionKeys: ["play-card"],
        },
      },
    ],
  });
}

describe("UI scenario fixture contract", () => {
  test("parses and digests a strict portable fixture", () => {
    const fixture = makeFixture();
    const parsed = parseUIScenarioFixture(
      JSON.parse(serializeUIScenarioFixture(fixture)),
    );

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.pluginRuntimeProtocol).toBe(
      DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    );
    expect(parsed.protocol.steps.map((step) => step.kind)).toEqual([
      "host.frame",
      "client.validate",
      "client.submit",
      "host.frame",
    ]);
    expect(digestUIScenarioFixture(parsed)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  test("canonical fixture bytes are deterministic", () => {
    const first = makeFixture();
    const second = makeFixture();

    assertDeterministicUIScenarioFixture(first, second);
    expect(serializeUIScenarioFixture(first)).toBe(
      serializeUIScenarioFixture(second),
    );
  });

  test("fixture runtime does not advance frames after accepted validation", async () => {
    const harness = createFixtureRuntime({ fixture: makeFixture() });

    expect(harness.getCurrentFrameId()).toBe("initial");
    await harness.runtime.validateInteraction("player-1", interactionId, {});
    expect(harness.getCurrentFrameId()).toBe("initial");
    await harness.runtime.submitInteraction("player-1", interactionId, {});
    expect(harness.getCurrentFrameId()).toBe("submitted");
    harness.assertConsumed();
  });

  test("rejects unsupported fixture schema versions and unknown top-level fields", () => {
    const fixture = makeFixture() as unknown as Record<string, unknown>;

    expect(() =>
      parseUIScenarioFixture({ ...fixture, schemaVersion: 3 }),
    ).toThrow();
    expect(() =>
      parseUIScenarioFixture({ ...fixture, selector: ".play-card" }),
    ).toThrow();
  });

  test("rejects unsupported browser-interaction protocol major versions", () => {
    const fixture = makeFixture() as unknown as Record<string, unknown>;

    expect(() =>
      parseUIScenarioFixture({
        ...fixture,
        browserInteractionProtocol: "3.0.0",
      }),
    ).toThrow(/browserInteractionProtocol/);
  });

  test("rejects missing frame references and changed request digests", () => {
    const fixture = makeFixture();

    expect(() =>
      parseUIScenarioFixture({
        ...fixture,
        protocol: {
          ...fixture.protocol,
          steps: [
            {
              ...fixture.protocol.steps[0],
              frameId: "missing",
            },
          ],
        },
      }),
    ).toThrow(/missing frameId/);

    expect(() =>
      parseUIScenarioFixture({
        ...fixture,
        replay: [
          {
            ...fixture.replay[0],
            requestDigest: digestUIFixtureJson("changed"),
          },
        ],
      }),
    ).toThrow(/requestDigest/);
  });

  test("bundle index rejects duplicate fixture ids", () => {
    const fixture = makeFixture();
    const entry = {
      id: fixture.id,
      file: "hearts.pass-three.mobile.fixture.json",
      sha256: digestUIFixtureJson("fixture"),
      renderModule: fixture.source.renderModule,
      renderModuleSha256: fixture.source.renderModuleDigest,
      components: ["HandView"],
      capabilities: ["runtime-submit"],
    };

    expect(() =>
      parseUIScenarioFixtureBundleIndex({
        schemaVersion: 2,
        bundleId: "reference-games@test",
        sdkCommit: "test",
        pluginRuntimeProtocol: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
        browserInteractionProtocol:
          DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
        fixtures: [entry, entry],
      }),
    ).toThrow(/Duplicate fixture id/);
  });

  test("semantic replay identity must resolve uniquely and exactly", () => {
    const step = makeFixture().replay[0];
    if (!("expectedIdentity" in step)) {
      throw new Error("expected portable replay step");
    }
    const identity = step.expectedIdentity!;

    expect(assertUniqueReplayIdentity(step, [identity])).toEqual(identity);
    expect(() =>
      assertUniqueReplayIdentity(step, [identity, identity]),
    ).toThrow(/resolved 2 identities/);
    expect(() =>
      assertUniqueReplayIdentity(step, [
        { ...identity, actuatorId: "different" },
      ]),
    ).toThrow(/actuatorId/);
  });
});
