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
                .map((cardId) => [
                  cardId,
                  { id: cardId, cardType: "ranked", properties: {} },
                ]),
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
        { table: ["hidden:table:0", "two"] },
        { table: ["queen", "two"] },
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

  it("does not choose between hidden cards when one visible card is concealed", () => {
    expect(
      origins(
        { table: ["queen", "hidden:table:1"] },
        { table: hidden("table", 2) },
      ),
    ).toEqual({});
  });

  it("does not identify an arrival among existing hidden cards", () => {
    expect(
      origins(
        { table: ["queen"], deck: hidden("deck", 2) },
        { table: [], deck: hidden("deck", 3) },
      ),
    ).toEqual({});
  });

  it("does not pick the first zone among compatible departures", () => {
    expect(
      origins(
        { deck: hidden("deck", 1), reserve: hidden("reserve", 1), hand: [] },
        { deck: [], reserve: [], hand: ["king"] },
        "bob",
      ),
    ).toEqual({});
    expect(
      origins(
        { table: ["ace"], discard: ["king"], deck: [] },
        { table: [], discard: [], deck: hidden("deck", 2) },
      ),
    ).toEqual({});
  });

  it("does not prefer a flip over another possible hidden source", () => {
    expect(
      origins(
        { table: ["hidden:table:0", "two"], deck: hidden("deck", 1) },
        { table: ["queen", "two"], deck: [] },
      ),
    ).toEqual({});
  });

  it("does not infer hidden destinations after an ambiguous reveal", () => {
    expect(
      origins(
        {
          deck: hidden("deck", 1),
          reserve: hidden("reserve", 1),
          hand: [],
          pile: [],
        },
        { deck: [], reserve: [], hand: ["king"], pile: hidden("pile", 1) },
      ),
    ).toEqual({});
  });

  it("does not guess which cards came from a zone and which came from a player", () => {
    expect(
      origins(
        { deck: hidden("deck", 1), hand: [] },
        { deck: [], hand: ["ace", "king"] },
        "bob",
      ),
    ).toEqual({});
  });

  it("still follows visible identities when other origins are ambiguous", () => {
    expect(
      origins(
        {
          hand: ["ace"],
          deck: hidden("deck", 1),
          reserve: hidden("reserve", 1),
          table: [],
        },
        { hand: ["king"], deck: [], reserve: [], table: ["ace"] },
      ),
    ).toEqual({ ace: { zone: "hand", hidden: false } });
  });

  it("does not infer a reveal when another card may have been concealed in its place", () => {
    expect(
      origins(
        { table: ["queen", "hidden:table:1"], deck: hidden("deck", 1) },
        { table: ["hidden:table:0", "king"], deck: [] },
        "bob",
      ),
    ).toEqual({});
    expect(
      origins(
        { table: ["queen", "hidden:table:1"] },
        { table: ["hidden:table:0", "king"] },
        "bob",
      ),
    ).toEqual({});
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

  it("does not infer a private origin while the seat can also act", () => {
    const source = createTestSource(
      snapshot(1, { trick: [] }, { active: ["alice", "bob"] }),
    );
    const game = createGameInstance()({
      source,
      features: (core) => ({ origins: originsFeature(core) }),
    });
    source.emit(snapshot(2, { trick: ["ace"] }));
    expect(game.cards.get("ace").getOrigin()).toBeNull();
    game.dispose();
  });

  it("does not infer a private origin across skipped frames", () => {
    const source = createTestSource(
      snapshot(1, { trick: [] }, { active: ["bob"] }),
    );
    const game = createGameInstance()({
      source,
      features: (core) => ({ origins: originsFeature(core) }),
    });
    source.emit(snapshot(3, { trick: ["ace"] }));
    expect(game.cards.get("ace").getOrigin()).toBeNull();
    game.dispose();
  });
});
