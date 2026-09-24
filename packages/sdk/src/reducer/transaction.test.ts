import { describe, expect, test } from "vitest";
import {
  createReducerEdit,
  createStateQueries,
  perPlayer,
} from "../reducer/internal";
import type { RuntimeTableRecord } from "../reducer/advanced";
import type { PlayerId } from "./per-player";
import { createSpatialTable } from "./table/table-test-fixtures";
import {
  getCloneRuntimeTableCallCount,
  resetCloneRuntimeTableCallCount,
} from "./table/clone";

type TestState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: "draft"; activePlayers: PlayerId[] };
  phase: { round: number };
  publicState: { picked: string | null };
  hiddenState: { secret: number };
  privateState: Record<string, { mark: number }>;
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
    phase: { round: 1 },
    publicState: { picked: null },
    hiddenState: { secret: 2 },
    privateState: { "player-1": { mark: 3 }, "player-2": { mark: 8 } },
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

  test("tx mutations clone the table once and retain one draft state", () => {
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

  test("one spatial transaction refreshes queries and isolates its sibling", () => {
    const state = deepFreeze({ table: createSpatialTable() });
    const before = structuredClone(state);
    const edit = createReducerEdit<typeof state>();
    const tx = edit(state);
    const sibling = edit(state);
    const siblingBefore = structuredClone(sibling.state);
    resetCloneRuntimeTableCallCount();
    const draft = tx.state;
    const initialQueries = tx.q;
    expect(initialQueries.component.location("piece-1")).toEqual(
      state.table.componentLocations["piece-1"],
    );

    tx.moveComponentToSpace({
      componentId: "piece-1",
      boardId: "main-board",
      spaceId: "space-a",
    });
    expect(tx.q).not.toBe(initialQueries);
    expect(tx.q.component.location("piece-1")).toMatchObject({
      type: "OnSpace",
      spaceId: "space-a",
    });
    tx.moveComponentToEdge({
      componentId: "piece-1",
      boardId: "square-board",
      edgeId: "square-edge:a1-a2",
    });
    expect(tx.q.component.location("piece-1")).toMatchObject({
      type: "OnEdge",
      edgeId: "square-edge:a1-a2",
    });
    expect(tx.q.component.space("piece-1")).toBeNull();
    tx.moveComponentToVertex({
      componentId: "piece-1",
      boardId: "square-board",
      vertexId: "square-vertex:center",
    });
    expect(tx.q.component.location("piece-1")).toMatchObject({
      type: "OnVertex",
      vertexId: "square-vertex:center",
    });
    expect(tx.q.component.edge("piece-1")).toBeNull();
    tx.moveComponentToDetached({ componentId: "piece-1" });
    expect(tx.q.component.location("piece-1")).toEqual({ type: "Detached" });
    expect(tx.q.component.vertex("piece-1")).toBeNull();
    expect(tx.state).toBe(draft);
    expect(getCloneRuntimeTableCallCount()).toBe(0);
    expect(state).toEqual(before);
    expect(sibling.state).toEqual(siblingBefore);
  });

  test("independent transactions isolate mutations and refresh cached queries", () => {
    const state = deepFreeze(createState());
    const first = createReducerEdit<TestState>()(state);
    const second = createReducerEdit<TestState>()(state);
    const secondBefore = structuredClone(second.state);
    const firstDraft = first.state;
    const initialQueries = first.q;
    expect(initialQueries.player.resource(player("player-1"), "coins")).toBe(3);

    first.addResources({ playerId: player("player-1"), amounts: { coins: 2 } });
    expect(first.q).not.toBe(initialQueries);
    expect(first.q.player.resource(player("player-1"), "coins")).toBe(5);
    first.spendResources({
      playerId: player("player-1"),
      amounts: { coins: 1 },
    });
    first.patchPublicState({ picked: "first" });
    first.patchPhaseState((previous) => ({ round: previous.round + 1 }));
    first.patchHiddenState({ secret: 4 });
    first.patchPlayerPrivateState({
      playerId: player("player-1"),
      patch: (previous) => ({ mark: previous.mark + 2 }),
    });
    first.setActivePlayers([player("player-2")]);

    expect(first.q.player.resource(player("player-1"), "coins")).toBe(4);
    expect(second.q.player.resource(player("player-1"), "coins")).toBe(3);
    expect(second.state).toEqual(secondBefore);
    expect(first.state).toBe(firstDraft);
    expect(first.state.publicState.picked).toBe("first");
    expect(first.state.flow.activePlayers).toEqual(["player-2"]);
    expect(first.state.phase).toEqual({ round: 2 });
    expect(first.state.hiddenState).toEqual({ secret: 4 });
    expect(first.state.privateState["player-1"]).toEqual({ mark: 5 });
    expect(first.state.privateState["player-2"]).toEqual({ mark: 8 });
    expect(first.state.phase).not.toBe(state.phase);
    expect(first.state.hiddenState).not.toBe(state.hiddenState);
    expect(first.state.privateState).not.toBe(state.privateState);
    expect(state).toEqual(createState());
  });

  test("edit factories reuse the transaction method surface", () => {
    const edit = createReducerEdit<TestState>();
    const first = edit(createState());
    const second = edit(createState());

    expect(Object.getPrototypeOf(first)).toBe(Object.getPrototypeOf(second));
    expect(first.spendResources).toBe(first.spendResources);
    expect(second.spendResources).toBe(second.spendResources);
    expect(first.spendResources).not.toBe(second.spendResources);

    const { spendResources, patchPublicState } = first;
    spendResources({
      playerId: player("player-1"),
      amounts: { coins: 1 },
    });
    patchPublicState({ picked: "destructured" });

    expect(first.q.player.resource(player("player-1"), "coins")).toBe(2);
    expect(first.state.publicState.picked).toBe("destructured");
    expect(second.q.player.resource(player("player-1"), "coins")).toBe(3);
  });

  test("transactions rotate whole hands to the right", () => {
    const state = createState();
    const tx = createReducerEdit<TestState>()(state);
    const next = tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "right",
      players: [player("player-1"), player("player-2"), player("player-3")],
    });
    const q = createStateQueries(next);

    expect(q.zone.playerCards(player("player-1"), "hand")).toEqual(["card-c"]);
    expect(q.zone.playerCards(player("player-2"), "hand")).toEqual(["card-d"]);
    expect(q.zone.playerCards(player("player-3"), "hand")).toEqual([
      "card-a",
      "card-b",
    ]);
  });
});
