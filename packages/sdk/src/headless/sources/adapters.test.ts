import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type PluginToHostEnvelope,
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "../../shared/protocol/protocol.js";
import { iframeSource } from "./iframe.js";
import { hostSource } from "./host-websocket.js";
import { frame, session } from "./__fixtures__/frames.js";

import {
  ClientGameplayFrameSchema,
  type ClientGameplayFrame,
} from "../../shared/protocol/gameplay-wire.js";

class TestSocket extends EventTarget {
  static OPEN = 1;
  static instances: TestSocket[] = [];
  readyState = 0;
  sent: ClientGameplayFrame[] = [];
  constructor(readonly url: string) {
    super();
    TestSocket.instances.push(this);
  }
  send(value: string) {
    this.sent.push(ClientGameplayFrameSchema.parse(JSON.parse(value)));
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }
  receive(value: unknown) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
  disconnect(code = 1006) {
    this.readyState = 3;
    this.dispatchEvent(Object.assign(new Event("close"), { code }));
  }
}
const accepted = {
  type: "auth.accepted",
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const snapshot = (version = 1) => ({
  type: "session.snapshot",
  frame: frame(version),
  history: { entries: [] },
  lifecycle: { status: "active" },
});
async function socketSource() {
  vi.stubGlobal("WebSocket", TestSocket);
  const source = hostSource({
    url: "wss://host/gameplay",
    session,
    playerId: "alice",
    getCredential: async () => ({ kind: "demo", secret: "fixture" }),
    timeoutMs: 100,
  });
  await Promise.resolve();
  const socket = TestSocket.instances.at(-1)!;
  socket.open();
  socket.receive(accepted);
  socket.receive(snapshot());
  return { source, socket };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  TestSocket.instances = [];
});
describe("iframe source", () => {
  it("closes and reports malformed pinned host ingress but ignores other channels", () => {
    const target = new EventTarget();
    const parent = {
      postMessage:
        vi.fn<(message: PluginToHostEnvelope, targetOrigin: string) => void>(),
    };
    vi.stubGlobal("window", Object.assign(target, { parent }));
    const source = iframeSource();
    const receive = (payload: unknown, channelId = "channel") =>
      target.dispatchEvent(
        Object.assign(new Event("message"), {
          source: parent,
          origin: "https://host",
          data: {
            protocol: DREAMBOARD_PLUGIN_PROTOCOL,
            version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
            channelId,
            sequence: 1,
            payload,
          },
        }),
      );
    receive({ type: "runtime.init", session });
    receive({ type: "gameplay.frame", frame: {} }, "unrelated");
    expect(source.store.get().connection).toBe("connecting");
    receive({ type: "gameplay.frame", frame: {} });
    expect(source.store.get().connection).toBe("failed");
    expect(parent.postMessage.mock.calls.at(-1)?.[0].payload.type).toBe(
      "runtime.error",
    );
  });

  it("pins sender/origin/channel, binds seat and requests missing frames", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const parent = {
      postMessage:
        vi.fn<(message: PluginToHostEnvelope, targetOrigin: string) => void>(),
    };
    vi.stubGlobal("window", Object.assign(target, { parent }));
    const source = iframeSource({ timeoutMs: 100 });
    let sequence = 0;
    const receive = (
      payload: unknown,
      origin = "https://host",
      sender: unknown = parent,
      channelId = "channel",
    ) => {
      target.dispatchEvent(
        Object.assign(new Event("message"), {
          source: sender,
          origin,
          data: {
            protocol: DREAMBOARD_PLUGIN_PROTOCOL,
            version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
            channelId,
            sequence: ++sequence,
            payload,
          },
        }),
      );
    };
    receive({ type: "runtime.init", session }, "https://attacker", {});
    expect(source.store.get().snapshot).toBeNull();
    receive({ type: "runtime.init", session });
    receive({ type: "gameplay.frame", frame: frame() });
    expect(source.store.get().snapshot?.me).toBe("alice");
    expect(source.store.get().snapshot?.frame).not.toHaveProperty("basis");
    receive({ type: "gameplay.frame", frame: frame(9) }, "https://attacker");
    expect(source.store.get().snapshot?.version).toBe(1);
    const promise = source.cancel("move");
    const command = parent.postMessage.mock.calls
      .map((call) => call[0].payload)
      .find((payload) => payload.type === "interaction.cancel");
    if (!command) throw new Error("Expected cancellation command");
    receive({
      type: "interaction.result",
      clientActionId: command.clientActionId,
      accepted: true,
    });
    expect(await promise).toEqual({ accepted: true });
    vi.advanceTimersByTime(100);
    expect(
      parent.postMessage.mock.calls.some(
        (call) => call[0].payload.type === "runtime.resume",
      ),
    ).toBe(true);
    receive({ type: "gameplay.frame", frame: frame(2) });
    expect(source.store.get().request).toBeNull();
    receive({ type: "gameplay.frame", frame: frame(3, "bob") });
    expect(source.store.get().connection).toBe("failed");
    const state = source.store.get();
    receive({ type: "gameplay.frame", frame: frame(4) });
    expect(source.store.get()).toBe(state);
  });
});
describe("websocket source", () => {
  it("recovers before the first snapshot and becomes ready when one arrives", async () => {
    vi.stubGlobal("WebSocket", TestSocket);
    const source = hostSource({
      url: "wss://host/gameplay",
      session,
      playerId: "alice",
      getCredential: async () => ({ kind: "demo", secret: "fixture" }),
    });
    expect(source.store.get()).toMatchObject({
      connection: "connecting",
      snapshot: null,
    });
    await Promise.resolve();
    TestSocket.instances.at(-1)!.disconnect();
    expect(source.store.get()).toEqual({
      connection: "recovering",
      snapshot: null,
      request: null,
      failure: null,
    });
    await Promise.resolve();
    const replacement = TestSocket.instances.at(-1)!;
    replacement.open();
    replacement.receive(accepted);
    replacement.receive(snapshot());
    expect(source.store.get().connection).toBe("ready");
    expect(source.store.get().snapshot?.version).toBe(1);
    source.dispose();
  });

  it("automatically retries the original intent after a newer frame without inferring a missing ACK", async () => {
    vi.useFakeTimers();
    const { source, socket } = await socketSource();
    const removeListener = vi.spyOn(socket, "removeEventListener");
    const settled = vi.fn();
    const params = { target: ["a"] };
    const result = source.submit("move", params).then(
      (value) => {
        settled();
        return value;
      },
      (error) => {
        settled();
        return error as Error;
      },
    );
    const original = structuredClone(socket.sent.at(-1));
    params.target.push("b");
    socket.receive(snapshot(2));
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    expect(source.store.get().request?.phase).toBe("awaiting-result");
    await vi.advanceTimersByTimeAsync(100);
    const commands = socket.sent.filter(
      (value) => value.type === "interaction.submit",
    );
    expect(commands).toEqual([original, original]);
    expect(commands[1].basis).toEqual(frame(1).basis);
    expect(commands[1].params).toEqual({ target: ["a"] });
    expect(
      socket.sent.filter((value) => value.type === "session.resume"),
    ).toHaveLength(2);
    expect(source.store.get().request?.phase).toBe("awaiting-result");
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toEqual(
      new Error("Gameplay source recovery timed out."),
    );
    expect(source.store.get().connection).toBe("failed");
    expect(source.store.get().request).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeListener.mock.calls.map(([type]) => type).sort()).toEqual([
      "close",
      "error",
      "message",
      "open",
    ]);
    const finalState = source.store.get();
    socket.receive(snapshot(99));
    expect(source.store.get()).toBe(finalState);
  });

  it("uses real auth/resume and strips host extras; ACK leaves frame barrier", async () => {
    const { source, socket } = await socketSource();
    expect(socket.sent[0]).toEqual({
      type: "auth.connect",
      credential: { kind: "demo", secret: "fixture" },
      sessionId: session.sessionId,
      playerId: "alice",
    });
    expect(socket.sent[1].type).toBe("session.resume");
    expect(source.store.get().connection).toBe("ready");
    const p = source.submit("move", { target: "a" });
    const command = socket.sent.at(-1)!;
    if (command.type !== "interaction.submit")
      throw new Error("Expected submit command");
    socket.receive({
      type: "interaction.result",
      clientActionId: command.clientActionId,
      accepted: true,
    });
    expect(await p).toEqual({ accepted: true });
    expect(source.store.get().request?.phase).toBe("awaiting-frame");
    socket.receive(snapshot(2));
    expect(source.store.get().request).toBeNull();
    source.dispose();
  });
  it("reconnects and sends only original pending intent; ignores obsolete socket events", async () => {
    const { source, socket } = await socketSource();
    const p = source.cancel("move");
    const original = socket.sent.at(-1);
    if (original?.type !== "interaction.cancel")
      throw new Error("Expected cancellation command");
    socket.disconnect();
    await Promise.resolve();
    const replacement = TestSocket.instances.at(-1)!;
    replacement.open();
    replacement.receive(accepted);
    expect(replacement.sent.at(-1)).toEqual(original);
    socket.receive(snapshot(99));
    expect(source.store.get().snapshot?.version).toBe(1);
    replacement.receive(snapshot(2));
    replacement.receive({
      type: "interaction.result",
      clientActionId: original.clientActionId,
      accepted: true,
    });
    await p;
    expect(source.store.get().request).toBeNull();
    source.dispose();
  });
  it("ignores host-only frames but closes on malformed recognized frame", async () => {
    const { source, socket } = await socketSource();
    socket.receive({ type: "gameplay.logs", entries: [] });
    expect(source.store.get().connection).toBe("ready");
    socket.receive({ type: "session.snapshot", frame: {} });
    expect(source.store.get().connection).toBe("failed");
  });
  it("disposal during credential acquisition cannot create a late socket", async () => {
    vi.stubGlobal("WebSocket", TestSocket);
    let resolve!: (value: { kind: "demo"; secret: string }) => void;
    const source = hostSource({
      url: "wss://host/gameplay",
      session,
      playerId: "alice",
      getCredential: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    source.dispose();
    resolve({ kind: "demo", secret: "fixture" });
    await Promise.resolve();
    expect(TestSocket.instances).toHaveLength(0);
  });
});

describe("socket recovery deadlines", () => {
  it("fails explicitly when authentication never arrives and removes socket listeners", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestSocket);
    const source = hostSource({
      url: "wss://host/gameplay",
      session,
      playerId: "alice",
      getCredential: async () => ({ kind: "demo", secret: "fixture" }),
      timeoutMs: 100,
    });
    await Promise.resolve();
    const socket = TestSocket.instances.at(-1)!;
    socket.open();
    vi.advanceTimersByTime(100);
    expect(source.store.get().connection).toBe("failed");
    socket.receive(accepted);
    socket.receive(snapshot());
    expect(source.store.get().snapshot).toBeNull();
  });
  it("bounds initial snapshot wait after successful authentication", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestSocket);
    const source = hostSource({
      url: "wss://host/gameplay",
      session,
      playerId: "alice",
      getCredential: async () => ({ kind: "demo", secret: "fixture" }),
      timeoutMs: 100,
    });
    await Promise.resolve();
    const socket = TestSocket.instances.at(-1)!;
    socket.open();
    socket.receive(accepted);
    vi.advanceTimersByTime(100);
    expect(source.store.get().connection).toBe("failed");
  });
  it("refreshes credentials without replacing the snapshot and times out a missing refresh ACK", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", TestSocket);
    const getCredential = vi.fn(async () => ({
      kind: "user" as const,
      token: "fixture",
    }));
    const source = hostSource({
      url: "wss://host/gameplay",
      session,
      playerId: "alice",
      getCredential,
      timeoutMs: 100,
    });
    await Promise.resolve();
    const socket = TestSocket.instances.at(-1)!;
    socket.open();
    socket.receive({
      ...accepted,
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });
    socket.receive(snapshot());
    const before = source.store.get().snapshot;
    await vi.advanceTimersByTimeAsync(800);
    expect(socket.sent.at(-1)?.type).toBe("auth.refresh");
    expect(getCredential).toHaveBeenCalledTimes(2);
    socket.receive(snapshot(2));
    await vi.advanceTimersByTimeAsync(100);
    expect(source.store.get().connection).toBe("failed");
    expect(before?.version).toBe(1);
  });
});

it("preserves a startup credential failure before any snapshot or request", async () => {
  const failure = new Error("Credential unavailable.");
  const source = hostSource({
    url: "wss://host/gameplay",
    session,
    playerId: "alice",
    getCredential: async () => {
      throw failure;
    },
  });
  await Promise.resolve();
  expect(source.store.get()).toMatchObject({
    connection: "failed",
    snapshot: null,
    request: null,
    failure,
  });
  expect(source.store.get().failure).toBe(failure);
});
