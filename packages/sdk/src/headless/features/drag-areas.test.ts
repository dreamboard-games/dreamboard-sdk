import { describe, expect, it, vi } from "vitest";
import { createGameInstance } from "../instance.js";
import type { InteractionDescriptor } from "../model.js";
import { createTestSource } from "../../testing/sources/test-source.js";
import { isSameDropTarget } from "../drop-targets.js";
import { dragFeature } from "./drag.js";
import { cardSelectionFeature } from "./card-selection.js";

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
  commit: { mode: "manual" },
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
function setup(interactions = [discard, pass], selectionEnabled = false) {
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
    features: (core, context) => {
      const selection = cardSelectionFeature(core, context);
      return {
        selection,
        drag: dragFeature(core, context, {
          getSelection: (id) => {
            const ids = selection.root.cardSelection.cardIds;
            return selectionEnabled && ids.includes(id) ? ids : undefined;
          },
        }),
      };
    },
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
  it("keeps an unbound manual move as a draft", () => {
    const { game, source } = setup([move]);
    game.drag.begin("red");
    game.drag.setDropTarget(game.drag.getDropTargets()[0]);
    game.drag.drop();
    expect(game.state.drafts["play.move"]).toEqual({ card: "red" });
    expect(source.submissions).toEqual([]);
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
  it("closes a bound move whose accepted frame conceals the dropped card", async () => {
    const { game, source } = setup([move]);
    game.drag.begin("red");
    game.drag.setDropTarget(target("left"));
    game.drag.drop();
    expect(game.state.activeInteraction).toBe("play.move");
    source.submissions[0].resolve({ accepted: true });
    // The card now lies face down elsewhere, so the hand no longer offers it.
    const remaining = {
      ...move,
      inputs: [
        {
          ...move.inputs[0],
          domain: { ...hand, eligibleTargets: ["blue", "green"] },
        },
        move.inputs[1],
      ],
    } satisfies InteractionDescriptor;
    const hand0 = game.snapshot!.frame.zones.hand.alice;
    source.emit({
      ...game.snapshot!,
      version: 2,
      frame: {
        ...game.snapshot!.frame,
        availableInteractions: [remaining],
        zones: {
          hand: {
            alice: {
              ...hand0,
              cardIds: ["blue", "green"],
              playableByCardId: { blue: [remaining], green: [remaining] },
            },
          },
        },
      },
    });
    await vi.waitFor(() => expect(game.state.activeInteraction).toBeNull());
    expect(game.state.drafts).toEqual({});
    game.dispose();
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

describe("position targets", () => {
  const reorder: InteractionDescriptor = {
    ...move,
    interactionId: "reorder",
    interactionKey: "play.reorder",
    inputs: [
      discard.inputs[0],
      {
        key: "to",
        kind: "position",
        domain: {
          type: "zonePosition",
          zones: [{ zoneId: "hand", hostId: "alice", size: 3 }],
        },
      },
    ],
  };
  const at = (index: number) => ({
    kind: "position" as const,
    interactionKey: "play.reorder",
    cardInputKey: "card",
    inputKey: "to",
    value: { zoneId: "hand", hostId: "alice", index },
  });
  it("offers each insertion point beside the interaction's area", () => {
    const { game } = setup([reorder]);
    game.drag.begin("red");
    expect(game.drag.getDropTargets()).toEqual([
      {
        kind: "interaction",
        interactionKey: "play.reorder",
        cardInputKey: "card",
      },
      at(0),
      at(1),
      at(2),
      at(3),
    ]);
    expect(game.drag.getIsDropTarget(at(4))).toBe(false);
    expect(
      game.drag.getIsDropTarget({
        ...at(0),
        value: { zoneId: "hand", hostId: "bob", index: 0 },
      }),
    ).toBe(false);
    game.dispose();
  });
  it("submits the card with the point it was dropped on", () => {
    const { game, source } = setup([reorder]);
    game.drag.begin("green");
    game.drag.setDropTarget(at(1));
    game.drag.drop();
    expect(source.submissions[0]?.params).toEqual({
      card: "green",
      to: { zoneId: "hand", hostId: "alice", index: 1 },
    });
    game.dispose();
  });
  it("keeps position drop targets alongside a selected board destination", () => {
    const space = { boardId: "map", spaceId: "a" };
    const { game, source } = setup([
      {
        ...reorder,
        inputs: [
          ...reorder.inputs,
          {
            key: "space",
            kind: "board-space",
            domain: {
              type: "boardTarget",
              projection: "resolved",
              targetKind: "space",
              valueKind: "board-space",
              boardBaseId: "map",
              eligibleTargets: [space],
            },
          },
        ],
      },
    ]);
    game.interactions
      .get("play.reorder")
      .getInputs()
      .find((input) => input.key === "space")!
      .setValue(space);
    game.drag.begin("red");
    expect(game.drag.getDropTargets()).toContainEqual(
      expect.objectContaining({ kind: "space", value: space }),
    );
    expect(game.drag.getDropTargets()).toContainEqual(at(1));
    expect(game.drag.getIsDropTarget(at(1))).toBe(true);
    game.drag.setDropTarget(at(1));
    game.drag.drop();
    expect(source.submissions[0]?.params).toEqual({
      card: "red",
      to: { zoneId: "hand", hostId: "alice", index: 1 },
      space,
    });
    game.dispose();
  });
});

describe("local card groups", () => {
  const groupMove: InteractionDescriptor = {
    ...move,
    inputs: [{ ...pass.inputs[0], key: "card" }, move.inputs[1]],
  };
  const destination = {
    kind: "interaction" as const,
    interactionKey: "play.move",
    cardInputKey: "card",
    params: { destination: "right" },
  };
  it("submits the selected group once, preserving selection order and replacing stale drafts", () => {
    const { game, source } = setup([groupMove], true);
    game.cardSelection.set(["blue", "red", "blue", "missing"]);
    expect(game.cardSelection.cardIds).toEqual(["blue", "red"]);
    expect(game.state.drafts).toEqual({});
    game.drag.begin("red");
    expect(game.drag.active?.cardIds).toEqual(["blue", "red"]);
    expect(game.drag.getIsDropTarget(destination)).toBe(true);
    game.drag.setDropTarget(destination);
    game.drag.drop();
    expect(source.submissions).toHaveLength(1);
    expect(source.submissions[0]?.params).toEqual({
      card: ["blue", "red"],
      destination: "right",
    });
    game.dispose();
  });
  it("never falls back to moving one selected card when the group violates cardinality or the route is single-card", () => {
    for (const interaction of [groupMove, move]) {
      const { game, source } = setup([interaction], true);
      game.cardSelection.set(["red"]);
      game.drag.begin("red");
      expect(game.drag.getIsDropTarget(destination)).toBe(false);
      game.drag.setDropTarget(destination);
      game.drag.drop();
      expect(source.submissions).toEqual([]);
      expect(game.state.drafts).toEqual({});
      game.dispose();
    }
  });
  it("rejects the entire group when one member is no longer eligible", () => {
    const restricted: InteractionDescriptor = {
      ...groupMove,
      inputs: [
        {
          ...pass.inputs[0],
          key: "card",
          domain: {
            ...hand,
            eligibleTargets: ["red"],
            selection: { mode: "many", min: 1 },
          },
        },
        move.inputs[1],
      ],
    };
    const { game, source } = setup([restricted], true);
    game.cardSelection.set(["red", "blue"]);
    game.drag.begin("red");
    expect(game.drag.getIsDropTarget(destination)).toBe(false);
    game.drag.setDropTarget(destination);
    game.drag.drop();
    expect(source.submissions).toEqual([]);
    game.dispose();
  });
  it("clears local selection on a new authoritative frame and keeps captured snapshots immutable", () => {
    const { game, source } = setup([groupMove], true);
    game.cardSelection.toggle("red");
    const captured = game.cardSelection;
    game.cardSelection.toggle("blue");
    expect(captured.cardIds).toEqual(["red"]);
    source.emit({ ...game.snapshot!, version: 2 });
    expect(game.cardSelection.cardIds).toEqual([]);
    game.dispose();
    captured.toggle("blue");
    expect(captured.cardIds).toEqual(["red"]);
  });
});
