import { describe, expect, it } from "vitest";
import { createGameInstance } from "../instance.js";
import type { InteractionDescriptor } from "../model.js";
import { createTestSource } from "../../testing/sources/test-source.js";
import { isSameDropTarget } from "../drop-targets.js";
import { dragFeature } from "./drag.js";

const hand = {
  type: "cardTarget",
  projection: "resolved",
  targetKind: "card",
  zoneIds: ["hand"],
  eligibleTargets: ["red", "blue", "green"],
} as const;
const discard: InteractionDescriptor = {
  interactionId: "discard",
  interactionKey: "play.discard",
  phaseName: "play",
  kind: "action",
  label: "Discard",
  availability: { status: "available" },
  commit: { mode: "autoWhenReady" },
  inputs: [{ key: "card", kind: "card", domain: hand }],
};
const pass: InteractionDescriptor = {
  interactionId: "pass",
  interactionKey: "play.pass",
  phaseName: "play",
  kind: "action",
  label: "Pass",
  availability: { status: "available" },
  commit: { mode: "manual" },
  inputs: [
    {
      key: "cards",
      kind: "card",
      domain: { ...hand, selection: { mode: "many", min: 2, max: 3 } },
    },
  ],
};

const move: InteractionDescriptor = {
  ...discard,
  interactionId: "move",
  interactionKey: "play.move",
  inputs: [
    discard.inputs[0],
    {
      key: "destination",
      kind: "form",
      domain: {
        type: "choice",
        choices: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
    },
  ],
};
function setup(interactions = [discard, pass]) {
  const source = createTestSource({
    me: "alice",
    players: [{ playerId: "alice", displayName: "Alice" }],
    version: 1,
    frame: {
      events: [],
      view: {},
      flow: {
        currentPhase: "play",
        activePlayers: ["alice"],
        simultaneousPhase: null,
      },
      availableInteractions: interactions,
      zones: {
        hand: {
          alice: {
            tiles: [],
            cardIds: ["red", "blue", "green"],
            cardViewsById: {
              red: { id: "red", cardType: "ranked", properties: {} },
              blue: { id: "blue", cardType: "ranked", properties: {} },
              green: { id: "green", cardType: "ranked", properties: {} },
            },
            cardBacksById: {},
            playableByCardId: {
              red: interactions,
              blue: interactions,
              green: interactions,
            },
          },
        },
      },
    },
  });
  const game = createGameInstance()({
    source,
    features: (core, context) => ({ drag: dragFeature(core, context) }),
  });
  return { game, source };
}

describe("drop areas", () => {
  it("offers an area target for each interaction without a board input", () => {
    const { game } = setup();
    expect(game.drag.getCanDrag("red")).toBe(true);
    game.drag.begin("red");
    expect(game.drag.getDropTargets()).toEqual([
      {
        kind: "interaction",
        interactionKey: "play.discard",
        cardInputKey: "card",
      },
      {
        kind: "interaction",
        interactionKey: "play.pass",
        cardInputKey: "cards",
      },
    ]);
    game.dispose();
  });

  it("runs the area's interaction with the dropped card", () => {
    const { game, source } = setup();
    game.drag.begin("red");
    game.drag.setDropTarget(game.drag.getDropTargets()[0]);
    game.drag.drop();
    expect(game.drag.active).toBeNull();
    expect(source.submissions).toEqual([
      expect.objectContaining({
        operation: "submit",
        interactionId: "discard",
        params: { card: "red" },
      }),
    ]);
    expect(game.request).not.toBeNull();
    game.dispose();
  });

  it("adds a dropped card to a many-card choice and never toggles it out", () => {
    const { game } = setup();
    const drop = (cardId: "red" | "blue") => {
      game.drag.begin(cardId, { interaction: "play.pass" });
      game.drag.setDropTarget(game.drag.getDropTargets()[0]);
      game.drag.drop();
    };
    drop("red");
    drop("blue");
    drop("red");
    expect(game.state.drafts["play.pass"]).toEqual({ cards: ["red", "blue"] });
    game.cards.get("red").select({ interaction: "play.pass" });
    expect(game.state.drafts["play.pass"]).toEqual({ cards: ["blue"] });
    game.dispose();
  });

  it("rejects an area target the dragged card does not have", () => {
    const { game } = setup();
    game.drag.begin("red", { interaction: "play.discard" });
    game.drag.setDropTarget({
      kind: "interaction",
      interactionKey: "play.pass",
      cardInputKey: "cards",
    });
    expect(game.drag.active?.target).toBeNull();
    game.drag.drop();
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
});

describe("bound drop areas", () => {
  const target = (destination: string) => ({
    kind: "interaction" as const,
    interactionKey: "play.move",
    cardInputKey: "card",
    params: { destination },
  });
  it("distinguishes two destinations for one interaction and submits the hovered destination atomically", () => {
    const { game, source } = setup([move]);
    game.drag.begin("red");
    expect(game.drag.getIsDropTarget(target("left"))).toBe(true);
    expect(game.drag.getIsDropTarget(target("right"))).toBe(true);
    expect(isSameDropTarget(target("left"), target("right"))).toBe(false);
    game.drag.setDropTarget(target("left"));
    game.drag.setDropTarget(target("right"));
    game.drag.drop();
    expect(source.submissions[0]?.params).toEqual({
      card: "red",
      destination: "right",
    });
    game.dispose();
  });
  it("blocks incomplete, ineligible, and card-overriding bindings without writing a draft", () => {
    const { game, source } = setup([move]);
    game.drag.begin("red");
    for (const params of [
      {},
      { destination: "gone" },
      { destination: "left", card: "hidden" },
      { destination: "left", unknown: "value" },
    ]) {
      const invalid = { ...target("left"), params };
      expect(game.drag.getIsDropTarget(invalid)).toBe(false);
      game.drag.setDropTarget(invalid);
      expect(game.drag.active?.target).toBeNull();
    }
    game.drag.drop();
    expect(source.submissions).toEqual([]);
    expect(game.state.drafts).toEqual({});
    game.dispose();
  });
  it("validates bound params when a many-card draft already contains the dropped card", () => {
    const boundPass = { ...pass, inputs: [...pass.inputs, move.inputs[1]] };
    const { game, source } = setup([boundPass]);
    for (const cardId of ["red", "blue"])
      game.cards.get(cardId).select({ interaction: "play.pass" });
    game.drag.begin("red");
    const route = {
      kind: "interaction" as const,
      interactionKey: "play.pass",
      cardInputKey: "cards",
    };
    const invalid = { ...route, params: { destination: "gone" } };
    expect(game.drag.getIsDropTarget(invalid)).toBe(false);
    game.drag.setDropTarget(invalid);
    expect(game.state.drafts["play.pass"]).toEqual({ cards: ["red", "blue"] });
    game.drag.setDropTarget({ ...route, params: { destination: "right" } });
    game.drag.drop();
    expect(game.state.drafts["play.pass"]).toEqual({
      cards: ["red", "blue"],
      destination: "right",
    });
    expect(source.submissions).toEqual([]);
    game.dispose();
  });
  it("keeps bound submission controls disabled while pending or disconnected", () => {
    const { game, source } = setup([move]);
    const params = { card: "red", destination: "left" };
    expect(game.interactions.get("play.move").getSubmitProps().disabled).toBe(
      true,
    );
    expect(
      game.interactions.get("play.move").getSubmitProps(params).disabled,
    ).toBe(false);
    game.interactions.get("play.move").getSubmitHandler(params)();
    expect(source.submissions[0]?.params).toEqual(params);
    expect(
      game.interactions.get("play.move").getSubmitProps(params).disabled,
    ).toBe(true);
    game.dispose();
    const disconnected = setup([move]);
    disconnected.source.recovering();
    expect(
      disconnected.game.interactions.get("play.move").getSubmitProps(params)
        .disabled,
    ).toBe(true);
    disconnected.game.dispose();
  });
  it("cancels a bound destination when the authoritative frame changes", () => {
    const { game, source } = setup([move]);
    game.drag.begin("red");
    game.drag.setDropTarget(target("left"));
    source.emit({ ...game.snapshot!, version: 2 });
    game.drag.drop();
    expect(source.submissions).toEqual([]);
    expect(game.drag.active).toBeNull();
    game.dispose();
  });
});
