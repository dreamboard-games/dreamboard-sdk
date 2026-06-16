import { describe, expect, test } from "bun:test";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "../../browser-interaction/index.js";
import type { PluginStateSnapshot } from "../../runtime/index.js";
import {
  assertDeterministicUIScenarioFixture,
  assertUniqueReplayIdentity,
  compileUIScenarioFixture,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIScenarioFixture,
  parseUIScenarioFixture,
  parseUIScenarioFixtureBundleIndex,
  serializeUIScenarioFixture,
  type UIScenarioFixture,
} from "./index.js";

function snapshot(syncId: number): PluginStateSnapshot {
  return {
    view: { hand: ["card-a"], public: { trick: [] } },
    gameplay: {
      currentPhase: "play",
      currentStage: "main",
      activePlayers: ["player-1"],
      simultaneousPhase: null,
      availableInteractions: [
        {
          interactionKey: "play-card",
          interactionId: "play-card:player-1",
          kind: "action",
          availability: { status: "available" },
          inputs: [],
        },
      ],
      zones: {},
    },
    lobby: null,
    notifications: [],
    session: {
      sessionId: "session-1",
      controllablePlayerIds: ["player-1"],
      controllingPlayerId: "player-1",
      userId: "user-1",
    },
    history: null,
    syncId,
  } as unknown as PluginStateSnapshot;
}

function makeFixture(): UIScenarioFixture {
  const resolve = {
    surface: "dreamboard-gameplay",
    scopeId: "main",
    interactionKey: "play-card",
    interactionId: "play-card:player-1",
    intent: "invoke",
  };
  const firstDigest = digestUIFixtureJson({
    frame: "initial",
    snapshot: snapshot(1),
  });
  const secondDigest = digestUIFixtureJson({
    frame: "submitted",
    snapshot: snapshot(2),
  });
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
    frames: [
      {
        id: "initial",
        snapshot: snapshot(1),
        projectionDigest: firstDigest,
      },
      {
        id: "submitted",
        snapshot: snapshot(2),
        projectionDigest: secondDigest,
      },
    ],
    transport: [
      {
        id: "submit-pass-three",
        fromFrameId: "initial",
        operation: "submit",
        requestDigest: digestUIFixtureRequest(resolve),
        response: { kind: "accepted", nextFrameId: "submitted" },
      },
    ],
    replay: [
      {
        stepId: "commit-pass",
        requestDigest: digestUIFixtureRequest(resolve),
        resolve,
        execute: { kind: "activate" },
        expectedIdentity: {
          stepId: "commit-pass",
          surface: "dreamboard-gameplay",
          scopeId: "main",
          interactionKey: "play-card",
          interactionId: "play-card:player-1",
          actuatorId: "commit",
        },
        expect: {
          frameId: "submitted",
          projectionDigest: secondDigest,
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

    expect(parsed.id).toBe("hearts.pass-three.mobile");
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

  test("rejects unsupported fixture schema versions and unknown top-level fields", () => {
    const fixture = makeFixture() as unknown as Record<string, unknown>;

    expect(() =>
      parseUIScenarioFixture({ ...fixture, schemaVersion: 2 }),
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
        transport: [
          {
            ...fixture.transport[0],
            response: { kind: "accepted", nextFrameId: "missing" },
          },
        ],
      }),
    ).toThrow(/missing nextFrameId/);

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
        schemaVersion: 1,
        bundleId: "reference-games@test",
        sdkCommit: "test",
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
