import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  type HostToPluginEnvelope,
} from "@dreamboard-games/plugin-runtime-contract";
import { createPostMessagePluginTransport } from "./post-message-transport.js";

const CHANNEL_ID = "channel-id";
const HOST_ORIGIN = "https://host.dreamboard.test";

function envelope(payload: HostToPluginEnvelope["payload"], sequence = 1) {
  return {
    protocol: DREAMBOARD_PLUGIN_PROTOCOL,
    version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
    channelId: CHANNEL_ID,
    sequence,
    payload,
  };
}

function dispatchHostMessage(data: unknown, origin = HOST_ORIGIN) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin,
      source: window.parent,
    }),
  );
}

describe("createPostMessagePluginTransport", () => {
  let outbound: Array<{ message: unknown; targetOrigin: string }>;
  let originalPostMessage: typeof window.postMessage;

  beforeEach(() => {
    GlobalRegistrator.register({ url: "https://plugin.dreamboard.test" });
    outbound = [];
    originalPostMessage = window.parent.postMessage.bind(window.parent);
    window.parent.postMessage = ((message: unknown, targetOrigin: string) => {
      outbound.push({ message, targetOrigin });
    }) as typeof window.postMessage;
  });

  afterEach(() => {
    window.parent.postMessage = originalPostMessage;
    GlobalRegistrator.unregister();
  });

  test("binds to the first runtime.init envelope and authenticates outbound envelopes", () => {
    const transport = createPostMessagePluginTransport();
    const received: HostToPluginEnvelope[] = [];
    const stop = transport.start((message) => {
      received.push(message);
    });

    dispatchHostMessage(
      envelope({
        type: "runtime.init",
        session: {
          sessionId: "session-1",
          players: [{ playerId: "player-1", displayName: "Player 1" }],
        },
      }),
    );

    expect(received).toHaveLength(1);
    transport.send({ type: "runtime.ready" });
    expect(outbound).toEqual([
      {
        targetOrigin: HOST_ORIGIN,
        message: {
          protocol: DREAMBOARD_PLUGIN_PROTOCOL,
          version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
          channelId: CHANNEL_ID,
          sequence: 1,
          payload: { type: "runtime.ready" },
        },
      },
    ]);
    stop();
  });

  test("ignores frames before initialization and channel mismatches after binding", () => {
    const invalid: string[] = [];
    const transport = createPostMessagePluginTransport({
      onInvalidMessage: (reason) => invalid.push(reason),
    });
    const received: HostToPluginEnvelope[] = [];
    const stop = transport.start((message) => {
      received.push(message);
    });

    dispatchHostMessage(
      envelope({
        type: "gameplay.frame",
        frame: {
          gameVersion: 1,
          actionSetVersion:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          perspectivePlayerId: "player-1",
          view: null,
          flow: {
            currentPhase: null,
            currentStage: null,
            activePlayers: [],
            simultaneousPhase: null,
          },
          availableInteractions: [],
          zones: {},
        },
      }),
    );
    expect(received).toHaveLength(0);

    dispatchHostMessage(
      envelope({
        type: "runtime.init",
        session: {
          sessionId: "session-1",
          players: [{ playerId: "player-1", displayName: "Player 1" }],
        },
      }),
    );
    dispatchHostMessage({
      ...envelope({
        type: "runtime.init",
        session: {
          sessionId: "session-2",
          players: [],
        },
      }),
      channelId: "other",
    });

    expect(received).toHaveLength(1);
    expect(invalid).toContain("channel-mismatch");
    stop();
  });

  test("reports post-init invalid envelopes with the bundled SDK version", () => {
    const invalid: string[] = [];
    const transport = createPostMessagePluginTransport({
      bundledSdkVersion: "sdk-test-version",
      onInvalidMessage: (reason) => invalid.push(reason),
    });
    const received: HostToPluginEnvelope[] = [];
    const stop = transport.start((message) => {
      received.push(message);
    });

    dispatchHostMessage(
      envelope({
        type: "runtime.init",
        session: {
          sessionId: "session-1",
          players: [{ playerId: "player-1", displayName: "Player 1" }],
        },
      }),
    );
    expect(received).toHaveLength(1);

    dispatchHostMessage({
      ...envelope({
        type: "gameplay.frame",
        frame: {
          gameVersion: 1,
          actionSetVersion: "test-action-set",
          perspectivePlayerId: "player-1",
          view: null,
          flow: {
            currentPhase: null,
            currentStage: null,
            activePlayers: [],
            simultaneousPhase: null,
          },
          availableInteractions: [],
          zones: {},
        },
      }),
      payload: {
        type: "gameplay.frame",
        frame: {
          gameVersion: 1,
          actionSetVersion: "test-action-set",
          perspectivePlayerId: "player-1",
          view: null,
          flow: {
            currentPhase: null,
            currentStage: null,
            activePlayers: [],
            simultaneousPhase: null,
          },
          availableInteractions: [],
          zones: {},
          unexpected: true,
        },
      },
    });

    expect(invalid).toContain("invalid-envelope");
    expect(outbound).toHaveLength(1);
    expect(outbound[0]?.targetOrigin).toBe(HOST_ORIGIN);
    expect(outbound[0]?.message).toMatchObject({
      protocol: DREAMBOARD_PLUGIN_PROTOCOL,
      version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
      channelId: CHANNEL_ID,
      sequence: 1,
      payload: {
        type: "runtime.error",
        code: "host-runtime-protocol-mismatch",
      },
    });
    expect(JSON.stringify(outbound[0]?.message)).toContain("sdk-test-version");
    stop();
  });
});
