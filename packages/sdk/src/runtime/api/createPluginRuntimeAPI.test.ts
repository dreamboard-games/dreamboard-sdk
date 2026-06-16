import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import { createPluginRuntimeAPI } from "./createPluginRuntimeAPI.js";

const CHANNEL_ID = "channel-id-0000000000000000000001";
const HOST_ORIGIN = "https://host.dreamboard.test";

type RuntimeGlobal = typeof globalThis & {
  __dreamboardPluginRuntimeApi?: unknown;
};

function snapshot(syncId: number): PluginStateSnapshot {
  return {
    view: { screen: "main" },
    gameplay: {
      currentPhase: "main",
      currentStage: null,
      activePlayers: ["player-1"],
      simultaneousPhase: null,
      availableInteractions: [],
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
  };
}

function envelope(payload: unknown, channelId = CHANNEL_ID) {
  return {
    protocol: "dreamboard-plugin",
    version: 2,
    channelId,
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

function lastMessage(
  messages: Array<{ message: unknown; targetOrigin: string }>,
) {
  const message = messages.at(-1);
  if (!message) throw new Error("Expected an outbound message.");
  return message;
}

describe("createPluginRuntimeAPI authenticated message protocol", () => {
  let outbound: Array<{ message: unknown; targetOrigin: string }>;
  let originalPostMessage: typeof window.postMessage;

  beforeEach(() => {
    GlobalRegistrator.register({ url: "https://plugin.dreamboard.test" });
    outbound = [];
    originalPostMessage = window.parent.postMessage.bind(window.parent);
    window.parent.postMessage = ((message: unknown, targetOrigin: string) => {
      outbound.push({ message, targetOrigin });
    }) as typeof window.postMessage;
    delete (globalThis as RuntimeGlobal).__dreamboardPluginRuntimeApi;
  });

  afterEach(() => {
    window.parent.postMessage = originalPostMessage;
    delete (globalThis as RuntimeGlobal).__dreamboardPluginRuntimeApi;
    GlobalRegistrator.unregister();
  });

  test("ignores state sync before an authenticated init envelope", () => {
    const runtime = createPluginRuntimeAPI();

    dispatchHostMessage(
      envelope({ type: "state-sync", syncId: 1, state: snapshot(1) }),
    );

    expect(runtime.getSnapshot()).toBeNull();
    expect(outbound).toHaveLength(0);
  });

  test("binds once from parent init and sends authenticated ready", () => {
    const runtime = createPluginRuntimeAPI();

    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );

    expect(runtime.getSessionState()).toMatchObject({
      status: "ready",
      sessionId: "session-1",
    });
    expect(lastMessage(outbound)).toEqual({
      targetOrigin: HOST_ORIGIN,
      message: envelope({ type: "ready" }),
    });
  });

  test("pins source, origin, and channel after initialization", () => {
    const runtime = createPluginRuntimeAPI();
    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );

    dispatchHostMessage(
      envelope({ type: "state-sync", syncId: 1, state: snapshot(1) }),
      "https://evil.example",
    );
    dispatchHostMessage(
      envelope(
        { type: "state-sync", syncId: 2, state: snapshot(2) },
        "wrong-channel-000000000000000000000",
      ),
    );

    expect(runtime.getSnapshot()).toBeNull();

    dispatchHostMessage(
      envelope({ type: "state-sync", syncId: 3, state: snapshot(3) }),
    );

    expect(runtime.getSnapshot()?.syncId).toBe(3);
  });

  test("outbound calls fail before init and use the bound envelope after init", async () => {
    const runtime = createPluginRuntimeAPI();

    await expect(
      runtime.submitInteraction("player-1", "act", {}),
    ).rejects.toThrow("Plugin runtime is not initialized");
    await expect(
      runtime.validateInteraction("player-1", "act", {}),
    ).resolves.toMatchObject({ errorCode: "runtime-not-initialized" });

    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );

    runtime.markNotificationRead?.("notification-1");

    expect(lastMessage(outbound)).toEqual({
      targetOrigin: HOST_ORIGIN,
      message: envelope({
        type: "mark-notification-read",
        notificationId: "notification-1",
      }),
    });
  });

  test("forged submit result cannot settle an in-flight submission", async () => {
    const runtime = createPluginRuntimeAPI();
    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );
    outbound = [];

    let settled = false;
    const submit = runtime
      .submitInteraction("player-1", "act", { ok: true })
      .then(() => {
        settled = true;
      });
    const sent = lastMessage(outbound).message as {
      payload: { messageId: string };
    };

    dispatchHostMessage(
      envelope(
        {
          type: "submit-result",
          messageId: sent.payload.messageId,
          accepted: true,
        },
        "wrong-channel-000000000000000000000",
      ),
    );
    await Promise.resolve();
    expect(settled).toBe(false);

    dispatchHostMessage(
      envelope({
        type: "submit-result",
        messageId: sent.payload.messageId,
        accepted: true,
      }),
    );

    await submit;
    expect(settled).toBe(true);
  });

  test("rejected state sync does not mutate current snapshot", () => {
    const runtime = createPluginRuntimeAPI();
    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );
    dispatchHostMessage(
      envelope({ type: "state-sync", syncId: 1, state: snapshot(1) }),
    );
    dispatchHostMessage(
      envelope({
        type: "state-sync",
        syncId: 2,
        state: { ...snapshot(2), extra: true },
      }),
    );

    expect(runtime.getSnapshot()?.syncId).toBe(1);
  });

  test("disconnect ignores late host messages", () => {
    const runtime = createPluginRuntimeAPI();
    dispatchHostMessage(
      envelope({
        type: "init",
        sessionId: "session-1",
        controllablePlayerIds: ["player-1"],
        controllingPlayerId: "player-1",
        userId: "user-1",
      }),
    );

    runtime.disconnect();
    dispatchHostMessage(
      envelope({ type: "state-sync", syncId: 1, state: snapshot(1) }),
    );

    expect(runtime.getSnapshot()).toBeNull();
  });
});
