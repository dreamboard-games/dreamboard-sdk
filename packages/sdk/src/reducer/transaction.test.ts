import { describe, expect, test } from "bun:test";
import {
  createReducerEdit,
  createReducerOps,
  createStateQueries,
  perPlayer,
  type RuntimeTableRecord,
} from "../reducer";
import type { PlayerId } from "./per-player";
import {
  getCloneRuntimeTableCallCount,
  resetCloneRuntimeTableCallCount,
} from "./table/clone";

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
      resources: perPlayer(players, (id) =>
        id === player("player-1") ? { coins: 3 } : {},
      ),
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

function deepFreeze<T>(value: T): T {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function") ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return value;
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

  test("tx direct ops clone the table once and retain one draft state", () => {
    const state = deepFreeze(createState());
    resetCloneRuntimeTableCallCount();
    const tx = createReducerEdit<TestState>()(state);

    const afterAdd = tx.addResources({
      playerId: player("player-1"),
      amounts: { coins: 2 },
    });
    const afterSpend = tx.spendResources({
      playerId: player("player-1"),
      amounts: { coins: 1 },
    });
    const afterMove = tx.moveCardBetweenPlayerZones({
      playerId: player("player-1"),
      fromZoneId: "hand",
      toZoneId: "played",
      cardId: "card-a",
    });

    expect(afterAdd).toBe(afterSpend);
    expect(afterSpend).toBe(afterMove);
    expect(afterMove).toBe(tx.state);
    expect(getCloneRuntimeTableCallCount()).toBe(1);
    expect(
      createStateQueries(state).zone.playerCards(player("player-1"), "hand"),
    ).toEqual(["card-a", "card-b"]);
    expect(tx.q.zone.playerCards(player("player-1"), "hand")).toEqual([
      "card-b",
    ]);
    expect(tx.q.player.resource(player("player-1"), "coins")).toBe(4);
  });

  test("tx.apply keeps pure-op escape hatch semantics", () => {
    const state = createState();
    const ops = createReducerOps<TestState>();
    resetCloneRuntimeTableCallCount();
    const tx = createReducerEdit<TestState>()(state);

    const directDraft = tx.addResources({
      playerId: player("player-1"),
      amounts: { coins: 1 },
    });
    const appliedDraft = tx.apply(
      ops.spendResources({
        playerId: player("player-1"),
        amounts: { coins: 1 },
      }),
    );

    expect(appliedDraft).not.toBe(directDraft);
    expect(appliedDraft).toBe(tx.state);
    expect(getCloneRuntimeTableCallCount()).toBe(1);
    expect(tx.q.player.resource(player("player-1"), "coins")).toBe(3);
  });

  test("edit factories reuse the transaction method surface", () => {
    const edit = createReducerEdit<TestState>();
    const first = edit(createState());
    const second = edit(createState());

    expect(Object.getPrototypeOf(first)).toBe(Object.getPrototypeOf(second));
    expect(first.spendResources).toBe(first.spendResources);
    expect(second.spendResources).toBe(second.spendResources);
    expect(first.spendResources).not.toBe(second.spendResources);

    const { spendResources, apply } = first;
    spendResources({
      playerId: player("player-1"),
      amounts: { coins: 1 },
    });
    apply((state) => ({
      ...state,
      publicState: { picked: "destructured" },
    }));

    expect(first.q.player.resource(player("player-1"), "coins")).toBe(2);
    expect(first.state.publicState.picked).toBe("destructured");
    expect(second.q.player.resource(player("player-1"), "coins")).toBe(3);
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
