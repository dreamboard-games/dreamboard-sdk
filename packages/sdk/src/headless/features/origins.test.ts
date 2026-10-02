import { describe, expect, it } from "vitest";
import { createGameInstance } from "../instance.js";
import type { SourceSnapshot } from "../sources/types.js";
import { createTestSource } from "../../testing/sources/test-source.js";
import { findCardOrigins, originsFeature } from "./origins.js";

const hidden = (zone: string, count: number) =>
  Array.from({ length: count }, (_, index) => `hidden:${zone}:${index}`);

function snapshot(
  version: number,
  zones: Record<string, readonly string[]>,
  { me = "alice", active = ["alice"] } = {},
): SourceSnapshot {
  return {
    me,
    players: [
      { playerId: "alice", displayName: "Alice" },
      { playerId: "bob", displayName: "Bob" },
    ],
    version,
    frame: {
      events: [],
      view: {},
      flow: {
        currentPhase: "play",
        activePlayers: active,
        simultaneousPhase: null,
      },
      availableInteractions: [],
      zones: Object.fromEntries(
        Object.entries(zones).map(([zone, cardIds]) => [
          zone,
          {
            cardIds,
            cardViewsById: Object.fromEntries(
              cardIds
                .filter((cardId) => !cardId.startsWith("hidden:"))
                .map((cardId) => [cardId, JSON.stringify({})]),
            ),
            cardBacksById: {},
            playableByCardId: {},
          },
        ]),
      ),
    },
  };
}
const zones = (cards: Record<string, readonly string[]>) =>
  snapshot(1, cards).frame.zones;
const origins = (
  previous: Record<string, readonly string[]>,
  next: Record<string, readonly string[]>,
  mover: string | null = null,
) => Object.fromEntries(findCardOrigins(zones(previous), zones(next), mover));

describe("findCardOrigins", () => {
  it("draws a hidden card into a hand", () => {
    expect(
      origins(
        { deck: hidden("deck", 3), hand: ["ace"] },
        { deck: hidden("deck", 2), hand: ["ace", "king"] },
      ),
    ).toEqual({ king: { zone: "deck", hidden: true } });
  });

  it("follows a visible card to another zone", () => {
    expect(
      origins(
        { hand: ["ace", "king"], table: [] },
        { hand: ["king"], table: ["ace"] },
      ),
    ).toEqual({ ace: { zone: "hand", hidden: false } });
  });

  it("flips a card in place either way", () => {
    expect(
      origins(
        { table: ["hidden:table:0", "two"], deck: hidden("deck", 1) },
        { table: ["queen", "two"], deck: [] },
      ),
    ).toEqual({ queen: { zone: "table", hidden: true } });
    expect(
      origins({ table: ["queen"] }, { table: ["hidden:table:0"] }),
    ).toEqual({ "hidden:table:0": { zone: "table", hidden: false } });
  });

  it("deals from the deck while other seats' cards leave the frame", () => {
    expect(
      origins(
        { deck: hidden("deck", 10), hand: [] },
        { deck: hidden("deck", 4), hand: ["ace", "king", "queen"] },
      ),
    ).toEqual({
      ace: { zone: "deck", hidden: true },
      king: { zone: "deck", hidden: true },
      queen: { zone: "deck", hidden: true },
    });
  });

  it("reshuffles the discard pile into the deck", () => {
    expect(
      origins(
        { discard: ["ace", "king"], deck: [] },
        { discard: [], deck: hidden("deck", 2) },
      ),
    ).toEqual({
      "hidden:deck:0": { zone: "discard", hidden: false },
      "hidden:deck:1": { zone: "discard", hidden: false },
    });
  });

  it("brings an unexplained card from the player who moved", () => {
    expect(origins({ trick: [] }, { trick: ["ace"] }, "bob")).toEqual({
      ace: { player: "bob", hidden: true },
    });
    expect(origins({ trick: [] }, { trick: ["ace"] })).toEqual({});
  });

  it("never turns one visible card into another", () => {
    // Passing: the passed cards left the frame and the received ones came from it.
    expect(
      origins(
        { hand: ["ace", "king", "two"] },
        { hand: ["two", "five", "six"] },
      ),
    ).toEqual({});
  });

  it("does not count a hidden card that only changed position", () => {
    expect(
      origins(
        { hand: ["ace", "hidden:hand:1"], table: [] },
        { hand: ["hidden:hand:0"], table: ["ace"] },
      ),
    ).toEqual({ ace: { zone: "hand", hidden: false } });
  });

  it("lets a shown card take a hidden departure before a hidden card does", () => {
    expect(
      origins(
        { deck: hidden("deck", 1), table: ["ace"], pile: [], hand: [] },
        { deck: [], table: [], pile: hidden("pile", 1), hand: ["king"] },
      ),
    ).toEqual({
      king: { zone: "deck", hidden: true },
      "hidden:pile:0": { zone: "table", hidden: false },
    });
  });
});

describe("originsFeature", () => {
  function setup() {
    const source = createTestSource(
      snapshot(1, { deck: hidden("deck", 3), hand: ["ace"], trick: [] }),
    );
    const game = createGameInstance()({
      source,
      features: (core) => ({ origins: originsFeature(core) }),
    });
    return { game, source };
  }

  it("reports where each card came from until the next frame", () => {
    const { game, source } = setup();
    expect(game.cards.get("ace").getOrigin()).toBeNull();
    source.emit(
      snapshot(2, {
        deck: hidden("deck", 2),
        hand: ["ace", "king"],
        trick: [],
      }),
    );
    const origin = game.cards.get("king").getOrigin();
    expect(origin).toEqual({ zone: "deck", hidden: true });
    expect(game.cards.get("king").getOrigin()).toBe(origin);
    expect(game.cards.get("ace").getOrigin()).toBeNull();
    source.emit(
      snapshot(3, {
        deck: hidden("deck", 2),
        hand: ["ace", "king"],
        trick: [],
      }),
    );
    expect(game.cards.get("king").getOrigin()).toBeNull();
    game.dispose();
  });

  it("brings another player's card from them", () => {
    const { game, source } = setup();
    source.emit(
      snapshot(
        2,
        { deck: hidden("deck", 3), hand: ["ace"], trick: [] },
        { active: ["bob"] },
      ),
    );
    source.emit(
      snapshot(3, { deck: hidden("deck", 3), hand: ["ace"], trick: ["jack"] }),
    );
    expect(game.cards.get("jack").getOrigin()).toEqual({
      player: "bob",
      hidden: true,
    });
    game.dispose();
  });

  it("starts over when the source or seat changes", () => {
    const { game } = setup();
    game.setOptions({
      source: createTestSource(
        snapshot(
          2,
          { deck: hidden("deck", 2), hand: ["king"], trick: [] },
          { me: "bob" },
        ),
      ),
    });
    expect(game.cards.get("king").getOrigin()).toBeNull();
    game.dispose();
  });
});
