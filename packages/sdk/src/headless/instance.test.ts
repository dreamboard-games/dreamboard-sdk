import { compileManifest } from "../reducer/manifest/compiler.js";
import { createStore } from "@tanstack/store";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createGame, many } from "../reducer.js";
import { createGameInstance, AmbiguousTargetError } from "./instance.js";
import { frame, session } from "./sources/__fixtures__/frames.js";
import { createTestSource } from "../testing/sources/test-source.js";
import { scenarioSource } from "../testing/sources/scenario-source.js";
import { localSource } from "../testing/sources/local-source.js";
import hex from "../../../../examples/reference-games/hex-network-trading/app/game.ts";
import bandits from "../../../../examples/reference-games/hex-network-trading/test/scenarios/bandits.scenario.ts";
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
  const { basis: _basis, ...seatFrame } = frame();
  void _basis;
  const source = createTestSource({
    me: "alice",
    players: session.players,
    version: 1,
    frame: { ...seatFrame, availableInteractions: descriptors },
  });
  const emit = (
    version: number,
    interactions = descriptors,
    changes: Partial<PluginGameplayFrame> = {},
  ) => {
    const current = source.store.get().snapshot!;
    source.emit({
      ...current,
      version,
      frame: {
        ...current.frame,
        availableInteractions: interactions,
        ...changes,
      },
    });
  };
  const ack = (accepted = true) =>
    source.submissions
      .at(-1)!
      .resolve(
        accepted
          ? { accepted: true }
          : { accepted: false, errorCode: "RULE_REJECT" },
      );
  return { source, emit, ack };
}

function multiChoiceGame() {
  const model = createGame({
    manifest: compileManifest({
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      zones: [],
    }),
    options: z.object({}),
    phases: { play: z.object({}) },
    state: {
      public: z.object({ selected: z.array(z.string()) }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initial: { public: () => ({ selected: [] as string[] }) },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx, state }) {
          tx.setActivePlayers([state.table.playerOrder[0]]);
        },
        interactions: {
          choose: play.interaction({
            commit: { mode: "manual" },
            inputs: {
              picks: many(
                play.inputs.form.choice({
                  choices: [
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                    { value: "c", label: "C", disabled: true },
                    { value: "d", label: "D" },
                  ],
                  defaultValue: () => undefined,
                }),
                { min: 2, max: 2, distinct: true },
              ),
            },
            reduce({ tx, input }) {
              tx.patchPublicState({ selected: input.params.picks });
            },
          }),
        },
      }),
    },
    view: model.view(({ state }) => ({ selected: state.publicState.selected })),
  });
}

it("selects authored many choices through headless and submits the array to the reducer", async () => {
  const source = await localSource(multiChoiceGame(), { players: 2, seed: 1 });
  const game = createGameInstance()({ source });
  const key = "play.choose";
  let interaction = game.interactions.get(key);
  let picks = interaction.getInput("picks");
  expect(picks.getEligibleTargets()).toEqual(["a", "b", "d"]);
  expect(picks.getTargetProps("c").disabled).toBe(true);
  picks.setValue(["a", "c"]);
  expect(game.interactions.get(key).getIsReady()).toBe(false);
  game.interactions.get(key).getInput("picks").clear();
  picks = game.interactions.get(key).getInput("picks");
  picks.getTargetProps("a").onClick();
  interaction = game.interactions.get(key);
  picks = interaction.getInput("picks");
  expect(picks.getValue()).toEqual(["a"]);
  expect(interaction.getIsReady()).toBe(false);
  picks.getTargetProps("b").onClick();
  interaction = game.interactions.get(key);
  picks = interaction.getInput("picks");
  expect(picks.getValue()).toEqual(["a", "b"]);
  expect(interaction.getIsReady()).toBe(true);
  expect(picks.getTargetProps("a")["data-selected"]).toBe(true);
  expect(picks.getTargetProps("d").disabled).toBe(true);
  picks.getTargetProps("a").onClick();
  interaction = game.interactions.get(key);
  picks = interaction.getInput("picks");
  expect(picks.getValue()).toEqual(["b"]);
  expect(interaction.getIsReady()).toBe(false);
  picks.getTargetProps("d").onClick();
  interaction = game.interactions.get(key);
  expect(interaction.getInput("picks").getValue()).toEqual(["b", "d"]);
  expect(await interaction.submit()).toEqual({ accepted: true });
  expect(game.view).toMatchObject({ selected: ["b", "d"] });
  game.dispose();
  source.dispose();
});

it("uses stock choiceList option props for defaults, selection and reset", () => {
  const input: InteractionInputDescriptor = {
    key: "options",
    kind: "form",
    defaultValue: ["a"],
    domain: {
      type: "choiceList",
      choices: [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
        { value: "c", label: "C", disabled: true },
        { value: "d", label: "D" },
      ],
      min: 1,
      max: 2,
    },
  };
  const x = setup([action([input])]);
  const game = createGameInstance()({ source: x.source });
  const key = "play.move";
  let current = game.interactions.get(key).getInput("options");
  expect(current.getEligibleTargets()).toEqual(["a", "b", "d"]);
  expect(current.getTargetProps("a")["data-selected"]).toBe(true);
  expect(current.getTargetProps("c").disabled).toBe(true);
  current.getTargetProps("b").onClick();
  current = game.interactions.get(key).getInput("options");
  expect(current.getValue()).toEqual(["a", "b"]);
  expect(current.getIsReady()).toBe(true);
  expect(current.getTargetProps("d").disabled).toBe(true);
  current.getTargetProps("a").onClick();
  current = game.interactions.get(key).getInput("options");
  expect(current.getValue()).toEqual(["b"]);
  game.interactions.get(key).reset();
  expect(game.interactions.get(key).getInput("options").getValue()).toEqual([
    "a",
  ]);
  game.dispose();
});

it("retains valid partial many choices when projection removes a stale option", () => {
  const input = {
    ...choice("options", ["a", "b", null]),
    domain: {
      ...choice("options", ["a", "b", null]).domain,
      selection: { mode: "many" as const, min: 2, max: 3, distinct: true },
    },
  } as InteractionInputDescriptor;
  const x = setup([action([input])]);
  const game = createGameInstance()({ source: x.source });
  let current = game.interactions.get("play.move").getInput("options");
  expect(current.getTargetProps(null).disabled).toBe(false);
  current.getTargetProps(null).onClick();
  current = game.interactions.get("play.move").getInput("options");
  expect(current.getValue()).toEqual([null]);
  current.setValue([null, "b"]);
  expect(game.interactions.get("play.move").getIsReady()).toBe(true);
  x.emit(2, [
    action([
      {
        ...input,
        domain: {
          ...input.domain,
          choices: [
            { value: "a", label: "a" },
            { value: null, label: "null" },
          ],
        },
      } as InteractionInputDescriptor,
    ]),
  ]);
  expect(
    game.interactions.get("play.move").getInput("options").getValue(),
  ).toEqual([null]);
  expect(game.interactions.get("play.move").getIsReady()).toBe(false);
  game.dispose();
});
describe("headless instance", () => {
  it.each([true, false])(
    "explicit params preserve the existing draft through ACK/frame, frame first=%s",
    async (frameFirst) => {
      const x = setup();
      const game = createGameInstance()({ source: x.source });
      const interaction = game.interactions.get("play.move");
      interaction.getInput("choice").setValue("a");
      interaction.activate();
      const drafts = game.state.drafts;
      const submitted = interaction.submit({ choice: "b" });
      expect(x.source.submissions.at(-1)?.params).toEqual({ choice: "b" });
      if (frameFirst) x.emit(2);
      expect(game.state.drafts).toBe(drafts);
      x.ack();
      await submitted;
      expect(game.state.drafts).toBe(drafts);
      if (!frameFirst) x.emit(2);
      expect(game.state.drafts).toBe(drafts);
      expect(game.state.activeInteraction).toBe("play.move");

      // The preserved draft still belongs to a later draft-based submission.
      const draftSubmitted = interaction.submit();
      expect(x.source.submissions.at(-1)?.params).toEqual({ choice: "a" });
      x.ack();
      await draftSubmitted;
      x.emit(3);
      expect(game.state.drafts["play.move"]).toBeUndefined();
      expect(game.state.activeInteraction).toBeNull();
      game.dispose();
    },
  );
  it.each([true, false])(
    "clears only after both ACK and frame, frame first=%s",
    async (frameFirst) => {
      const x = setup();
      const game = createGameInstance()({ source: x.source });
      const interaction = game.interactions.get("play.move");
      interaction.getInput("choice").setValue("a");
      const submit = interaction.submit();
      expect(x.source.submissions.at(-1)?.params).toEqual({ choice: "a" });
      if (frameFirst) x.emit(2);
      expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
      x.ack();
      await submit;
      if (!frameFirst) {
        expect(game.interactions.get("play.move").getStatus()).toBe(
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
    const promise = game.interactions.get("play.move").submit();
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
    const input = game.interactions.get("play.move").getInput("choice");
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
    game.interactions.get("play.move").getInput("first").setValue("a");
    game.interactions.get("play.move").getInput("second").setValue("b");
    const promise = game.interactions.get("play.move").submit();
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
    expect(x.source.submissions).toHaveLength(0);
    game.interactions
      .get("play.move")
      .getInput("first")
      .getSelectHandler("b")();
    expect(x.source.submissions.at(-1)?.params).toEqual({ first: "b" });
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
    game.interactions.get("play.move").reset();
    expect(x.source.submissions).toHaveLength(1);
    expect(game.interactions.get("play.move").getStep()?.selected).toEqual({
      first: "b",
    });
    const cancellation = game.interactions.get("play.move").cancel();
    expect(x.source.submissions.at(-1)?.operation).toBe("cancel");
    x.ack();
    await cancellation;
    x.emit(3, [first]);
    game.dispose();
  });
  it("keeps stable branches for connection updates and old captured values", () => {
    const x = setup();
    const game = createGameInstance()({ source: x.source });
    const old = game.getSnapshot();
    const oldInput = game.interactions.get("play.move").getInput("choice");
    oldInput.setValue("a");
    const chosen = game.interactions.get("play.move").getInput("choice");
    expect(oldInput.getValue()).toBeUndefined();
    expect(chosen.getValue()).toBe("a");
    x.source.recovering();
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
        targetKind: "card",
        zoneIds: ["hand"],

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
          alice: {
            tiles: [],
            cardIds: ["ace", "hidden"],
            cardViewsById: {
              ace: { id: "ace", cardType: "ranked", properties: { rank: "A" } },
            },
            cardBacksById: {},
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
      },
    });
    const game = createGameInstance()({ source: x.source });
    expect(game.cards.get("hidden").view).toBeNull();
    expect(() => game.cards.get("ace").select()).toThrow(AmbiguousTargetError);
    game.cards.get("ace").select({ interaction: "play.other" });
    expect(game.state.drafts["play.other"]).toEqual({ card: "ace" });
    game.dispose();
  });
  it("card views reuse deeply immutable source data", () => {
    const x = setup();
    const card = {
      id: "ace",
      cardType: "ranked",
      properties: { ranks: ["A"], details: { suit: "spades" } },
    };
    x.emit(2, undefined, {
      zones: {
        hand: {
          alice: {
            tiles: [],
            cardIds: ["ace"],
            cardViewsById: { ace: card },
            cardBacksById: {},
            playableByCardId: {},
          },
        },
      },
    });
    const game = createGameInstance()({ source: x.source });
    const view = game.cards.get("ace").view;
    expect(view).toBe(
      x.source.store.get().snapshot!.frame.zones.hand.alice.cardViewsById.ace,
    );
    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.properties)).toBe(true);
    expect(Object.isFrozen(view.properties.ranks)).toBe(true);
    expect(Object.isFrozen(view.properties.details)).toBe(true);
    expect(Reflect.set(view.properties, "ranks", [])).toBe(false);
    card.properties.ranks.push("Q");
    expect(view.properties.ranks).toEqual(["A"]);
    game.dispose();
  });
  it("source replacement isolates stale responses and captured handlers", async () => {
    const first = setup(),
      second = setup();
    const game = createGameInstance()({ source: first.source });
    game.interactions.get("play.move").getInput("choice").setValue("a");
    const pending = game.interactions.get("play.move").submit();
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
    const input = game.interactions.get("play.move").getInput("choice");
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
    game.interactions.get("play.move").getInput("choice").setValue("a");
    const submitted = game.interactions.get("play.move").submit();
    x.ack();
    await submitted;
    x.source.fail(new Error("Recovery exhausted"));
    expect(game.connection).toBe("failed");
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
    game.interactions.get("play.move").getInput("choice").setValue("a");
    const promise = game.interactions.get("play.move").submit();
    const other = game.interactions.get("play.other");
    expect(other.getInput("choice").getTargetProps("a").disabled).toBe(true);
    expect(other.getSubmitProps().disabled).toBe(true);
    other.getInput("choice").setValue("b");
    expect(game.state.drafts["play.other"]).toBeUndefined();
    x.ack(false);
    await promise;
    game.dispose();
  });
  it("phase changes clear stale active interaction and keep snapshots deeply readonly", () => {
    const x = setup();
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move").activate();
    game.interactions.get("play.move").getInput("choice").setValue("a");
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
  it("unread available interactions warn once in development", async () => {
    const x = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const game = createGameInstance()({
      source: x.source,
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
    let branch: Readonly<{ x: number }> = Object.freeze({ x: 1 });
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
    x.source.recovering();
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
        targetKind: "card",
        zoneIds: ["hand"],

        type: "cardTarget",
        projection: "resolved",
        eligibleTargets: ["a", "b", "c"],
        selection: { mode: "many", min: 2, max: 3, distinct: true },
      },
    };
    const x = setup([action([target])]);
    const game = createGameInstance()({ source: x.source });
    game.interactions.get("play.move").getInput("cards").setValue(["a"]);
    x.emit(2);
    expect(game.state.drafts["play.move"]).toEqual({ cards: ["a"] });
    expect(game.interactions.get("play.move").getIsReady()).toBe(false);
    game.dispose();
  });
  it("numeric and resource drafts use the canonical domain bounds", () => {
    const bounded = {
      key: "count",
      kind: "form",
      domain: { type: "boundedNumber", min: 0, max: 5, step: 1 },
    } satisfies InteractionInputDescriptor;
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
    game.interactions.get("play.move").getInput("count").setValue(4);
    game.interactions
      .get("play.move")
      .getInput("supplies")
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
  const input = {
    key: "cards",
    kind: "card",
    domain: {
      targetKind: "card",
      zoneIds: ["hand"],

      type: "cardTarget",
      projection: "resolved",
      eligibleTargets: ["a", "b", "c"],
      selection: { mode: "many", min: 1, max: 3 },
    },
  } satisfies InteractionInputDescriptor;
  const x = setup([action([input], { commit: { mode: "autoWhenReady" } })]);
  const game = createGameInstance()({ source: x.source });
  game.interactions
    .get("play.move")
    .getInput("cards")
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
  expect(x.source.submissions).toHaveLength(0);
  game.dispose();
});

it.each([
  {
    change: "removed choice",
    choices: ["a", "c"],
    max: 3,
    expected: ["a", "c"],
  },
  {
    change: "disabled choice",
    choices: ["a", "b", "c"],
    disabled: "b",
    max: 3,
    expected: ["a", "c"],
  },
  {
    change: "lowered maximum",
    choices: ["a", "b", "c"],
    max: 2,
    expected: ["a", "b"],
  },
  { change: "implicit maximum", choices: ["a"], expected: ["a"] },
])(
  "choiceList reconciliation retains eligible selections after $change without submitting",
  ({ choices, disabled, max, expected }) => {
    const input: InteractionInputDescriptor = {
      key: "options",
      kind: "form",
      domain: {
        type: "choiceList",
        choices: ["a", "b", "c"].map((value) => ({ value, label: value })),
        min: 2,
        max: 3,
      },
    };
    const x = setup([action([input], { commit: { mode: "autoWhenReady" } })]);
    const game = createGameInstance()({ source: x.source });
    game.interactions
      .get("play.move")
      .getInput("options")
      .setValue(["a", "b", "c"]);
    x.emit(2, [
      action(
        [
          {
            ...input,
            domain: {
              type: "choiceList",
              choices: choices.map((value) => ({
                value,
                label: value,
                disabled: value === disabled,
              })),
              min: 2,
              ...(max === undefined ? {} : { max }),
            },
          },
        ],
        { commit: { mode: "autoWhenReady" } },
      ),
    ]);
    expect(game.state.drafts["play.move"]).toEqual({ options: expected });
    expect(game.interactions.get("play.move").getIsReady()).toBe(
      expected.length >= 2,
    );
    expect(x.source.submissions).toHaveLength(0);
    game.dispose();
  },
);

it("per-card descriptor identity resolves against the latest frame and drop writes atomically", () => {
  const cardInput: InteractionInputDescriptor = {
    key: "card",
    kind: "card",
    domain: {
      targetKind: "card",
      zoneIds: ["hand"],

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
      valueKind: "board-id",
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
        alice: {
          tiles: [],
          cardIds: ["ace"],
          cardViewsById: {
            ace: { id: "ace", cardType: "ranked", properties: { rank: "A" } },
          },
          cardBacksById: {},
          playableByCardId: { ace: [route] },
        },
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
          valueKind: "board-id",
          value: "0,0",
          boardId: "main",
          interactionKey: "play.move",
          cardInputKey: "card",
          inputKey: "space",
        });
      return {};
    },
  });
  drop!();
  expect(x.source.submissions.at(-1)?.params).toEqual({
    card: "ace",
    space: "0,0",
  });
  expect(x.source.submissions).toHaveLength(1);
  game.dispose();
});

it("input and interaction readiness reject duplicate and oversized programmatic many values", () => {
  const input: InteractionInputDescriptor = {
    key: "cards",
    kind: "card",
    domain: {
      targetKind: "card",
      zoneIds: ["hand"],

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
    game.interactions.get("play.move").getInput("cards").setValue(values);
    const current = game.interactions.get("play.move");
    expect(current.getInput("cards").getIsReady()).toBe(false);
    expect(current.getIsReady()).toBe(false);
    expect(current.getSubmitProps()["data-disabled"]).toBe(
      current.getSubmitProps().disabled,
    );
  }
  game.dispose();
});

it("same-source seat changes invalidate controlled drafts and old handlers", async () => {
  const source = await scenarioSource(hex, bandits, {
    at: "ready-to-move",
    as: "player-1",
  });
  const key = "moveBandits.moveBandits";
  const drafts = { [key]: { hexId: "northForest" } };
  const onDraftsChange = vi.fn();
  const game = createGameInstance()({
    source,
    state: { drafts, activeInteraction: key },
    onDraftsChange,
  });
  const oldInput = game.interactions.get(key).getInput("hexId");
  source.switchSeat("player-3");
  expect(game.me!.id).toBe("player-3");
  expect(game.state.drafts).toEqual({});
  expect(game.state.activeInteraction).toBeNull();
  expect(onDraftsChange).toHaveBeenCalledWith({});
  oldInput.setValue("southWestClay");
  expect(onDraftsChange).toHaveBeenCalledTimes(1);
  expect(drafts[key].hexId).toBe("northForest");
  game.dispose();
});

it("controlled nested values are immutable snapshots without freezing owner data", () => {
  const input: InteractionInputDescriptor = {
    key: "cards",
    kind: "card",
    domain: {
      targetKind: "card",
      zoneIds: ["hand"],

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
    .get("play.move")
    .getInput("cards")
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
      targetKind: "card",
      zoneIds: ["hand"],

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
      alice: {
        tiles: [],
        cardIds: ["ace"],
        cardViewsById: {
          ace: { id: "ace", cardType: "ranked", properties: {} },
        },
        cardBacksById: {},
        playableByCardId: { ace: [route] },
      },
    },
  });
  x.emit(2, [broad], { zones: zones(broad) });
  const game = createGameInstance()({ source: x.source });
  game.interactions.get("play.move").getInput("card").setValue("ace");
  game.interactions.get("play.move").getInput("target").setValue("b");
  x.emit(3, [broad], { zones: zones(narrow) });
  expect(game.state.drafts["play.move"]).toEqual({ card: "ace" });
  game.dispose();
});

it("rebuilds interaction handlers when a new source reuses the identical immutable snapshot", () => {
  const x = setup();
  const game = createGameInstance()({ source: x.source });
  const old = game.interactions.get("play.move");
  // A new test source copies snapshots, so share this exact object deliberately.
  const replacement = {
    ...x.source,
    store: createStore(x.source.store.get()),
    dispose: vi.fn(),
  };
  expect(replacement.store.get().snapshot).toBe(x.source.store.get().snapshot);
  game.setOptions({ source: replacement });
  const current = game.interactions.get("play.move");
  expect(current).not.toBe(old);
  old.getInput("choice").setValue("b");
  expect(game.state.drafts["play.move"]).toBeUndefined();
  current.getInput("choice").setValue("a");
  expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
  game.dispose();
});

it("native submit reports rejection while preserving the selected draft", async () => {
  const x = setup();
  const onError = vi.fn();
  const game = createGameInstance()({ source: x.source, onError });
  game.inputs.get("play.move", "choice").setValue("a");
  game.interactions.get("play.move").getSubmitHandler()();
  x.ack(false);
  await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  const error = onError.mock.calls[0][0] as Error;
  expect(error.message).toBe("RULE_REJECT");
  expect(error.cause).toEqual({ accepted: false, errorCode: "RULE_REJECT" });
  expect(game.state.drafts).toEqual({ "play.move": { choice: "a" } });
  expect(game.interactions.get("play.move").getIsReady()).toBe(true);
  game.dispose();
});

it.each(["idle", "pending", "accepted"] as const)(
  "reports %s source failure once and exposes the original cause",
  async (phase) => {
    const x = setup();
    const onError = vi.fn();
    const game = createGameInstance()({ source: x.source, onError });
    if (phase !== "idle") {
      game.inputs.get("play.move", "choice").setValue("a");
      game.interactions.get("play.move").getSubmitHandler()();
      if (phase === "accepted") {
        x.ack();
        await Promise.resolve();
      }
    }
    const failure = new Error("Transport failed.");
    x.source.fail(failure);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(game.failure).toBe(failure);
    expect(game.getSnapshot().failure).toBe(failure);
    expect(Object.isFrozen(failure)).toBe(true);
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    game.setOptions({ source: x.source, onError });
    const snapshot = game.getSnapshot().snapshot;
    game.dispose();
    expect(game.connection).toBe("failed");
    expect(game.getSnapshot().snapshot).toBe(snapshot);
    expect(game.failure).toBe(failure);
    expect(onError).toHaveBeenCalledTimes(1);
  },
);
it("keeps public submit rejection identical to the observable failure", async () => {
  const x = setup();
  const onError = vi.fn();
  const game = createGameInstance()({ source: x.source, onError });
  game.inputs.get("play.move", "choice").setValue("a");
  const submitted = game.interactions.get("play.move").submit();
  const failure = new Error("Failed pending request.");
  x.source.fail(failure);
  await expect(submitted).rejects.toBe(failure);
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  game.dispose();
});
it.each(["dispose", "swap"] as const)(
  "does not report pending disposal as a failure during %s",
  async (operation) => {
    const x = setup();
    const onError = vi.fn();
    const game = createGameInstance()({ source: x.source, onError });
    game.inputs.get("play.move", "choice").setValue("a");
    game.interactions.get("play.move").getSubmitHandler()();
    if (operation === "dispose") game.dispose();
    else game.setOptions({ source: setup().source, onError });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(onError).not.toHaveBeenCalled();
    expect(game.failure).toBeNull();
    game.dispose();
  },
);
it("observes an already failed source once on construction and replacement", () => {
  const x = setup();
  const y = setup();
  const onError = vi.fn();
  const failure = new Error("Already closed.");
  x.source.fail(failure);
  y.source.fail(failure);
  const game = createGameInstance()({ source: x.source, onError });
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  game.setOptions({ source: y.source, onError });
  expect(onError).toHaveBeenCalledTimes(2);
  game.setOptions({ source: y.source, onError });
  expect(onError).toHaveBeenCalledTimes(2);
  game.dispose();
});

it("delivers a retained failure when an error callback is first attached", () => {
  const x = setup();
  const onError = vi.fn();
  const failure = new Error("Startup failed.");
  x.source.fail(failure);
  const game = createGameInstance()({ source: x.source });
  game.setOptions({ source: x.source, onError });
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  game.setOptions({ source: x.source, onError: vi.fn() });
  expect(onError).toHaveBeenCalledTimes(1);
  game.dispose();
});

it("publishes the replacement failure before notifying observers", () => {
  const x = setup();
  const y = setup();
  const game = createGameInstance()({ source: x.source });
  const failure = new Error("Replacement failed.");
  y.source.fail(failure);
  const onError = vi.fn(() => expect(game.failure).toBe(failure));
  game.setOptions({ source: y.source, onError });
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  game.dispose();
});
it("notifies once when an accepted request exhausts frame recovery", async () => {
  vi.useFakeTimers();
  const x = setup();
  const onError = vi.fn();
  const game = createGameInstance()({ source: x.source, onError });
  try {
    game.inputs.get("play.move", "choice").setValue("a");
    const submitted = game.interactions.get("play.move").submit();
    x.ack();
    await expect(submitted).resolves.toEqual({ accepted: true });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(game.failure?.message).toBe("Gameplay source recovery timed out.");
    expect(onError).toHaveBeenCalledExactlyOnceWith(game.failure);
    expect(game.state.drafts["play.move"]).toEqual({ choice: "a" });
  } finally {
    game.dispose();
    vi.useRealTimers();
  }
});

it("does not deliver a synchronous submit failure into a replacement source lifetime", async () => {
  const x = setup();
  const replacement = setup();
  const failure = new Error("Synchronous transport failure.");
  const source = {
    ...x.source,
    submit(...args: Parameters<typeof x.source.submit>) {
      const pending = x.source.submit(...args);
      x.source.fail(failure);
      return pending;
    },
  };
  const replacementError = vi.fn();
  const onError = vi.fn(() => {
    game.setOptions({ source: replacement.source, onError: replacementError });
  });
  const game = createGameInstance()({ source, onError });
  game.inputs.get("play.move", "choice").setValue("a");
  game.interactions.get("play.move").getSubmitHandler()();
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  expect(replacementError).not.toHaveBeenCalled();
  expect(game.connection).toBe("ready");
  expect(game.failure).toBeNull();
  game.dispose();
});

it("distinguishes required lookups from presence checks across a phase change", () => {
  const { source, emit } = setup();
  const game = createGameInstance()({ source });
  const action = game.interactions.get("play.move");
  const input = action.getInput("choice");
  expect(game.interactions.find("play.move")).toBe(action);
  expect(game.inputs.get("play.move", "choice")).toBe(input);
  expect(() => game.players.get("missing")).toThrow('Player "missing"');
  expect(game.players.find("missing")).toBeUndefined();
  expect(() => game.players.next("missing")).toThrow(
    'Next player after "missing"',
  );
  expect(() => game.zones.get("missing", "alice")).toThrow('Zone "missing"');
  expect(game.zones.find("missing", "alice")).toBeUndefined();
  expect(() => game.cards.get("missing")).toThrow('Card "missing"');
  expect(game.cards.find("missing")).toBeUndefined();
  expect(() => action.getInput("missing")).toThrow(
    'Input in interaction play.move "missing"',
  );
  expect(action.findInput("missing")).toBeUndefined();
  emit(2, []);
  expect(game.interactions.find("play.move")).toBeUndefined();
  expect(game.inputs.find("play.move", "choice")).toBeUndefined();
  expect(() => game.interactions.get("play.move")).toThrow(
    'Interaction "play.move"',
  );
  expect(() => game.inputs.get("play.move", "choice")).toThrow(
    'Input in interaction play.move "choice"',
  );
  expect(() => input.getSelectHandler("a")()).not.toThrow();
  expect(game.state.drafts["play.move"]).toBeUndefined();
  game.dispose();
});

it("descriptor controls preserve numeric and resource array drafts and captured lifetime", () => {
  const x = setup([
    action([
      {
        key: "counts",
        kind: "form",
        domain: {
          type: "boundedNumber",
          min: 0,
          max: 5,
          selection: { mode: "many", min: 1, max: 2 },
        },
      },
      {
        key: "bags",
        kind: "form",
        domain: {
          type: "resourceMap",
          resources: [{ resourceId: "wood", min: 0, max: 5 }],
          selection: { mode: "many", min: 1, max: 2 },
        },
      },
    ]),
  ]);
  const game = createGameInstance()({ source: x.source });
  const counts = game.inputs.get("play.move", "counts").getControl();
  const bags = game.inputs.get("play.move", "bags").getControl();
  if (
    counts.type !== "boundedNumber" ||
    counts.mode !== "many" ||
    bags.type !== "resourceMap" ||
    bags.mode !== "many"
  )
    throw new Error("Wrong controls");
  counts.setValue([2, 3]);
  bags.setValue([{ wood: 2 }]);
  expect(game.state.drafts["play.move"]).toEqual({
    counts: [2, 3],
    bags: [{ wood: 2 }],
  });
  expect(game.interactions.get("play.move").getIsReady()).toBe(true);
  const other = setup();
  game.setOptions({ source: other.source });
  counts.setValue([1]);
  expect(game.state.drafts).toEqual({});
  game.dispose();
});

it("keeps connected instance projections live and nonenumerable", () => {
  const { source, emit } = setup();
  const game = createGameInstance()({ source });
  try {
    expect(game.connection).toBe("ready");
    expect(game.me?.id).toBe("alice");
    const projections = [
      "snapshot",
      "view",
      "version",
      "connection",
      "failure",
      "request",
      "state",
      "phase",
      "turn",
      "me",
      "players",
      "interactions",
      "inputs",
      "zones",
      "cards",
      "events",
    ] as const;
    for (const key of projections) {
      const descriptor = Object.getOwnPropertyDescriptor(game, key);
      expect(descriptor?.get).toBeTypeOf("function");
      expect(descriptor).toMatchObject({
        set: undefined,
        enumerable: false,
        configurable: false,
      });
    }
    expect(Object.getOwnPropertyDescriptor(game, "store")).toEqual({
      value: game.store,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    const methods = [
      "getSnapshot",
      "getOptions",
      "setOptions",
      "subscribe",
      "dispose",
      "assertCoverage",
    ];
    expect(Object.keys(game)).toEqual(methods);
    expect(Object.keys({ ...game })).toEqual(methods);
    expect(JSON.stringify(game)).toBe("{}");
    const before = game.getSnapshot();
    emit(2, undefined, { view: { score: 2 } });
    expect(game.version).toBe(2);
    expect(game.view).toEqual({ score: 2 });
    expect(game.getSnapshot()).not.toBe(before);
    expect(before.version).toBe(1);
    expect(JSON.stringify(game)).toBe("{}");
  } finally {
    game.dispose();
    source.dispose();
  }
});

it("keeps public instances of the same zone distinct across hosts", () => {
  const x = setup();
  const hand = (id: string) => ({
    tiles: [],
    cardIds: [id],
    cardViewsById: { [id]: { id, cardType: "ranked", properties: {} } },
    cardBacksById: {},
    playableByCardId: {},
  });
  const snapshot = x.source.store.get().snapshot!;
  x.source.emit({
    ...snapshot,
    version: 2,
    players: [...snapshot.players, { playerId: "table", displayName: "Table" }],
    frame: {
      ...snapshot.frame,
      zones: {
        hand: { alice: hand("ace"), bob: hand("king"), table: hand("queen") },
      },
    },
  });
  const game = createGameInstance()({ source: x.source });
  expect(game.zones.get("hand", "alice").hostId).toBe("alice");
  expect(
    game.zones
      .get("hand", "bob")
      .getCards()
      .map((card) => card.id),
  ).toEqual(["king"]);
  expect(game.zones.getAll().map((zone) => [zone.id, zone.hostId])).toEqual([
    ["hand", "alice"],
    ["hand", "bob"],
    ["hand", "table"],
  ]);
  expect(
    game.zones
      .get("hand", "table")
      .getCards()
      .map((card) => card.id),
  ).toEqual(["queen"]);
  expect(game.cards.get("ace").hostId).toBe("alice");
  expect(game.cards.get("king").hostId).toBe("bob");
  const captured = game.zones.get("hand", "bob");
  x.emit(3, [], { zones: { hand: { alice: hand("ace") } } });
  expect(game.zones.find("hand", "bob")).toBeUndefined();
  expect(captured.getCards().map((card) => card.id)).toEqual(["king"]);
  game.dispose();
});
