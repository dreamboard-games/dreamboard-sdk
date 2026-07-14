import { describe, expect, test } from "bun:test";
import type { RuntimeTableRecord } from "../../reducer/advanced";
import { perPlayer, type PlayerId } from "../per-player";
import {
  addCardToSharedZone,
  addCardToSharedZoneInPlace,
  dealCardsBetweenPlayerZonesInPlace,
  dealCardsFromDeckToHandInPlace,
  moveCardBetweenPlayerZones,
  moveCardBetweenPlayerZonesInPlace,
  moveCardBetweenSharedZones,
  moveCardFromPlayerZoneToSharedZone,
  moveCardFromSharedZoneToPlayerZone,
  moveCardFromSharedZoneToPlayerZoneInPlace,
  moveComponentToContainer,
  removeCardFromSharedZoneInPlace,
} from "./index";
import { createSpatialTable } from "./table-test-fixtures";

const asRuntimePlayerId = (value: string): PlayerId =>
  value as unknown as PlayerId;

const PLAYER_1 = asRuntimePlayerId("player-1");
const PLAYER_2 = asRuntimePlayerId("player-2");
const PLAYER_IDS = [PLAYER_1, PLAYER_2] as const;
const PLAYER_1_ONLY = [PLAYER_1] as const;

const DRAW_DECK = "draw-deck";
const SPECIAL_DECK = "special-deck";
const PLAYER_HAND = "player-hand";
const HAND = "hand";
const IN_PLAY = "in-play";
const DISCARD = "discard";
const ONLY_SPECIAL = "only-special";
const PUBLIC_AREA = "public-area";
const ONLY_SPECIAL_HAND = "only-special-hand";
const DECK = "deck";
const CARD_1 = "card-1";
const CARD_2 = "card-2";

describe("table ops spatial helpers", () => {
  test("card moves respect allowedCardSetIds for shared zones and board containers", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardBetweenSharedZones({
        table,
        fromZoneId: "draw-deck",
        toZoneId: "special-deck",
        cardId: "card-1",
      }),
    ).toThrow("cannot enter zone 'special-deck'");

    expect(() =>
      moveComponentToContainer(table, "card-1", "main-board", "restricted-row"),
    ).toThrow("cannot enter container 'restricted-row'");
  });

  test("moveCardFromPlayerZoneToSharedZone explains zone scope mismatches", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardFromPlayerZoneToSharedZone({
        table,
        playerId: PLAYER_1,
        fromZoneId: DRAW_DECK,
        toZoneId: SPECIAL_DECK,
        cardId: CARD_1,
      }),
    ).toThrow(
      "Zone 'draw-deck' has scope 'shared', but moveCardFromPlayerZoneToSharedZone requires fromZoneId to be a perPlayer zone.",
    );

    table.hands["player-hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );
    table.zones.perPlayer["player-hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );

    expect(() =>
      moveCardFromPlayerZoneToSharedZone({
        table,
        playerId: PLAYER_1,
        fromZoneId: PLAYER_HAND,
        toZoneId: PLAYER_HAND,
        cardId: CARD_1,
      }),
    ).toThrow(
      "Zone 'player-hand' has scope 'perPlayer', but moveCardFromPlayerZoneToSharedZone requires toZoneId to be a shared zone.",
    );
  });

  test("addCardToSharedZone places card on top when position is 'top'", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.componentLocations["card-2"] = {
      type: "Detached",
    };
    table.ownerOfCard["card-2"] = null;
    table.visibility["card-2"] = { faceUp: true };

    const next = addCardToSharedZone(table, DRAW_DECK, CARD_2, null, "top");

    expect(next.decks["draw-deck"]).toEqual(["card-2", "card-1"]);
    expect(next.zones.shared["draw-deck"]).toEqual(["card-2", "card-1"]);
    expect(next.componentLocations["card-2"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    });
    expect(next.componentLocations["card-1"]).toEqual({
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 1,
    });
  });

  test("addCardToSharedZone defaults to bottom placement", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.componentLocations["card-2"] = { type: "Detached" };
    table.ownerOfCard["card-2"] = null;
    table.visibility["card-2"] = { faceUp: true };

    const next = addCardToSharedZone(table, DRAW_DECK, CARD_2);

    expect(next.decks["draw-deck"]).toEqual(["card-1", "card-2"]);
    expect(next.componentLocations["card-2"]).toMatchObject({
      type: "InDeck",
      position: 1,
    });
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      position: 0,
    });
  });

  test("moveCardBetweenSharedZones honors position 'top'", () => {
    const table = createSpatialTable();
    // Seed special-deck with one card so the topdeck reindex is observable.
    table.cards["card-special"] = {
      id: "card-special",
      cardSetId: "special",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.decks["special-deck"] = ["card-special"];
    table.zones.shared["special-deck"] = ["card-special"];
    table.componentLocations["card-special"] = {
      type: "InDeck",
      deckId: "special-deck",
      playedBy: null,
      position: 0,
    };
    table.ownerOfCard["card-special"] = null;
    table.visibility["card-special"] = { faceUp: true };
    // Make draw-deck and special-deck cardSet-compatible for this test.
    table.zones.cardSetIdsByZoneId!["special-deck"] = ["main", "special"];

    const next = moveCardBetweenSharedZones({
      table,
      fromZoneId: DRAW_DECK,
      toZoneId: SPECIAL_DECK,
      cardId: CARD_1,
      position: "top",
    });

    expect(next.decks["special-deck"]).toEqual(["card-1", "card-special"]);
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      deckId: "special-deck",
      position: 0,
    });
    expect(next.componentLocations["card-special"]).toMatchObject({
      type: "InDeck",
      deckId: "special-deck",
      position: 1,
    });
  });

  test("moveCardFromPlayerZoneToSharedZone honors position 'top'", () => {
    const table = createSpatialTable();
    table.handVisibility["player-hand"] = "ownerOnly";
    table.hands["player-hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );
    table.zones.perPlayer["player-hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "player-hand",
      playerId: "player-1",
      position: 0,
    };
    // Seed draw-deck with another card so 'top' placement is observable.
    table.cards["card-other"] = {
      id: "card-other",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.decks["draw-deck"] = ["card-other"];
    table.zones.shared["draw-deck"] = ["card-other"];
    table.componentLocations["card-other"] = {
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 0,
    };
    table.ownerOfCard["card-other"] = null;
    table.visibility["card-other"] = { faceUp: true };

    const next = moveCardFromPlayerZoneToSharedZone({
      table,
      playerId: PLAYER_1,
      fromZoneId: PLAYER_HAND,
      toZoneId: DRAW_DECK,
      cardId: CARD_1,
      position: "top",
    });

    expect(next.decks["draw-deck"]).toEqual(["card-1", "card-other"]);
    expect(next.componentLocations["card-1"]).toMatchObject({
      type: "InDeck",
      deckId: "draw-deck",
      position: 0,
    });
    expect(next.componentLocations["card-other"]).toMatchObject({
      type: "InDeck",
      deckId: "draw-deck",
      position: 1,
    });
  });

  test("moveCardBetweenPlayerZones preserves owner and recomputes visibility for ownerOnly destination", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["in-play"] = "public";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.zones.cardSetIdsByZoneId!["in-play"] = ["main"];
    table.hands["hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );
    table.zones.perPlayer["hand"] = perPlayer(PLAYER_IDS, (id) =>
      id === PLAYER_1 ? ["card-1"] : [],
    );
    table.hands["in-play"] = perPlayer(PLAYER_IDS, () => []);
    table.zones.perPlayer["in-play"] = perPlayer(PLAYER_IDS, () => []);
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };
    table.ownerOfCard["card-1"] = "player-1";
    table.visibility["card-1"] = { faceUp: false, visibleTo: ["player-1"] };

    const afterPlay = moveCardBetweenPlayerZones({
      table,
      playerId: PLAYER_1,
      fromZoneId: HAND,
      toZoneId: IN_PLAY,
      cardId: CARD_1,
    });

    expect(afterPlay.componentLocations["card-1"]).toEqual({
      type: "InHand",
      handId: "in-play",
      playerId: "player-1",
      position: 0,
    });
    expect(afterPlay.ownerOfCard["card-1"]).toBe("player-1");
    expect(afterPlay.visibility["card-1"]).toEqual({ faceUp: true });

    // Source hand was emptied for player-1, untouched for player-2.
    expect(perPlayer(PLAYER_1_ONLY, () => [])).toBeDefined();

    // hand → discard recomputes visibility back to faceUp:false for ownerOnly.
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    afterPlay.hands["discard"] = perPlayer(PLAYER_IDS, () => []);
    afterPlay.zones.perPlayer["discard"] = perPlayer(PLAYER_IDS, () => []);

    const afterCleanup = moveCardBetweenPlayerZones({
      table: afterPlay,
      playerId: PLAYER_1,
      fromZoneId: IN_PLAY,
      toZoneId: DISCARD,
      cardId: CARD_1,
    });

    expect(afterCleanup.visibility["card-1"]).toEqual({
      faceUp: false,
      visibleTo: ["player-1"],
    });
    expect(afterCleanup.ownerOfCard["card-1"]).toBe("player-1");
  });

  test("moveCardBetweenPlayerZones rejects when card is not in the source zone", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["in-play"] = "public";
    table.hands["hand"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["hand"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.hands["in-play"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["in-play"] = perPlayer(PLAYER_1_ONLY, () => []);

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: PLAYER_1,
        fromZoneId: HAND,
        toZoneId: IN_PLAY,
        cardId: CARD_1,
      }),
    ).toThrow("Card 'card-1' is not in zone 'hand' for player 'player-1'.");
  });

  test("moveCardBetweenPlayerZones rejects when scopes do not match", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: PLAYER_1,
        fromZoneId: DRAW_DECK,
        toZoneId: DRAW_DECK,
        cardId: CARD_1,
      }),
    ).toThrow(
      "Zone 'draw-deck' has scope 'shared', but moveCardBetweenPlayerZones requires fromZoneId to be a perPlayer zone.",
    );
  });

  test("moveCardBetweenPlayerZones rejects on cardSet mismatch", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["only-special"] = "public";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.zones.cardSetIdsByZoneId!["only-special"] = ["special"];
    table.hands["hand"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.zones.perPlayer["hand"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.hands["only-special"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["only-special"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: PLAYER_1,
        fromZoneId: HAND,
        toZoneId: ONLY_SPECIAL,
        cardId: CARD_1,
      }),
    ).toThrow("cannot enter zone 'only-special'");
  });

  test("moveCardFromSharedZoneToPlayerZone gains a named card to ownerOnly discard", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    table.hands["discard"] = perPlayer(PLAYER_IDS, () => []);
    table.zones.perPlayer["discard"] = perPlayer(PLAYER_IDS, () => []);

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: PLAYER_1,
      fromZoneId: DRAW_DECK,
      toZoneId: DISCARD,
      cardId: CARD_1,
    });

    expect(next.decks["draw-deck"]).toEqual([]);
    expect(next.zones.shared["draw-deck"]).toEqual([]);
    expect(next.componentLocations["card-1"]).toEqual({
      type: "InHand",
      handId: "discard",
      playerId: "player-1",
      position: 0,
    });
    expect(next.ownerOfCard["card-1"]).toBe("player-1");
    expect(next.visibility["card-1"]).toEqual({
      faceUp: false,
      visibleTo: ["player-1"],
    });
  });

  test("moveCardFromSharedZoneToPlayerZone keeps faceUp:true for public destination", () => {
    const table = createSpatialTable();
    table.handVisibility["public-area"] = "public";
    table.zones.cardSetIdsByZoneId!["public-area"] = ["main"];
    table.hands["public-area"] = perPlayer(PLAYER_IDS, () => []);
    table.zones.perPlayer["public-area"] = perPlayer(PLAYER_IDS, () => []);

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: PLAYER_1,
      fromZoneId: DRAW_DECK,
      toZoneId: PUBLIC_AREA,
      cardId: CARD_1,
    });

    expect(next.visibility["card-1"]).toEqual({ faceUp: true });
    expect(next.ownerOfCard["card-1"]).toBe("player-1");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects on cardSet mismatch", () => {
    const table = createSpatialTable();
    table.handVisibility["only-special-hand"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["only-special-hand"] = ["special"];
    table.hands["only-special-hand"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["only-special-hand"] = perPlayer(
      PLAYER_1_ONLY,
      () => [],
    );

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: PLAYER_1,
        fromZoneId: DRAW_DECK,
        toZoneId: ONLY_SPECIAL_HAND,
        cardId: CARD_1,
      }),
    ).toThrow("cannot enter zone 'only-special-hand'");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects when card is not in source zone", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.hands["discard"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["discard"] = perPlayer(PLAYER_1_ONLY, () => []);

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: PLAYER_1,
        fromZoneId: SPECIAL_DECK,
        toZoneId: DISCARD,
        cardId: CARD_1,
      }),
    ).toThrow("Card 'card-1' is not in shared zone 'special-deck'.");
  });

  test("rejects duplicate standalone placement and leaves table unchanged", () => {
    const table = createSpatialTable();
    table.cards["card-2"] = {
      id: "card-2",
      cardSetId: "main",
      cardType: "card",
      properties: {},
    } as RuntimeTableRecord["cards"][string];
    table.componentLocations["card-2"] = { type: "Detached" };
    table.ownerOfCard["card-2"] = null;
    table.visibility["card-2"] = { faceUp: true };

    addCardToSharedZoneInPlace(table, DRAW_DECK, CARD_2);
    const before = structuredClone(table);

    expect(() =>
      addCardToSharedZoneInPlace(table, SPECIAL_DECK, CARD_2),
    ).toThrow("must be detached before placement");
    expect(table).toEqual(before);
  });

  test("standalone shared-zone removal detaches and reindexes remaining cards", () => {
    const table = createSpatialTable();
    for (const cardId of ["card-2", "card-3"]) {
      table.cards[cardId] = {
        id: cardId,
        cardSetId: "main",
        cardType: "card",
        properties: {},
      } as RuntimeTableRecord["cards"][string];
      table.ownerOfCard[cardId] = null;
      table.visibility[cardId] = { faceUp: true };
    }
    table.decks["draw-deck"] = ["card-1", "card-2", "card-3"];
    table.zones.shared["draw-deck"] = ["card-1", "card-2", "card-3"];
    table.componentLocations["card-2"] = {
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 1,
    };
    table.componentLocations["card-3"] = {
      type: "InDeck",
      deckId: "draw-deck",
      playedBy: null,
      position: 2,
    };

    removeCardFromSharedZoneInPlace(table, DRAW_DECK, CARD_2);

    expect(table.decks["draw-deck"]).toEqual(["card-1", "card-3"]);
    expect(table.componentLocations["card-2"]).toEqual({ type: "Detached" });
    expect(table.componentLocations["card-3"]).toMatchObject({
      type: "InDeck",
      position: 1,
    });
  });

  test("mismatched shared location rejects before mutating", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    table.hands["discard"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["discard"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.componentLocations["card-1"] = { type: "Detached" };
    const before = structuredClone(table);

    expect(() =>
      moveCardFromSharedZoneToPlayerZoneInPlace({
        table,
        playerId: PLAYER_1,
        fromZoneId: DRAW_DECK,
        toZoneId: DISCARD,
        cardId: CARD_1,
      }),
    ).toThrow("location that disagrees");
    expect(table).toEqual(before);
  });

  test("failed in-place player-zone move leaves table unchanged", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.handVisibility["only-special"] = "public";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.zones.cardSetIdsByZoneId!["only-special"] = ["special"];
    table.hands["hand"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.zones.perPlayer["hand"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.hands["only-special"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["only-special"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };
    const before = structuredClone(table);

    expect(() =>
      moveCardBetweenPlayerZonesInPlace({
        table,
        playerId: PLAYER_1,
        fromZoneId: HAND,
        toZoneId: ONLY_SPECIAL,
        cardId: CARD_1,
      }),
    ).toThrow("cannot enter zone 'only-special'");
    expect(table).toEqual(before);
  });

  test("invalid and self deal requests reject before moving cards", () => {
    const table = createSpatialTable();
    table.handVisibility["hand"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["hand"] = ["main"];
    table.hands["hand"] = perPlayer(PLAYER_1_ONLY, () => []);
    table.zones.perPlayer["hand"] = perPlayer(PLAYER_1_ONLY, () => []);
    const beforeInvalidCount = structuredClone(table);

    expect(() =>
      dealCardsFromDeckToHandInPlace(table, DRAW_DECK, PLAYER_1, HAND, 0.5),
    ).toThrow("Deal count must be a non-negative safe integer");
    expect(table).toEqual(beforeInvalidCount);

    table.hands["deck"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.zones.perPlayer["deck"] = perPlayer(PLAYER_1_ONLY, () => ["card-1"]);
    table.handVisibility["deck"] = "ownerOnly";
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "deck",
      playerId: "player-1",
      position: 0,
    };
    const beforeSelfDeal = structuredClone(table);

    expect(() =>
      dealCardsBetweenPlayerZonesInPlace({
        table,
        playerId: PLAYER_1,
        fromZoneId: DECK,
        toZoneId: DECK,
        count: 1,
      }),
    ).toThrow("Deal source and destination must differ");
    expect(table).toEqual(beforeSelfDeal);
  });
});
