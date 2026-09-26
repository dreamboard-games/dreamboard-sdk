import { afterEach, describe, expect, it, vi } from "vitest";
import { createSourceLifecycle } from "./lifecycle.js";
import { staticSource } from "./static.js";

import { session, frame } from "./__fixtures__/frames.js";
function setup() {
  const send = vi.fn();
  const recover = vi.fn();
  const close = vi.fn();
  const lifecycle = createSourceLifecycle({
    context: { sessionId: session.sessionId, playerId: "alice" },
    send,
    recover,
    close,
    timeoutMs: 100,
  });
  lifecycle.session(session);
  lifecycle.frame(frame());
  return { ...lifecycle, send, recover, close };
}
afterEach(() => vi.useRealTimers());
describe("source request lifecycle", () => {
  it("never converts malformed submit params to cancellation", async () => {
    const x = setup();
    await expect(
      Reflect.apply(x.source.submit, null, ["move", undefined]),
    ).rejects.toThrow();
    expect(x.send).not.toHaveBeenCalled();
    expect(x.source.store.get().request).toBeNull();
    x.source.dispose();
  });

  it.each([true, false])(
    "requires ACK and newer frame, frame first=%s",
    async (frameFirst) => {
      const x = setup();
      const promise = x.source.submit("move", { target: "a" });
      if (frameFirst) x.frame(frame(2));
      expect(x.source.store.get().request?.phase).toBe("awaiting-result");
      expect(Object.isFrozen(x.source.store.get())).toBe(true);
      expect(Object.isFrozen(x.source.store.get().request)).toBe(true);
      x.result({
        type: "interaction.result",
        clientActionId: x.send.mock.calls[0][0].clientActionId,
        accepted: true,
      });
      expect((await promise).accepted).toBe(true);
      if (!frameFirst) {
        expect(x.source.store.get().request?.phase).toBe("awaiting-frame");
        expect(Object.isFrozen(x.source.store.get().request)).toBe(true);
        x.frame(frame(1));
        expect(x.source.store.get().request).not.toBeNull();
        x.frame(frame(2));
      }
      expect(x.source.store.get().request).toBeNull();
      x.source.dispose();
    },
  );
  it("copies original command and retries exact ID/basis, rejecting concurrent intent", async () => {
    const x = setup();
    const params = { target: ["a"] };
    const p = x.source.submit("move", params);
    params.target.push("b");
    x.frame(frame(2));
    x.retry();
    expect(x.send.mock.calls[1][0]).toBe(x.send.mock.calls[0][0]);
    expect(x.send.mock.calls[0][0].params).toEqual({ target: ["a"] });
    expect(Object.isFrozen(x.send.mock.calls[0][0].basis)).toBe(true);
    await expect(x.source.cancel("move")).rejects.toThrow("already pending");
    x.result({
      type: "interaction.result",
      clientActionId: x.send.mock.calls[0][0].clientActionId,
      accepted: false,
      errorCode: "stale-basis",
    });
    expect((await p).accepted).toBe(false);
    x.retry();
    expect(x.send).toHaveBeenCalledTimes(2);
    x.source.dispose();
  });
  it("resumes a missing frame without replaying accepted intent, then closes on exhaustion", async () => {
    vi.useFakeTimers();
    const x = setup();
    const p = x.source.cancel("move");
    expect(x.send.mock.calls[0][0].type).toBe("interaction.cancel");
    x.result({
      type: "interaction.result",
      clientActionId: x.send.mock.calls[0][0].clientActionId,
      accepted: true,
    });
    await p;
    vi.advanceTimersByTime(100);
    expect(x.recover).toHaveBeenCalledOnce();
    expect(x.send).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(100);
    expect(x.source.store.get().connection).toBe("closed");
    expect(x.close).toHaveBeenCalledOnce();
  });
  it("disposal rejects unresolved promise and ignores obsolete ingress", async () => {
    const x = setup();
    const p = x.source.submit("move", null);
    x.source.dispose();
    await expect(p).rejects.toThrow("disposed");
    const state = x.source.store.get();
    x.frame(frame(9));
    x.session(session);
    expect(x.source.store.get()).toBe(state);
  });
  it("closes on changed session without replaying across context", async () => {
    const x = setup();
    const p = x.source.submit("move", null);
    x.session({ ...session, sessionId: "replacement" });
    await expect(p).rejects.toThrow("session changed");
    expect(x.close).toHaveBeenCalledOnce();
  });
  it("resolves delivered card images once and revokes them on close", () => {
    const x = createSourceLifecycle({
      send: vi.fn(),
      recover: vi.fn(),
      close: vi.fn(),
    });
    const front = new Blob(["front"], { type: "image/webp" });
    const card = {
      id: "card-1",
      cardType: "spell",
      frontImage: "assets/cards/spell.webp",
      backImage: "assets/cards/missing.webp",
      properties: {},
    };
    const assets = { "assets/cards/spell.webp": front };
    x.session({ ...session, assets });
    x.session({ ...session, assets });
    x.frame({
      ...frame(),
      zones: {
        hand: {
          cardIds: ["card-1"],
          cardViewsById: { "card-1": JSON.stringify(card) },
          playableByCardId: {},
        },
      },
    });
    const view = JSON.parse(
      x.source.store.get().snapshot!.frame.zones.hand!.cardViewsById["card-1"]!,
    );
    expect(view.frontImage).toMatch(/^blob:/);
    expect(view.backImage).toBe("assets/cards/missing.webp");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    x.source.dispose();
    expect(revoke).toHaveBeenCalledExactlyOnceWith(view.frontImage);
    revoke.mockRestore();
  });
  it("static source is immutable and connection updates reuse frame", () => {
    const original = frame();
    const source = staticSource({
      me: "alice",
      players: session.players,
      version: 1,
      frame: {
        events: [],
        view: original.view,
        flow: original.flow,
        availableInteractions: [],
        zones: {},
      },
    });
    expect(source.store.get().snapshot?.frame).not.toBe(original);
    expect(Object.isFrozen(source.store.get().snapshot?.frame?.view)).toBe(
      true,
    );
    const previous = source.store.get().snapshot?.frame;
    expect(Object.isFrozen(source.store.get())).toBe(true);
    source.dispose();
    expect(Object.isFrozen(source.store.get())).toBe(true);
    expect(source.store.get().snapshot?.frame).toBe(previous);
  });
});
