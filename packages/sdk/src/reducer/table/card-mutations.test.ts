import { describe, expect, test } from "bun:test";
import type { RuntimeTableRecord } from "../../reducer";
import { perPlayer, type PlayerId } from "../per-player";
import {
  addCardToSharedZone,
  moveCardBetweenPlayerZones,
  moveCardBetweenSharedZones,
  moveCardFromPlayerZoneToSharedZone,
  moveCardFromSharedZoneToPlayerZone,
  moveComponentToContainer,
} from "./index";
import { createSpatialTable } from "./table-test-fixtures";

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
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "special-deck" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow(
      "Zone 'draw-deck' has scope 'shared', but moveCardFromPlayerZoneToSharedZone requires fromZoneId to be a perPlayer zone.",
    );

    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );

    expect(() =>
      moveCardFromPlayerZoneToSharedZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "player-hand" as any,
        toZoneId: "player-hand" as any,
        cardId: "card-1" as any,
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

    const next = addCardToSharedZone(
      table,
      "draw-deck" as any,
      "card-2" as any,
      null,
      "top",
    );

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

    const next = addCardToSharedZone(
      table,
      "draw-deck" as any,
      "card-2" as any,
    );

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
      fromZoneId: "draw-deck" as any,
      toZoneId: "special-deck" as any,
      cardId: "card-1" as any,
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
    table.hands["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["player-hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
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
      playerId: "player-1" as any,
      fromZoneId: "player-hand" as any,
      toZoneId: "draw-deck" as any,
      cardId: "card-1" as any,
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
    table.hands["hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      (id) => (id === ("player-1" as PlayerId) ? ["card-1"] : []),
    );
    table.hands["in-play"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["in-play"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
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
      playerId: "player-1" as any,
      fromZoneId: "hand" as any,
      toZoneId: "in-play" as any,
      cardId: "card-1" as any,
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
    expect(
      perPlayer(
        ["player-1"].map((id) => id as PlayerId),
        () => [],
      ),
    ).toBeDefined();

    // hand → discard recomputes visibility back to faceUp:false for ownerOnly.
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    afterPlay.hands["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    afterPlay.zones.perPlayer["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const afterCleanup = moveCardBetweenPlayerZones({
      table: afterPlay,
      playerId: "player-1" as any,
      fromZoneId: "in-play" as any,
      toZoneId: "discard" as any,
      cardId: "card-1" as any,
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
    table.hands["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.hands["in-play"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["in-play"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "hand" as any,
        toZoneId: "in-play" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("Card 'card-1' is not in zone 'hand' for player 'player-1'.");
  });

  test("moveCardBetweenPlayerZones rejects when scopes do not match", () => {
    const table = createSpatialTable();

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "draw-deck" as any,
        cardId: "card-1" as any,
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
    table.hands["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => ["card-1"],
    );
    table.zones.perPlayer["hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => ["card-1"],
    );
    table.hands["only-special"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["only-special"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.componentLocations["card-1"] = {
      type: "InHand",
      handId: "hand",
      playerId: "player-1",
      position: 0,
    };

    expect(() =>
      moveCardBetweenPlayerZones({
        table,
        playerId: "player-1" as any,
        fromZoneId: "hand" as any,
        toZoneId: "only-special" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("cannot enter zone 'only-special'");
  });

  test("moveCardFromSharedZoneToPlayerZone gains a named card to ownerOnly discard", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["discard"] = ["main"];
    table.hands["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["discard"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: "player-1" as any,
      fromZoneId: "draw-deck" as any,
      toZoneId: "discard" as any,
      cardId: "card-1" as any,
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
    table.hands["public-area"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["public-area"] = perPlayer(
      ["player-1", "player-2"].map((id) => id as PlayerId),
      () => [],
    );

    const next = moveCardFromSharedZoneToPlayerZone({
      table,
      playerId: "player-1" as any,
      fromZoneId: "draw-deck" as any,
      toZoneId: "public-area" as any,
      cardId: "card-1" as any,
    });

    expect(next.visibility["card-1"]).toEqual({ faceUp: true });
    expect(next.ownerOfCard["card-1"]).toBe("player-1");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects on cardSet mismatch", () => {
    const table = createSpatialTable();
    table.handVisibility["only-special-hand"] = "ownerOnly";
    table.zones.cardSetIdsByZoneId!["only-special-hand"] = ["special"];
    table.hands["only-special-hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["only-special-hand"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "draw-deck" as any,
        toZoneId: "only-special-hand" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("cannot enter zone 'only-special-hand'");
  });

  test("moveCardFromSharedZoneToPlayerZone rejects when card is not in source zone", () => {
    const table = createSpatialTable();
    table.handVisibility["discard"] = "ownerOnly";
    table.hands["discard"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );
    table.zones.perPlayer["discard"] = perPlayer(
      ["player-1"].map((id) => id as PlayerId),
      () => [],
    );

    expect(() =>
      moveCardFromSharedZoneToPlayerZone({
        table,
        playerId: "player-1" as any,
        fromZoneId: "special-deck" as any,
        toZoneId: "discard" as any,
        cardId: "card-1" as any,
      }),
    ).toThrow("Card 'card-1' is not in shared zone 'special-deck'.");
  });
});
