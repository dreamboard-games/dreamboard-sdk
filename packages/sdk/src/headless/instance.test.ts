import { createStore } from "@tanstack/store";
import type { SourceState } from "./sources/types.js";
import { describe, expect, it, vi } from "vitest";
import { createGameInstance, AmbiguousTargetError } from "./instance.js";
import { createSourceLifecycle } from "./sources/lifecycle.js";
import { frame, session } from "./sources/__fixtures__/frames.js";
import type {
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginGameplayFrame,
} from "../shared/protocol/frame.js";
import type { InstanceOptions } from "./model.js";
const choice = (
  key = "choice",
  values: readonly (string | null)[] = ["a", "b"],
): InteractionInputDescriptor => ({
  key,
  kind: "form",
  domain: {
    type: "choice",
    choices: values.map((value) => ({ value, label: String(value) })),
  },
});
function action(
  inputs: readonly InteractionInputDescriptor[] = [choice()],
  extra: Partial<InteractionDescriptor> = {},
): InteractionDescriptor {
  return {
    kind: "action",
    phaseName: "play",
    interactionKey: "play.move",
    interactionId: "move",
    label: "Move",
    commit: { mode: "manual" },
    inputs,
    availability: { status: "available" },
    ...extra,
  };
}
function setup(descriptors: readonly InteractionDescriptor[] = [action()]) {
  const send = vi.fn();
  const lifecycle = createSourceLifecycle({
    context: { sessionId: session.sessionId, playerId: "alice" },
    send,
    recover: vi.fn(),
    close: vi.fn(),
    timeoutMs: 100000,
  });
  lifecycle.session(session);
  const emit = (
    version: number,
    interactions = descriptors,
    changes: Partial<PluginGameplayFrame> = {},
  ) =>
    lifecycle.frame({
      ...frame(version),
      availableInteractions: interactions,
      ...changes,
    });
  emit(1);
  const ack = (accepted = true) =>
    lifecycle.result({
      type: "interaction.result",
      clientActionId: send.mock.lastCall![0].clientActionId,
      accepted,
      ...(accepted ? {} : { errorCode: "RULE_REJECT" }),
    });
  return { ...lifecycle, send, emit, ack };
}
describe("headless instance", () => {
  it.each([true, false])(
    "clears only after both ACK and frame, frame first=%s",
    async (frameFirst) => {
      const x = setup();
      const game = createGameInstance()({ source: x.source });
      const interaction = game.interactions.get("play.move")!;
      interaction.getInput("choice")!.setValue("a");
      const submit = interaction.submit();
      expect(x.send.mock.lastCall![0].params).toEqual({ choice: "a" });
      if (frameFirst) x.emit(2);
      expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
      x.ack();
      await submit;
      if (!frameFirst) {
        expect(game.interactions.get("play.move")!.getStatus()).toBe(
          "submitted",
        );
        expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
        x.emit(2);
      }
      expect(game.state.drafts["play.move"]).toBeUndefined();
      game.dispose();
    },
  );
  it("preserves controlled newer edits, including edit-away-and-back identity", async () => {
    const x = setup();
    const first = { choice: "a" };
    let options: InstanceOptions<unknown, typeof x.source> = {
      source: x.source,
      state: { drafts: { "play.move": first } },
      onDraftsChange: vi.fn(),
    };
    const game = createGameInstance()(options);
    const promise = game.interactions.get("play.move")!.submit();
    options = {
      ...options,
      state: { drafts: { "play.move": { choice: "b" } } },
    };
    game.setOptions(options);
    options = { ...options, state: { drafts: { "play.move": first } } };
    game.setOptions(options);
    x.ack();
    await promise;
    x.emit(2);
    expect(game.state.drafts["play.move"]).toEqual(first);
    expect(options.onDraftsChange).not.toHaveBeenCalled();
    game.dispose();
  });
  it("controlled writes notify current options without competing local state", () => {
    const x = setup();
    const old = vi.fn(),
      next = vi.fn();
    const game = createGameInstance()({
      source: x.source,
      state: { drafts: {} },
      onDraftsChange: old,
    });
    const input = game.interactions.get("play.move")!.getInput("choice")!;
    game.setOptions({
      source: x.source,
      state: { drafts: {} },
      onDraftsChange: next,
    });
    input.setValue("a");
    expect(old).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith({ "play.move": { choice: "a" } });
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
  it("retains valid rejection drafts and removes only newly invalid local fields", async () => {
    const x = setup([action([choice("first"), choice("second")])]);
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.getInput("first")!.setValue("a");
    game.interactions.get("play.move")!.getInput("second")!.setValue("b");
    const promise = game.interactions.get("play.move")!.submit();
    x.ack(false);
    expect(await promise).toEqual({
      accepted: false,
      errorCode: "RULE_REJECT",
    });
    expect(game.state.drafts["play.move"]).toEqual({ first: "a", second: "b" });
    x.emit(2, [action([choice("first", ["a"]), choice("second", ["a"])])]);
    expect(game.state.drafts["play.move"]).toEqual({ first: "a" });
    game.dispose();
  });
  it("keeps defaults as suggestions, submits only current step, separates reset/cancel", async () => {
    const first = action([{ ...choice("first"), defaultValue: "a" }], {
      commit: { mode: "autoWhenReady" },
      step: { index: 0, total: 2, selected: {}, canCancel: false },
    });
    const x = setup([first]);
    const game = createGameInstance()({ source: x.source });
    expect(x.send).not.toHaveBeenCalled();
    game.interactions
      .get("play.move")!
      .getInput("first")!
      .getSelectHandler("b")();
    expect(x.send.mock.lastCall![0].params).toEqual({ first: "b" });
    x.ack();
    await Promise.resolve();
    const next = action([choice("second", [null])], {
      availability: { status: "blocked", reason: "No targets" },
      step: { index: 1, total: 2, selected: { first: "b" }, canCancel: true },
    });
    x.emit(2, [next]);
    await vi.waitFor(() =>
      expect(game.state.drafts["play.move"]).toBeUndefined(),
    );
    game.interactions.get("play.move")!.reset();
    expect(x.send).toHaveBeenCalledTimes(1);
    expect(game.interactions.get("play.move")!.getStep()?.selected).toEqual({
      first: "b",
    });
    const cancellation = game.interactions.get("play.move")!.cancel();
    expect(x.send.mock.lastCall![0].type).toBe("interaction.cancel");
    x.ack();
    await cancellation;
    x.emit(3, [first]);
    game.dispose();
  });
  it("keeps stable branches for connection updates and old captured values", () => {
    const x = setup();
    const game = createGameInstance()({ source: x.source });
    const old = game.getSnapshot();
    const oldInput = game.interactions.get("play.move")!.getInput("choice")!;
    oldInput.setValue("a");
    const chosen = game.interactions.get("play.move")!.getInput("choice")!;
    expect(oldInput.getValue()).toBeUndefined();
    expect(chosen.getValue()).toBe("a");
    x.recovering();
    expect(game.getSnapshot()).not.toBe(old);
    expect(game.players).toBe(old.players);
    expect(game.view).toBe(old.view);
    expect(chosen.game).toBe(game);
    expect(Object.getPrototypeOf(chosen)).toBe(Object.getPrototypeOf(oldInput));
    game.dispose();
  });
  it("requires explicit routing for ambiguous cards and keeps private card views absent", () => {
    const target: InteractionInputDescriptor = {
      key: "card",
      kind: "card",
      domain: {
        type: "cardTarget",
        projection: "resolved",
        eligibleTargets: ["ace"],
      },
    };
    const x = setup([
      action([target]),
      action([target], {
        interactionKey: "play.other",
        interactionId: "other",
      }),
    ]);
    x.emit(2, undefined, {
      zones: {
        hand: {
          cardIds: ["ace", "hidden"],
          cardViewsById: { ace: JSON.stringify({ rank: "A" }) },
          playableByCardId: {
            ace: [
              action([target]),
              action([target], {
                interactionKey: "play.other",
                interactionId: "other",
              }),
            ],
          },
        },
      },
    });
    const game = createGameInstance()({ source: x.source });
    expect(game.cards.get("hidden")!.view).toBeNull();
    expect(() => game.cards.get("ace")!.select()).toThrow(AmbiguousTargetError);
    game.cards.get("ace")!.select({ interaction: "play.other" });
    expect(game.state.drafts["play.other"]).toEqual({ card: "ace" });
    game.dispose();
  });
  it("source replacement isolates stale responses and captured handlers", async () => {
    const first = setup(),
      second = setup();
    const game = createGameInstance()({ source: first.source });
    game.interactions.get("play.move")!.getInput("choice")!.setValue("a");
    const pending = game.interactions.get("play.move")!.submit();
    const rejected = expect(pending).rejects.toThrow("disposed");
    game.setOptions({ source: second.source });
    await rejected;
    first.emit(5);
    expect(game.version).toBe(1);
    expect(game.state.drafts).toEqual({});
    game.dispose();
    expect(second.source.store.get().connection).toBe("closed");
  });
  it("feature hooks are additive on prototypes and collisions fail", () => {
    const x = setup();
    const game = createGameInstance()({
      source: x.source,
      features: () => ({
        sample: {
          root: { answer: 42 },
          input: {
            extra() {
              return "yes";
            },
          },
        },
      }),
    });
    expect(game.answer).toBe(42);
    const input = game.interactions.get("play.move")!.getInput("choice")!;
    expect(input.extra()).toBe("yes");
    expect(Object.hasOwn(input, "extra")).toBe(false);
    expect(() =>
      createGameInstance()({
        source: x.source,
        features: () => ({
          a: { input: { extra: 1 } },
          b: { input: { extra: 2 } },
        }),
      }),
    ).toThrow("Overlapping");
    game.dispose();
  });
});

describe("instance boundaries", () => {
  it("failed frame recovery after accepted ACK preserves the submitted draft", async () => {
    const x = setup();
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.getInput("choice")!.setValue("a");
    const submitted = game.interactions.get("play.move")!.submit();
    x.ack();
    await submitted;
    x.fail(new Error("Recovery exhausted"));
    expect(game.connection).toBe("closed");
    expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
    game.dispose();
  });
  it("all controls are disabled during another interaction request", async () => {
    const x = setup([
      action(),
      action([choice()], {
        interactionId: "other",
        interactionKey: "play.other",
      }),
    ]);
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.getInput("choice")!.setValue("a");
    const promise = game.interactions.get("play.move")!.submit();
    const other = game.interactions.get("play.other")!;
    expect(other.getInput("choice")!.getTargetProps("a").disabled).toBe(true);
    expect(other.getSubmitProps().disabled).toBe(true);
    other.getInput("choice")!.setValue("b");
    expect(game.state.drafts["play.other"]).toBeUndefined();
    x.ack(false);
    await promise;
    game.dispose();
  });
  it("phase changes clear stale active interaction and keep snapshots deeply readonly", () => {
    const x = setup();
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.activate();
    game.interactions.get("play.move")!.getInput("choice")!.setValue("a");
    const old = game.getSnapshot();
    for (const object of [
      old,
      old.phase,
      old.turn,
      old.me,
      old.me!.player,
      old.players,
      old.state,
      old.state.drafts,
    ])
      expect(Object.isFrozen(object)).toBe(true);
    x.emit(2, [], { flow: { ...frame().flow, currentPhase: "done" } });
    expect(game.state.activeInteraction).toBeNull();
    expect(game.state.drafts).toEqual({});
    expect(old.phase.current).toBe("play");
    expect(old.state.drafts["play.move"]).toEqual({ choice: "a" });
    game.dispose();
  });
  it("declared coverage doesn't disguise unread available interactions; development warns once", async () => {
    const x = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const game = createGameInstance()({
      source: x.source,
      coverage: { "play.move": () => null },
      debug: true,
    });
    expect(() => game.assertCoverage()).toThrow("play.move");
    await Promise.resolve();
    expect(warn).toHaveBeenCalledTimes(1);
    x.emit(2);
    await Promise.resolve();
    expect(warn).toHaveBeenCalledTimes(1);
    game.interactions.get("play.move");
    expect(() => game.assertCoverage()).not.toThrow();
    game.dispose();
    warn.mockRestore();
  });
  it("feature roots capture immutable branches on initial build and explicit invalidation", () => {
    const x = setup();
    let invalidate = () => {};
    let branch = Object.freeze({ x: 1 });
    const game = createGameInstance()({
      source: x.source,
      features: (core, context) => {
        invalidate = context.invalidate;
        return {
          sample: {
            root: {
              get pointer() {
                expect(core.version).toBeGreaterThanOrEqual(1);
                return branch;
              },
            },
          },
        };
      },
    });
    const old = game.getSnapshot();
    expect(old.pointer.x).toBe(1);
    x.recovering();
    expect(game.getSnapshot().pointer).toBe(old.pointer);
    branch = Object.freeze({ x: 2 });
    invalidate();
    expect(game.getSnapshot().pointer.x).toBe(2);
    expect(old.pointer.x).toBe(1);
    game.dispose();
  });
  it("partial many drafts retain eligible members without becoming ready", () => {
    const target: InteractionInputDescriptor = {
      key: "cards",
      kind: "card",
      domain: {
        type: "cardTarget",
        projection: "resolved",
        eligibleTargets: ["a", "b", "c"],
        selection: { mode: "many", min: 2, max: 3, distinct: true },
      },
    };
    const x = setup([action([target])]);
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.getInput("cards")!.setValue(["a"]);
    x.emit(2);
    expect(game.state.drafts["play.move"]).toEqual({ cards: ["a"] });
    expect(game.interactions.get("play.move")!.getIsReady()).toBe(false);
    game.dispose();
  });
  it("numeric and resource drafts use the canonical domain bounds", () => {
    const bounded: InteractionInputDescriptor = {
      key: "count",
      kind: "form",
      domain: { type: "boundedNumber", min: 0, max: 5, step: 1 },
    };
    const resources: InteractionInputDescriptor = {
      key: "supplies",
      kind: "form",
      domain: {
        type: "resourceMap",
        resources: [{ resourceId: "wood", min: 0, max: 5 }],
      },
    };
    const x = setup([action([bounded, resources])]);
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move")!.getInput("count")!.setValue(4);
    game.interactions
      .get("play.move")!
      .getInput("supplies")!
      .setValue({ wood: 2 });
    x.emit(2, [
      action([
        { ...bounded, domain: { ...bounded.domain, max: 3 } },
        resources,
      ]),
    ]);
    expect(game.state.drafts["play.move"]).toEqual({ supplies: { wood: 2 } });
    game.dispose();
  });
});

it("many draft reconciliation retains valid members and enforces a lowered maximum without submitting", () => {
  const input: InteractionInputDescriptor = {
    key: "cards",
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["a", "b", "c"],
      selection: { mode: "many", min: 1, max: 3 },
    },
  };
  const x = setup([action([input], { commit: { mode: "autoWhenReady" } })]);
  const game = createGameInstance()({ source: x.source });
  game.interactions
    .get("play.move")!
    .getInput("cards")!
    .setValue(["a", "b", "c"]);
  x.emit(2, [
    action(
      [
        {
          ...input,
          domain: {
            ...input.domain,
            eligibleTargets: ["a", "c"],
            selection: { mode: "many", min: 1, max: 1 },
          },
        },
      ],
      { commit: { mode: "autoWhenReady" } },
    ),
  ]);
  expect(game.state.drafts["play.move"]).toEqual({ cards: ["a"] });
  expect(x.send).not.toHaveBeenCalled();
  game.dispose();
});

it("per-card descriptor identity resolves against the latest frame and drop writes atomically", () => {
  const cardInput: InteractionInputDescriptor = {
    key: "card",
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["ace"],
    },
  };
  const boardInput: InteractionInputDescriptor = {
    key: "space",
    kind: "board-space",
    domain: {
      type: "boardTarget",
      projection: "resolved",
      targetKind: "space",
      boardId: "main",
      eligibleTargets: ["0,0"],
    },
  };
  const route = action([cardInput, boardInput], {
    commit: { mode: "autoWhenReady" },
  });
  const blocked = {
    ...route,
    availability: { status: "blocked" as const, reason: "Choose card" },
  };
  const x = setup([blocked]);
  x.emit(2, [blocked], {
    zones: {
      hand: {
        cardIds: ["ace"],
        cardViewsById: { ace: JSON.stringify({ rank: "A" }) },
        playableByCardId: { ace: [route] },
      },
    },
  });
  let drop: (() => void) | undefined;
  const game = createGameInstance()({
    source: x.source,
    features: (_core, context) => {
      drop = () =>
        context.routeCardDrop("ace", {
          kind: "space",
          id: "0,0",
          boardId: "main",
        });
      return {};
    },
  });
  drop!();
  expect(x.send.mock.lastCall![0].params).toEqual({
    card: "ace",
    space: "0,0",
  });
  expect(x.send).toHaveBeenCalledTimes(1);
  game.dispose();
});

it("input and interaction readiness reject duplicate and oversized programmatic many values", () => {
  const input: InteractionInputDescriptor = {
    key: "cards",
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["a", "b", "c"],
      selection: { mode: "many", min: 1, max: 2, distinct: true },
    },
  };
  const x = setup([action([input])]);
  const game = createGameInstance()({ source: x.source });
  for (const values of [
    ["a", "a"],
    ["a", "b", "c"],
  ]) {
    game.interactions.get("play.move")!.getInput("cards")!.setValue(values);
    const current = game.interactions.get("play.move")!;
    expect(current.getInput("cards")!.getIsReady()).toBe(false);
    expect(current.getIsReady()).toBe(false);
    expect(current.getSubmitProps()["data-disabled"]).toBe(
      current.getSubmitProps().disabled,
    );
  }
  game.dispose();
});

it("same-source seat changes invalidate controlled drafts and old handlers", () => {
  const { basis: _basis, ...seatFrame } = frame();
  expect(_basis).toBeDefined();
  const store = createStore<SourceState>({
    snapshot: {
      me: "alice",
      players: [...session.players, { playerId: "bob", displayName: "Bob" }],
      frame: { ...seatFrame, availableInteractions: [action()] },
      version: 1,
    },
    connection: "ready",
    request: null,
  });
  const source = {
    store,
    dispose: vi.fn(),
    submit: async () => ({ accepted: true as const }),
    cancel: async () => ({ accepted: true as const }),
  };
  const drafts = { "play.move": { choice: "a" } };
  const onDraftsChange = vi.fn();
  const game = createGameInstance()({
    source,
    state: { drafts, activeInteraction: "play.move" },
    onDraftsChange,
  });
  const oldInput = game.interactions.get("play.move")!.getInput("choice")!;
  store.setState((current) => ({
    ...current,
    snapshot: { ...current.snapshot!, me: "bob", version: 2 },
  }));
  expect(game.me!.id).toBe("bob");
  expect(game.state.drafts).toEqual({});
  expect(game.state.activeInteraction).toBeNull();
  expect(onDraftsChange).toHaveBeenCalledWith({});
  oldInput.setValue("b");
  expect(onDraftsChange).toHaveBeenCalledTimes(1);
  expect(drafts["play.move"].choice).toBe("a");
  game.dispose();
});

it("controlled nested values are immutable snapshots without freezing owner data", () => {
  const input: InteractionInputDescriptor = {
    key: "cards",
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["a", "b"],
      selection: { mode: "many", min: 1, max: 2 },
    },
  };
  const x = setup([action([input])]);
  const owned = ["a"];
  const game = createGameInstance()({
    source: x.source,
    state: { drafts: { "play.move": { cards: owned } } },
  });
  const captured = game.interactions
    .get("play.move")!
    .getInput("cards")!
    .getValue() as string[];
  expect(Object.isFrozen(captured)).toBe(true);
  expect(Object.isFrozen(owned)).toBe(false);
  expect(() => captured.push("b")).toThrow();
  expect(owned).toEqual(["a"]);
  game.dispose();
});

it("reconciles with the selected card's narrow domain, not the broad global descriptor", () => {
  const card: InteractionInputDescriptor = {
    key: "card",
    kind: "card",
    domain: {
      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["ace"],
    },
  };
  const broad = action([card, choice("target", ["a", "b"])]);
  const narrow = action([card, choice("target", ["a"])]);
  const x = setup([broad]);
  const zones = (route: InteractionDescriptor) => ({
    hand: {
      cardIds: ["ace"],
      cardViewsById: { ace: "{}" },
      playableByCardId: { ace: [route] },
    },
  });
  x.emit(2, [broad], { zones: zones(broad) });
  const game = createGameInstance()({ source: x.source });
  game.interactions.get("play.move")!.getInput("card")!.setValue("ace");
  game.interactions.get("play.move")!.getInput("target")!.setValue("b");
  x.emit(3, [broad], { zones: zones(narrow) });
  expect(game.state.drafts["play.move"]).toEqual({ card: "ace" });
  game.dispose();
});

it("rebuilds interaction handlers when a new source reuses the identical immutable snapshot", () => {
  const x = setup();
  const game = createGameInstance()({ source: x.source });
  const old = game.interactions.get("play.move")!;
  const replacement = {
    ...x.source,
    store: createStore(x.source.store.get()),
    dispose: vi.fn(),
    submit: vi.fn(),
  };
  game.setOptions({ source: replacement });
  const current = game.interactions.get("play.move")!;
  expect(current).not.toBe(old);
  old.getInput("choice")!.setValue("b");
  expect(game.state.drafts["play.move"]).toBeUndefined();
  current.getInput("choice")!.setValue("a");
  expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
  game.dispose();
});

it("native submit reports rejection while preserving the selected draft", async () => {
  const x = setup();
  const onError = vi.fn();
  const game = createGameInstance()({ source: x.source, onError });
  game.inputs.get("play.move", "choice")!.setValue("a");
  game.interactions.get("play.move")!.getSubmitHandler()();
  x.ack(false);
  await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  const error = onError.mock.calls[0]![0] as Error;
  expect(error.message).toBe("RULE_REJECT");
  expect(error.cause).toEqual({ accepted: false, errorCode: "RULE_REJECT" });
  expect(game.state.drafts).toEqual({ "play.move": { choice: "a" } });
  expect(game.interactions.get("play.move")!.getIsReady()).toBe(true);
  game.dispose();
});
