import { describe, expect, test } from "bun:test";
import {
  createReducerEdit,
  createReducerOps,
  createStateQueries,
  perPlayer,
  type RuntimeTableRecord,
} from "../reducer";
import type { PlayerId } from "./per-player";

type TestState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: "draft"; activePlayers: PlayerId[] };
  phase: Record<string, never>;
  publicState: { picked: string | null };
  hiddenState: Record<string, never>;
  privateState: Record<string, Record<string, never>>;
};

function player(id: string): PlayerId {
  return id as PlayerId;
}

function createState(): TestState {
  const players = [player("player-1"), player("player-2"), player("player-3")];
  return {
    table: {
      playerOrder: players,
      zones: {
        shared: {},
        perPlayer: {
          hand: perPlayer(players, (id) =>
            id === player("player-1")
              ? ["card-a", "card-b"]
              : id === player("player-2")
                ? ["card-c"]
                : ["card-d"],
          ),
          played: perPlayer(players, () => []),
        },
        visibility: {
          hand: "ownerOnly",
          played: "public",
        },
        cardSetIdsByZoneId: {
          hand: ["main"],
          played: ["main"],
        },
      },
      decks: {},
      hands: {
        hand: perPlayer(players, (id) =>
          id === player("player-1")
            ? ["card-a", "card-b"]
            : id === player("player-2")
              ? ["card-c"]
              : ["card-d"],
        ),
        played: perPlayer(players, () => []),
      },
      handVisibility: {
        hand: "ownerOnly",
        played: "public",
      },
      cards: {
        "card-a": {
          id: "card-a",
          cardSetId: "main",
          cardType: "card",
          properties: {},
        },
        "card-b": {
          id: "card-b",
          cardSetId: "main",
          cardType: "card",
          properties: {},
        },
        "card-c": {
          id: "card-c",
          cardSetId: "main",
          cardType: "card",
          properties: {},
        },
        "card-d": {
          id: "card-d",
          cardSetId: "main",
          cardType: "card",
          properties: {},
        },
      },
      pieces: {},
      dice: {},
      componentLocations: {
        "card-a": {
          type: "InHand",
          handId: "hand",
          playerId: "player-1",
          position: 0,
        },
        "card-b": {
          type: "InHand",
          handId: "hand",
          playerId: "player-1",
          position: 1,
        },
        "card-c": {
          type: "InHand",
          handId: "hand",
          playerId: "player-2",
          position: 0,
        },
        "card-d": {
          type: "InHand",
          handId: "hand",
          playerId: "player-3",
          position: 0,
        },
      },
      ownerOfCard: {
        "card-a": "player-1",
        "card-b": "player-1",
        "card-c": "player-2",
        "card-d": "player-3",
      },
      visibility: {
        "card-a": { faceUp: false, visibleTo: ["player-1"] },
        "card-b": { faceUp: false, visibleTo: ["player-1"] },
        "card-c": { faceUp: false, visibleTo: ["player-2"] },
        "card-d": { faceUp: false, visibleTo: ["player-3"] },
      },
      resources: perPlayer(players, () => ({})),
      boards: { byId: {} },
      slots: {},
    },
    flow: { currentPhase: "draft", activePlayers: players },
    phase: {},
    publicState: { picked: null },
    hiddenState: {},
    privateState: {},
  };
}

describe("reducer transactions", () => {
  test("tx.q refreshes after each operation without mutating the callback q", () => {
    const state = createState();
    const callbackQ = createStateQueries(state);
    const tx = createReducerEdit<TestState>()(state);

    tx.moveCardBetweenPlayerZones({
      playerId: player("player-1"),
      fromZoneId: "hand",
      toZoneId: "played",
      cardId: "card-a",
    });

    expect(callbackQ.zone.playerCards(player("player-1"), "hand")).toEqual([
      "card-a",
      "card-b",
    ]);
    expect(tx.q.zone.playerCards(player("player-1"), "hand")).toEqual([
      "card-b",
    ]);
    expect(tx.q.zone.playerCards(player("player-1"), "played")).toEqual([
      "card-a",
    ]);
    expect(tx.state.publicState.picked).toBeNull();

    tx.patchPublicState({ picked: "card-a" });
    expect(tx.state.publicState.picked).toBe("card-a");
  });

  test("tx.rotatePlayerZone rotates selected cards and refreshes ownership", () => {
    const tx = createReducerEdit<TestState>()(createState());

    tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "left",
      cardIdsByPlayer: {
        [player("player-1")]: ["card-a"],
        [player("player-2")]: ["card-c"],
        [player("player-3")]: ["card-d"],
      },
    });

    expect(tx.q.zone.playerCards(player("player-1"), "hand")).toEqual([
      "card-b",
      "card-d",
    ]);
    expect(tx.q.zone.playerCards(player("player-2"), "hand")).toEqual([
      "card-a",
    ]);
    expect(tx.q.zone.playerCards(player("player-3"), "hand")).toEqual([
      "card-c",
    ]);
    expect(tx.q.card.owner("card-a")).toBe(player("player-2"));
    expect(tx.q.card.visibility("card-a")).toEqual({
      faceUp: false,
      visibleTo: ["player-2"],
    });
  });

  test("ops.rotatePlayerZone is available as a low-level op", () => {
    const state = createState();
    const ops = createReducerOps<TestState>();
    const next = ops.rotatePlayerZone({
      zoneId: "hand",
      direction: "right",
      players: [player("player-1"), player("player-2"), player("player-3")],
    })(state);
    const q = createStateQueries(next);

    expect(q.zone.playerCards(player("player-1"), "hand")).toEqual(["card-c"]);
    expect(q.zone.playerCards(player("player-2"), "hand")).toEqual(["card-d"]);
    expect(q.zone.playerCards(player("player-3"), "hand")).toEqual([
      "card-a",
      "card-b",
    ]);
  });
});
