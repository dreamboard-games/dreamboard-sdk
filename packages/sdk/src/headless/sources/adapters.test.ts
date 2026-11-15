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
  GAMEPLAY_WIRE_PROTOCOL_VERSION,
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
  protocolVersion: GAMEPLAY_WIRE_PROTOCOL_VERSION,
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const snapshot = (version = 1) => {
  const expanded = frame(version);
  return {
    type: "session.snapshot",
    frame: {
      players: expanded.players,
      basis: expanded.basis,
      events: expanded.events,
      view: expanded.view,
      flow: expanded.flow,
      interactionsByRef: {},
      availableInteractionRefs: [],
      zones: {},
    },
  };
};
async function socketSource(auth: unknown = accepted) {
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
  socket.receive(auth);
  socket.receive(snapshot());
  return { source, socket };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  TestSocket.instances = [];
});
describe("iframe source", () => {
  it("lets a trusted host change seats and retires the previous seat's pending command", async () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const parent = {
      postMessage:
        vi.fn<(message: PluginToHostEnvelope, targetOrigin: string) => void>(),
    };
    vi.stubGlobal("window", Object.assign(target, { parent }));
    const source = iframeSource({ followHostSeat: true, timeoutMs: 100 });
    let sequence = 0;
    const receive = (payload: unknown) =>
      target.dispatchEvent(
        Object.assign(new Event("message"), {
          source: parent,
          origin: "https://host",
          data: {
            protocol: DREAMBOARD_PLUGIN_PROTOCOL,
            version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
            channelId: "channel",
            sequence: ++sequence,
            payload,
          },
        }),
      );
    receive({
      type: "runtime.init",
      session: {
        ...session,
        players: [...session.players, { playerId: "bob", displayName: "Bob" }],
      },
    });
    receive({ type: "gameplay.frame", frame: frame() });
    const firstSnapshot = source.store.get().snapshot;
    receive({ type: "gameplay.frame", frame: frame() });
    expect(source.store.get().snapshot).toBe(firstSnapshot);
    expect(parent.postMessage.mock.calls.at(-1)![0].payload).toEqual({
      type: "runtime.ack",
      sequence,
    });
    const pending = source.submit("move", {}).catch((error: unknown) => error);
    const oldCommand = parent.postMessage.mock.calls
      .map(([envelope]) => envelope.payload)
      .find((payload) => payload.type === "interaction.submit")!;
    receive({ type: "gameplay.frame", frame: frame(1, "bob") });
    expect(await pending).toEqual(new Error("Gameplay perspective changed."));
    expect(source.store.get()).toMatchObject({
      connection: "ready",
      request: null,
      snapshot: { me: "bob", version: 1 },
    });
    vi.advanceTimersByTime(200);
    expect(source.store.get().connection).toBe("ready");
    const next = source.cancel("move");
    const newCommand = parent.postMessage.mock.calls
      .map(([envelope]) => envelope.payload)
      .find((payload) => payload.type === "interaction.cancel")!;
    expect(newCommand.basis.perspectivePlayerId).toBe("bob");
    receive({
      type: "gameplay.frame",
      frame: frame(1, "bob"),
      acknowledgedClientActionId: oldCommand.clientActionId,
    });
    expect(source.store.get().request).not.toBeNull();
    receive({
      type: "interaction.result",
      clientActionId: newCommand.clientActionId,
      accepted: false,
      errorCode: "cancelled",
    });
    await expect(next).resolves.toEqual({
      accepted: false,
      errorCode: "cancelled",
    });
    receive({ type: "gameplay.frame", frame: frame(2, "unknown") });
    expect(source.store.get().connection).toBe("failed");
  });

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
    receive({ type: "gameplay.frame", frame: frame(2) });
    vi.advanceTimersByTime(100);
    expect(
      parent.postMessage.mock.calls.some(
        (call) => call[0].payload.type === "runtime.resume",
      ),
    ).toBe(true);
    receive({
      type: "gameplay.frame",
      frame: frame(2),
      acknowledgedClientActionId: command.clientActionId,
    });
    expect(await promise).toEqual({ accepted: true });
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
    expect(source.store.get().request).not.toBeNull();
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
    expect(source.store.get().request).not.toBeNull();
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

  it("uses real auth/resume and completes against an acknowledged snapshot", async () => {
    const { source, socket } = await socketSource();
    expect(socket.sent[0]).toEqual({
      type: "auth.connect",
      protocolVersion: GAMEPLAY_WIRE_PROTOCOL_VERSION,
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
      ...snapshot(2),
      acknowledgedClientActionId: command.clientActionId,
    });
    expect(await p).toEqual({ accepted: true });
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
    const recoveredSnapshot = source.store.get().snapshot;
    replacement.receive({
      ...snapshot(2),
      acknowledgedClientActionId: original.clientActionId,
    });
    await p;
    expect(source.store.get().snapshot).toBe(recoveredSnapshot);
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
  it.each(["user", "room-guest"] as const)(
    "refreshes %s credentials without replacing the snapshot and times out a missing refresh ACK",
    async (kind) => {
      vi.useFakeTimers();
      vi.stubGlobal("WebSocket", TestSocket);
      const getCredential = vi.fn(async () => ({
        kind,
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
    },
  );
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

it.each([undefined, 1, 3])(
  "rejects hosted protocol version %s before delivering a snapshot",
  async (protocolVersion) => {
    const { source, socket } = await socketSource({
      ...accepted,
      protocolVersion,
    });
    expect(source.store.get().connection).toBe("failed");
    expect(source.store.get().snapshot).toBeNull();
    expect(socket.sent).toHaveLength(1);
  },
);

it("rejects expanded legacy snapshots after a current-version handshake", async () => {
  const { source, socket } = await socketSource();
  const before = source.store.get().snapshot;
  socket.receive({ type: "session.snapshot", frame: frame(2) });
  expect(source.store.get().connection).toBe("failed");
  expect(source.store.get().snapshot).toBe(before);
});

it("hydrates compact descriptors before publishing and rejects malformed snapshots before acknowledgment", async () => {
  const { source, socket } = await socketSource();
  const descriptor = {
    kind: "action",
    phaseName: "play",
    interactionKey: "play.move",
    interactionId: "move",
    label: "Move",
    commit: { mode: "manual" },
    availability: { status: "available" },
    inputs: [],
  };
  const compact = {
    ...snapshot(2),
    frame: {
      ...snapshot(2).frame,
      interactionsByRef: { move: descriptor },
      availableInteractionRefs: ["move"],
      zones: {
        hand: {
          alice: {
            tiles: [],
            cardIds: ["card-1"],
            cardViewsById: {},
            cardBacksById: {},
            playableByCardId: { "card-1": ["move"] },
          },
        },
      },
    },
  };
  socket.receive(compact);
  const before = source.store.get().snapshot!;
  expect(before.frame.availableInteractions).toEqual([descriptor]);
  expect(before.frame.zones.hand.alice.playableByCardId["card-1"][0]).toBe(
    before.frame.availableInteractions[0],
  );
  const pending = source.submit("move", {}).catch((error: unknown) => error);
  const command = socket.sent.at(-1)!;
  if (command.type !== "interaction.submit")
    throw new Error("Expected submit command");
  socket.receive({
    ...compact,
    acknowledgedClientActionId: command.clientActionId,
    frame: { ...compact.frame, interactionsByRef: {} },
  });
  expect(await pending).toBeInstanceOf(Error);
  expect(source.store.get().connection).toBe("failed");
  expect(source.store.get().snapshot).toBe(before);
});

it.each([undefined, {}, { "assets/cards/spell.webp": new Blob(["front"]) }])(
  "iframe ingress rejects malformed complete card views with assets %j",
  (assets) => {
    for (const card of [
      { frontImage: "assets/cards/spell.webp" },
      JSON.stringify({ frontImage: "assets/cards/spell.webp" }),
      { id: "card-1", cardType: "spell", properties: {}, frontImage: 42 },
    ]) {
      const target = new EventTarget();
      const parent = { postMessage: vi.fn() };
      vi.stubGlobal("window", Object.assign(target, { parent }));
      const source = iframeSource();
      let sequence = 0;
      const receive = (payload: unknown) =>
        target.dispatchEvent(
          Object.assign(new Event("message"), {
            source: parent,
            origin: "https://host",
            data: {
              protocol: DREAMBOARD_PLUGIN_PROTOCOL,
              version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
              channelId: "channel",
              sequence: ++sequence,
              payload,
            },
          }),
        );
      receive({ type: "runtime.init", session: { ...session, assets } });
      receive({ type: "gameplay.frame", frame: frame() });
      const before = source.store.get().snapshot;
      parent.postMessage.mockClear();
      receive({
        type: "gameplay.frame",
        frame: {
          ...frame(2),
          zones: {
            hand: {
              alice: {
                tiles: [],
                cardIds: ["card-1"],
                cardViewsById: { "card-1": card },
                cardBacksById: {},
                playableByCardId: {},
              },
            },
          },
        },
      });
      expect(source.store.get().connection).toBe("failed");
      expect(source.store.get().snapshot).toBe(before);
      expect(parent.postMessage).toHaveBeenCalledOnce();
      expect(parent.postMessage.mock.calls[0][0]).toMatchObject({
        payload: { type: "runtime.error" },
      });
      source.dispose();
    }
  },
);
