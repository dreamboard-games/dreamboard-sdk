import { describe, expect, test } from "bun:test";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "../../browser-interaction/index.js";
import type { PluginStateSnapshot } from "../../runtime/index.js";
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
  type UIScenarioFixture,
} from "./index.js";

const interactionId = "play-card:player-1";

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
          interactionId,
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
    interactionId,
    intent: "invoke",
  };
  const requestDigest = digestUIFixtureRequest(resolve);
  const validateDigest = digestUIFixtureTransportRequest({
    operation: "validate",
    playerId: "player-1",
    interactionId,
    payload: {},
  });
  const submitDigest = digestUIFixtureTransportRequest({
    operation: "submit",
    playerId: "player-1",
    interactionId,
    payload: {},
  });
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
        id: "validate-pass-three",
        fromFrameId: "initial",
        operation: "validate",
        requestDigest: validateDigest,
        response: { kind: "accepted", nextFrameId: "initial" },
      },
      {
        id: "submit-pass-three",
        fromFrameId: "initial",
        operation: "submit",
        requestDigest: submitDigest,
        response: { kind: "accepted", nextFrameId: "submitted" },
      },
    ],
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

  test("fixture runtime validates and submits through strict ordered transport", async () => {
    const harness = createFixtureRuntime({
      fixture: makeFixture(),
      strict: true,
    });
    const states: number[] = [];
    const unsubscribe = harness.runtime.subscribeToState((state) => {
      states.push(state.syncId);
    });

    await expect(
      harness.runtime.validateInteraction("player-1", "play-card:player-1", {}),
    ).resolves.toEqual({ valid: true });
    await expect(
      harness.runtime.submitInteraction("player-1", "play-card:player-1", {}),
    ).resolves.toBeUndefined();

    unsubscribe();
    harness.assertConsumed();
    expect(harness.getCurrentFrameId()).toBe("submitted");
    expect(states).toEqual([1, 2]);
    expect(harness.getEvents().map((event) => event.kind)).toEqual([
      "frame",
      "validate",
      "frame",
      "submit",
      "frame",
    ]);
  });

  test("fixture runtime defers frame publication when latency is configured", async () => {
    const harness = createFixtureRuntime({
      fixture: makeFixture(),
      latencyMs: 20,
    });

    const validate = harness.runtime.validateInteraction(
      "player-1",
      interactionId,
      {},
    );

    expect(harness.getEvents().map((event) => event.kind)).toEqual([
      "frame",
      "validate",
    ]);
    await expect(validate).resolves.toEqual({ valid: true });
    expect(harness.getEvents().map((event) => event.kind)).toEqual([
      "frame",
      "validate",
      "frame",
    ]);
  });

  test("fixture runtime returns rejected validation diagnostics", async () => {
    const fixture = {
      ...makeFixture(),
      transport: [
        {
          id: "validate-pass-three",
          fromFrameId: "initial",
          operation: "validate" as const,
          requestDigest: digestUIFixtureTransportRequest({
            operation: "validate",
            playerId: "player-1",
            interactionId,
            payload: {},
          }),
          response: {
            kind: "rejected" as const,
            diagnostics: [
              {
                code: "fixture-invalid-selection",
                message: "Select exactly three cards.",
              },
            ],
          },
        },
      ],
    };
    const harness = createFixtureRuntime({ fixture });

    await expect(
      harness.runtime.validateInteraction("player-1", interactionId, {}),
    ).resolves.toEqual({
      valid: false,
      errorCode: "fixture-invalid-selection",
      message: "Select exactly three cards.",
    });
    harness.assertConsumed();
    expect(harness.getCurrentFrameId()).toBe("initial");
    expect(harness.getEvents().at(-1)?.result).toBe("rejected");
  });

  test("fixture runtime throws rejected submission diagnostics", async () => {
    const fixture = {
      ...makeFixture(),
      transport: [
        makeFixture().transport[0]!,
        {
          id: "submit-pass-three",
          fromFrameId: "initial",
          operation: "submit" as const,
          requestDigest: digestUIFixtureTransportRequest({
            operation: "submit",
            playerId: "player-1",
            interactionId,
            payload: {},
          }),
          response: {
            kind: "rejected" as const,
            diagnostics: [
              {
                code: "fixture-submit-rejected",
                message: "The authority rejected this submit.",
              },
            ],
          },
        },
      ],
    };
    const harness = createFixtureRuntime({ fixture });

    await harness.runtime.validateInteraction("player-1", interactionId, {});
    await expect(
      harness.runtime.submitInteraction("player-1", interactionId, {}),
    ).rejects.toThrow("The authority rejected this submit.");
    harness.assertConsumed();
    expect(harness.getCurrentFrameId()).toBe("initial");
    expect(harness.getEvents().at(-2)?.result).toBe("rejected");
  });

  test("fixture runtime fails closed for unexpected transport requests", async () => {
    const harness = createFixtureRuntime({ fixture: makeFixture() });

    await expect(
      harness.runtime.submitInteraction("player-1", interactionId, {}),
    ).rejects.toThrow(/operation/);
  });

  test("fixture runtime reports unconsumed transport exchanges", () => {
    const harness = createFixtureRuntime({ fixture: makeFixture() });

    expect(() => harness.assertConsumed()).toThrow(/consumed 0 of 2/);
  });
});
