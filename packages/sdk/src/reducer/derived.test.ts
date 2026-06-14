import { describe, expect, test } from "bun:test";
import type { RuntimeTableRecord } from "../reducer/advanced";
import {
  createDerivedResolver,
  defineDerived,
  type DerivedDefinition,
} from "./derived";

function emptyTable(): RuntimeTableRecord {
  return {
    playerOrder: [],
    zones: {
      shared: {},
      perPlayer: {},
      visibility: {},
      cardSetIdsByZoneId: {},
    },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {},
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: {},
    boards: {},
    spaces: {},
    edges: {},
    vertices: {},
    componentSlots: {},
    edgeRelations: {},
    vertexRelations: {},
    spaceRelations: {},
    dice: {},
  } as unknown as RuntimeTableRecord;
}

type TestState = {
  table: RuntimeTableRecord;
  counter: number;
};

function createTestState(counter: number): TestState {
  return { table: emptyTable(), counter };
}

describe("defineDerived / createDerivedResolver", () => {
  test("memoizes compute calls within a single resolver", () => {
    let calls = 0;
    const totalPoints = defineDerived<unknown>()({
      name: "totalPoints",
      compute: ({ state }) => {
        calls += 1;
        return (state as unknown as TestState).counter * 10;
      },
    });

    const resolver = createDerivedResolver(createTestState(3));

    expect(resolver(totalPoints)).toBe(30);
    expect(resolver(totalPoints)).toBe(30);
    expect(resolver(totalPoints)).toBe(30);
    expect(calls).toBe(1);
  });

  test("composes derived values", () => {
    let aCalls = 0;
    let bCalls = 0;
    const a = defineDerived<unknown>()({
      name: "a",
      compute: ({ state }) => {
        aCalls += 1;
        return (state as unknown as TestState).counter + 1;
      },
    });
    const b = defineDerived<unknown>()({
      name: "b",
      compute: ({ derived }) => {
        bCalls += 1;
        return (derived(a) as number) * 2;
      },
    });

    const resolver = createDerivedResolver(createTestState(5));

    expect(resolver(b)).toBe(12);
    expect(resolver(a)).toBe(6);
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  test("detects cyclic dependencies", () => {
    const loopA: DerivedDefinition<unknown, number> = {
      name: "loopA",
      compute: ({ derived }) => (derived(loopB) as number) + 1,
    };
    const loopB: DerivedDefinition<unknown, number> = {
      name: "loopB",
      compute: ({ derived }) => (derived(loopA) as number) + 1,
    };

    const resolver = createDerivedResolver(createTestState(0));

    expect(() => resolver(loopA)).toThrow(/Cyclic derived/);
  });

  test("creates a fresh resolver per call (no cross-tick leakage)", () => {
    let calls = 0;
    const snapshot = defineDerived<unknown>()({
      name: "snapshot",
      compute: ({ state }) => {
        calls += 1;
        return (state as unknown as TestState).counter;
      },
    });

    const resolver1 = createDerivedResolver(createTestState(1));
    const resolver2 = createDerivedResolver(createTestState(2));

    expect(resolver1(snapshot)).toBe(1);
    expect(resolver2(snapshot)).toBe(2);
    expect(resolver1(snapshot)).toBe(1);
    expect(resolver2(snapshot)).toBe(2);
    expect(calls).toBe(2);
  });

  test("receives q namespace inside compute", () => {
    const playerCount = defineDerived<unknown>()({
      name: "playerCount",
      compute: ({ q }) => q.player.order().length,
    });

    const resolver = createDerivedResolver({
      ...createTestState(0),
      table: { ...emptyTable(), playerOrder: ["a", "b", "c"] },
    });

    expect(resolver(playerCount)).toBe(3);
  });
});
