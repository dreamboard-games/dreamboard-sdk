import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { describe, expect, test } from "bun:test";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  type PluginGameplayFrame,
  type HostToPluginEnvelope,
  type PluginToHostEnvelope,
} from "@dreamboard-games/plugin-runtime-contract";
import { DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION } from "../../browser-interaction/index.js";
import { createPostMessagePluginTransport } from "../../runtime/browser/post-message-transport.js";
import {
  assertDeterministicUIScenarioFixture,
  assertUniqueReplayIdentity,
  compileUIScenarioFixture,
  createFixtureHostHarness,
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
import { createPluginRuntimeClient } from "../../runtime/index.js";

const interactionId = "play-card:player-1";
const BROWSER_HOST_ORIGIN = "https://host.dreamboard.test";

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

function cloneProtocol(protocol: PluginProtocolTape): PluginProtocolTape {
  return structuredClone(protocol) as PluginProtocolTape;
}

type TransportRuntimeExercise = {
  readonly sessionId: string | undefined;
  readonly initialGameVersion: number | undefined;
  readonly initialFrameId: string;
  readonly validationValid: boolean;
  readonly afterValidationFrameId: string;
  readonly submittedGameVersion: number | undefined;
  readonly submittedFrameId: string;
  readonly events: ReadonlyArray<
    Omit<
      ReturnType<
        ReturnType<typeof createFixtureHostHarness>["getEvents"]
      >[number],
      "sequence" | "atMs"
    >
  >;
};

async function settleFixtureHarness(
  harness: ReturnType<typeof createFixtureHostHarness>,
) {
  for (let index = 0; index < 5; index += 1) {
    await harness.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function eventTranscript(
  harness: ReturnType<typeof createFixtureHostHarness>,
): TransportRuntimeExercise["events"] {
  return harness
    .getEvents()
    .map(({ sequence: _sequence, atMs: _atMs, ...event }) => event);
}

async function exerciseRuntime(options: {
  readonly runtime: ReturnType<typeof createPluginRuntimeClient>;
  readonly harness: ReturnType<typeof createFixtureHostHarness>;
  readonly cleanup?: () => void;
}): Promise<TransportRuntimeExercise> {
  try {
    await settleFixtureHarness(options.harness);
    const sessionId = options.runtime.getSession()?.sessionId;
    const initialGameVersion = options.runtime.getFrame()?.gameVersion;
    const initialFrameId = options.harness.getCurrentFrameId();

    const validation = await options.runtime.validateInteraction(
      interactionId,
      {},
    );
    await settleFixtureHarness(options.harness);
    const afterValidationFrameId = options.harness.getCurrentFrameId();

    await options.runtime.submitInteraction(interactionId, {});
    await settleFixtureHarness(options.harness);
    const submittedFrameId = options.harness.getCurrentFrameId();
    const submittedGameVersion = options.runtime.getFrame()?.gameVersion;

    options.harness.assertConsumed();
    return {
      sessionId,
      initialGameVersion,
      initialFrameId,
      validationValid: validation.valid,
      afterValidationFrameId,
      submittedGameVersion,
      submittedFrameId,
      events: eventTranscript(options.harness),
    };
  } finally {
    options.runtime.disconnect();
    options.cleanup?.();
  }
}

async function exerciseFixtureTransport(
  protocol: PluginProtocolTape,
): Promise<TransportRuntimeExercise> {
  const harness = createFixtureHostHarness({ tape: protocol });
  const runtime = createPluginRuntimeClient({
    transport: harness.transport,
    idFactory: { nextId: (prefix) => `${prefix}-1` },
  });
  return exerciseRuntime({ runtime, harness });
}

async function exercisePostMessageTransport(
  protocol: PluginProtocolTape,
): Promise<TransportRuntimeExercise> {
  GlobalRegistrator.register({ url: "https://plugin.dreamboard.test" });
  const originalPostMessage = window.parent.postMessage.bind(window.parent);
  const harness = createFixtureHostHarness({ tape: protocol });
  const dispatchHostEnvelope = (message: HostToPluginEnvelope) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: message,
        origin: BROWSER_HOST_ORIGIN,
        source: window.parent,
      }),
    );
  };
  const stopHost = harness.transport.start(dispatchHostEnvelope);
  window.parent.postMessage = ((message: unknown, targetOrigin: string) => {
    expect(targetOrigin).toBe(BROWSER_HOST_ORIGIN);
    const envelope = message as PluginToHostEnvelope;
    expect(envelope.protocol).toBe(DREAMBOARD_PLUGIN_PROTOCOL);
    expect(envelope.version).toBe(DREAMBOARD_PLUGIN_PROTOCOL_VERSION);
    harness.transport.send(envelope.payload);
  }) as typeof window.postMessage;

  const runtime = createPluginRuntimeClient({
    transport: createPostMessagePluginTransport(),
    idFactory: { nextId: (prefix) => `${prefix}-1` },
  });
  return exerciseRuntime({
    runtime,
    harness,
    cleanup: () => {
      stopHost();
      window.parent.postMessage = originalPostMessage;
      GlobalRegistrator.unregister();
    },
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

  test("fixture host harness drives the real runtime client without frame advance on validation", async () => {
    const fixture = makeFixture();
    const harness = createFixtureHostHarness({ tape: fixture.protocol });
    const runtime = createPluginRuntimeClient({
      transport: harness.transport,
      idFactory: {
        nextId: (prefix) => `${prefix}-1`,
      },
    });

    await harness.flush();
    expect(runtime.getSession()?.sessionId).toBe("session-1");
    expect(harness.getCurrentFrameId()).toBe("initial");
    expect(runtime.getFrame()?.gameVersion).toBe(1);

    const validation = await runtime.validateInteraction(interactionId, {});
    expect(validation.valid).toBe(true);
    expect(harness.getCurrentFrameId()).toBe("initial");
    expect(runtime.getFrame()?.gameVersion).toBe(1);

    await runtime.submitInteraction(interactionId, {});
    await harness.flush();
    expect(harness.getCurrentFrameId()).toBe("submitted");
    expect(runtime.getFrame()?.gameVersion).toBe(2);
    harness.assertConsumed();
    runtime.disconnect();
  });

  test("fixture and postMessage transports replay the same protocol tape", async () => {
    const fixture = makeFixture();

    const fixtureTransport = await exerciseFixtureTransport(fixture.protocol);
    const postMessageTransport = await exercisePostMessageTransport(
      fixture.protocol,
    );

    expect(postMessageTransport).toEqual(fixtureTransport);
    expect(postMessageTransport.initialFrameId).toBe("initial");
    expect(postMessageTransport.afterValidationFrameId).toBe("initial");
    expect(postMessageTransport.submittedFrameId).toBe("submitted");
  });

  test("fixture host reports digest mismatches during flush", async () => {
    const protocol = makeProtocol();
    const harness = createFixtureHostHarness({ tape: protocol });
    const runtime = createPluginRuntimeClient({
      transport: harness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });

    await settleFixtureHarness(harness);
    const validation = runtime.validateInteraction(interactionId, {
      changed: true,
    });

    await expect(harness.flush()).rejects.toThrow(/digest mismatch/);
    runtime.disconnect();
    await validation;
  });

  test("fixture host reports wrong step kind and exhausted protocol tape", async () => {
    const protocolWithWrongStep = cloneProtocol(makeProtocol());
    protocolWithWrongStep.steps = [
      protocolWithWrongStep.steps[0]!,
      protocolWithWrongStep.steps[2]!,
    ];
    const wrongStepHarness = createFixtureHostHarness({
      tape: protocolWithWrongStep,
    });
    const wrongStepRuntime = createPluginRuntimeClient({
      transport: wrongStepHarness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });
    await settleFixtureHarness(wrongStepHarness);
    const wrongStepValidation = wrongStepRuntime.validateInteraction(
      interactionId,
      {},
    );

    await expect(wrongStepHarness.flush()).rejects.toThrow(
      /Expected protocol step 'client.submit' but received 'client.validate'/,
    );
    wrongStepRuntime.disconnect();
    await wrongStepValidation;

    const exhaustedProtocol = cloneProtocol(makeProtocol());
    exhaustedProtocol.steps = [exhaustedProtocol.steps[0]!];
    const exhaustedHarness = createFixtureHostHarness({
      tape: exhaustedProtocol,
    });
    const exhaustedRuntime = createPluginRuntimeClient({
      transport: exhaustedHarness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });
    await settleFixtureHarness(exhaustedHarness);
    const exhaustedValidation = exhaustedRuntime.validateInteraction(
      interactionId,
      {},
    );

    await expect(exhaustedHarness.flush()).rejects.toThrow(/no remaining step/);
    exhaustedRuntime.disconnect();
    await exhaustedValidation;
  });

  test("fixture host rejects stale frame basis", async () => {
    const protocol = cloneProtocol(makeProtocol());
    protocol.steps = protocol.steps.map((step) =>
      step.kind === "client.validate"
        ? { ...step, fromFrameId: "submitted" }
        : step,
    );
    const harness = createFixtureHostHarness({ tape: protocol });
    const runtime = createPluginRuntimeClient({
      transport: harness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });

    await settleFixtureHarness(harness);
    const validation = runtime.validateInteraction(interactionId, {});

    await expect(harness.flush()).rejects.toThrow(/current frame is 'initial'/);
    runtime.disconnect();
    await validation;
  });

  test("rejected validation and submit do not publish frames", async () => {
    const validationProtocol = cloneProtocol(makeProtocol());
    validationProtocol.steps = validationProtocol.steps.map((step) =>
      step.kind === "client.validate"
        ? {
            ...step,
            response: {
              valid: false,
              errorCode: "not-allowed",
              message: "Nope.",
            },
          }
        : step,
    );
    const validationHarness = createFixtureHostHarness({
      tape: validationProtocol,
    });
    const validationRuntime = createPluginRuntimeClient({
      transport: validationHarness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });

    await settleFixtureHarness(validationHarness);
    const validation = await validationRuntime.validateInteraction(
      interactionId,
      {},
    );
    await settleFixtureHarness(validationHarness);

    expect(validation).toEqual({
      valid: false,
      errorCode: "not-allowed",
      message: "Nope.",
    });
    expect(validationHarness.getCurrentFrameId()).toBe("initial");
    expect(validationRuntime.getFrame()?.gameVersion).toBe(1);
    validationRuntime.disconnect();

    const submitProtocol = cloneProtocol(makeProtocol());
    submitProtocol.steps = [
      submitProtocol.steps[0]!,
      {
        ...submitProtocol.steps[2]!,
        response: {
          accepted: false,
          errorCode: "not-allowed",
          message: "Nope.",
        },
      },
    ];
    const submitHarness = createFixtureHostHarness({ tape: submitProtocol });
    const submitRuntime = createPluginRuntimeClient({
      transport: submitHarness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });

    await settleFixtureHarness(submitHarness);
    await expect(
      submitRuntime.submitInteraction(interactionId, {}),
    ).rejects.toThrow("Nope.");
    await settleFixtureHarness(submitHarness);

    expect(submitHarness.getCurrentFrameId()).toBe("initial");
    expect(submitRuntime.getFrame()?.gameVersion).toBe(1);
    submitHarness.assertConsumed();
    submitRuntime.disconnect();
  });

  test("advanceHost delivers an independent host frame after initialization", async () => {
    const protocol = cloneProtocol(makeProtocol());
    protocol.steps = [protocol.steps[0]!, protocol.steps[3]!];
    const harness = createFixtureHostHarness({ tape: protocol });
    const runtime = createPluginRuntimeClient({
      transport: harness.transport,
      idFactory: { nextId: (prefix) => `${prefix}-1` },
    });

    await settleFixtureHarness(harness);
    expect(harness.getCurrentFrameId()).toBe("initial");
    expect(runtime.getFrame()?.gameVersion).toBe(1);

    await harness.advanceHost();
    await settleFixtureHarness(harness);

    expect(harness.getCurrentFrameId()).toBe("submitted");
    expect(runtime.getFrame()?.gameVersion).toBe(2);
    harness.assertConsumed();
    runtime.disconnect();
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
        browserInteractionProtocol: "2.0.0",
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
