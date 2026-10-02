import { describe, expect, it } from "vitest";
import { createGameInstance } from "../instance.js";
import type { InteractionDescriptor } from "../model.js";
import { createTestSource } from "../../testing/sources/test-source.js";
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

function setup() {
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
      availableInteractions: [discard, pass],
      zones: {
        hand: {
          cardIds: ["red", "blue", "green"],
          cardViewsById: {
            red: JSON.stringify({}),
            blue: JSON.stringify({}),
            green: JSON.stringify({}),
          },
          cardBacksById: {},
          playableByCardId: {
            red: [discard, pass],
            blue: [discard, pass],
            green: [discard, pass],
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
