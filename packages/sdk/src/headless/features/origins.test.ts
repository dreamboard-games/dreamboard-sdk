import { createHash } from "node:crypto";
import { isHiddenCardId } from "../../shared/domain/cards.js";
import { describe, expect, it } from "vitest";
import { createGameInstance } from "../instance.js";
import type { SourceSnapshot } from "../sources/types.js";
import { createTestSource } from "../../testing/sources/test-source.js";
import { findCardOrigins, originsFeature } from "./origins.js";

const hidden = (zone: string, count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      `card-ref:sha256:${createHash("sha256").update(`${zone}:${index}`).digest("hex")}`,
  );

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
            [zone === "hand" ? me : "table"]: {
              tiles: [],
              cardIds,
              cardViewsById: Object.fromEntries(
                cardIds
                  .filter((cardId) => !isHiddenCardId(cardId))
                  .map((cardId) => [
                    cardId,
                    { id: cardId, cardType: "ranked", properties: {} },
                  ]),
              ),
              cardBacksById: {},
              playableByCardId: {},
            },
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
    ).toEqual({ king: { hostId: "table", zone: "deck", hidden: true } });
  });

  it("follows a visible card to another zone", () => {
    expect(
      origins(
        { hand: ["ace", "king"], table: [] },
        { hand: ["king"], table: ["ace"] },
      ),
    ).toEqual({ ace: { hostId: "alice", zone: "hand", hidden: false } });
  });

  it("flips a card in place either way", () => {
    expect(
      origins(
        {
          table: [
            "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818",
            "two",
          ],
        },
        { table: ["queen", "two"] },
      ),
    ).toEqual({ queen: { hostId: "table", zone: "table", hidden: true } });
    expect(
      origins(
        { table: ["queen"] },
        {
          table: [
            "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818",
          ],
        },
      ),
    ).toEqual({
      "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818":
        { hostId: "table", zone: "table", hidden: false },
    });
  });

  it("deals from the deck while other seats' cards leave the frame", () => {
    expect(
      origins(
        { deck: hidden("deck", 10), hand: [] },
        { deck: hidden("deck", 4), hand: ["ace", "king", "queen"] },
      ),
    ).toEqual({
      ace: { hostId: "table", zone: "deck", hidden: true },
      king: { hostId: "table", zone: "deck", hidden: true },
      queen: { hostId: "table", zone: "deck", hidden: true },
    });
  });

  it("reshuffles the discard pile into the deck", () => {
    expect(
      origins(
        { discard: ["ace", "king"], deck: [] },
        { discard: [], deck: hidden("deck", 2) },
      ),
    ).toEqual({
      "card-ref:sha256:cb3a5a629931a71de6a229014cbb9b084d85df5e26e61d18425ece25021e304f":
        { hostId: "table", zone: "discard", hidden: false },
      "card-ref:sha256:ad43947797d038cf0cb57f6efb6ee2dbed3f4432936b80c227152c35bbca4a00":
        { hostId: "table", zone: "discard", hidden: false },
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
        {
          hand: [
            "ace",
            "card-ref:sha256:4514ed8c6fb7ef85e85953833136f3bb7f4fa0a165480e870de91d815f0c9a50",
          ],
          table: [],
        },
        {
          hand: [
            "card-ref:sha256:ad8213301e87dbc1ca7c2bfd0127fdcda5b208190f69a3dec8c39923022f7c43",
          ],
          table: ["ace"],
        },
      ),
    ).toEqual({ ace: { hostId: "alice", zone: "hand", hidden: false } });
  });

  it("lets a shown card take a hidden departure before a hidden card does", () => {
    expect(
      origins(
        { deck: hidden("deck", 1), table: ["ace"], pile: [], hand: [] },
        { deck: [], table: [], pile: hidden("pile", 1), hand: ["king"] },
      ),
    ).toEqual({
      king: { hostId: "table", zone: "deck", hidden: true },
      "card-ref:sha256:0246dc6431786cb412a92e368e9bec36a75a1410a74e27fe5e1eb112a420654c":
        { hostId: "table", zone: "table", hidden: false },
    });
  });

  it("does not choose between hidden cards when one visible card is concealed", () => {
    expect(
      origins(
        {
          table: [
            "queen",
            "card-ref:sha256:da02b5f201a11bc7ad18353f046d031a6d7e95915daeafa8d1816f24495e0953",
          ],
        },
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
        {
          table: [
            "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818",
            "two",
          ],
          deck: hidden("deck", 1),
        },
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
    ).toEqual({ ace: { hostId: "alice", zone: "hand", hidden: false } });
  });

  it("does not infer a reveal when another card may have been concealed in its place", () => {
    expect(
      origins(
        {
          table: [
            "queen",
            "card-ref:sha256:da02b5f201a11bc7ad18353f046d031a6d7e95915daeafa8d1816f24495e0953",
          ],
          deck: hidden("deck", 1),
        },
        {
          table: [
            "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818",
            "king",
          ],
          deck: [],
        },
        "bob",
      ),
    ).toEqual({});
    expect(
      origins(
        {
          table: [
            "queen",
            "card-ref:sha256:da02b5f201a11bc7ad18353f046d031a6d7e95915daeafa8d1816f24495e0953",
          ],
        },
        {
          table: [
            "card-ref:sha256:c9935b85d7a1529e389156422c6a2e11f0c5349bd44404072e6ef9dcf192b818",
            "king",
          ],
        },
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
    expect(origin).toEqual({ hostId: "table", zone: "deck", hidden: true });
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

it("does not track concealed identities when every reference rotates during a shuffle", () => {
  const before = hidden("basis-one-deck", 3);
  const after = hidden("basis-two-deck", 3);
  expect(after.every((ref) => !before.includes(ref))).toBe(true);
  expect(origins({ deck: before }, { deck: after }, "bob")).toEqual({});
});

it("infers only the public source count when a draw rotates all remaining references", () => {
  expect(
    origins(
      { deck: hidden("basis-one-deck", 3), hand: [] },
      { deck: hidden("basis-two-deck", 2), hand: ["king"] },
    ),
  ).toEqual({ king: { hostId: "table", zone: "deck", hidden: true } });
});
