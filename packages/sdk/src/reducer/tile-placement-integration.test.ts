import { describe, expect, it } from "vitest";
import * as z from "zod";
import { createGame, createReducerBundle } from "../reducer.js";
import { ReducerSessionStateSchema } from "../shared/runtime-schema.js";
import { RuntimeJsonSchema } from "../shared/runtime-json.js";
import { tileSpaceId } from "../shared/domain/tile-space.js";
import { asPlayerId } from "./per-player.js";
import { createTestTransaction } from "./transaction-test-fixtures.js";
const north = asPlayerId("north"),
  south = asPlayerId("south");
const first = tileSpaceId("a", "cell"),
  second = tileSpaceId("b", "cell");
async function fixture() {
  const model = createGame({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      boards: [
        {
          id: "map",
          name: "Map",
          scope: "shared",
          layout: "square",
          relationFieldsSchema: z.object({ cost: z.int().default(3) }),
        },
      ],
      tileTypes: [
        {
          id: "face",
          name: "Face",
          layout: "square",
          cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        },
      ],
      tileSeeds: [
        {
          id: "a",
          typeId: "face",
          disclosure: {
            face: { audience: "owner" },
            appearance: { layout: "square", cells: [{ col: 0, row: 0 }] },
          },
        },
        { id: "b", typeId: "face" },
      ],
    },
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  const definition = model.assemble({
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx }) {
          tx.setActivePlayers([north]);
        },
        interactions: {
          build: play.interaction({
            inputs: {},
            reduce({ tx }) {
              tx.setComponentOwner({ componentId: "a", ownerId: north });
              tx.placeTile({
                boardId: "map",
                tileId: "a",
                at: { col: 0, row: 0, rotation: 0 },
              });
              tx.placeTile({
                boardId: "map",
                tileId: "b",
                at: { col: 2, row: 0, rotation: 0 },
              });
              tx.addRelation({
                boardId: "map",
                relation: {
                  id: "bridge",
                  typeId: "bridge",
                  fromSpaceId: first,
                  toSpaceId: second,
                },
              });
              expect(tx.q.board("map").relatedSpaces(first, "bridge")).toEqual([
                second,
              ]);
            },
          }),
        },
      }),
    },
    view: model.view(() => ({})),
  });
  const bundle = createReducerBundle(definition);
  const table = model.contract.manifest.createInitialTable({
    playerIds: [north, south],
  });
  const initialized = await bundle.initialize({
    table: RuntimeJsonSchema.parse(table),
    playerIds: [north, south],
    rngSeed: 1,
  });
  return { model, bundle, table, initialized };
}
describe("tile transaction integration", () => {
  it("refreshes queries across place, relation cleanup, and removal without changing captured queries", async () => {
    const f = await fixture();
    const tx = createTestTransaction(
      { table: f.table },
      f.model.contract.manifest,
    );
    const initial = tx.q.board("map");
    tx.placeTile({
      boardId: "map",
      tileId: "a",
      at: { col: 1, row: 2, rotation: 0 },
    });
    expect(Object.keys(initial.state.spaces)).toEqual([]);
    expect(tx.q.board("map").space(first)).toMatchObject({ col: 1, row: 2 });
    tx.placeTile({
      boardId: "map",
      tileId: "b",
      at: { col: 3, row: 2, rotation: 0 },
    });
    tx.addRelation({
      boardId: "map",
      relation: {
        id: "bridge",
        typeId: "bridge",
        fromSpaceId: first,
        toSpaceId: second,
      },
    });
    const linked = tx.q.board("map");
    const before = structuredClone(tx.state);
    expect(() => tx.removeTile({ boardId: "map", tileId: "a" })).toThrow(
      /relation/i,
    );
    expect(tx.state).toEqual(before);
    expect(() =>
      tx.placeTile({
        boardId: "map",
        tileId: "b",
        at: { col: 1, row: 2, rotation: 0 },
      }),
    ).toThrow();
    expect(tx.state).toEqual(before);
    tx.removeRelation({ boardId: "map", relationId: "bridge" });
    tx.removeTile({ boardId: "map", tileId: "a" });
    expect(linked.relatedSpaces(first, "bridge")).toEqual([second]);
    expect(Object.keys(tx.q.board("map").state.spaces)).toEqual([second]);
    expect(tx.state.table.componentLocations.a).toEqual({ type: "Detached" });
    expect(f.table.componentLocations.a).toEqual({ type: "Detached" });
  });
  it("admits a placed checkpoint through the codec and projects current owner and concealed topology", async () => {
    const f = await fixture();
    const basis = { sessionId: "placement-integration", version: 1 };
    const result = await f.bundle.dispatch({
      state: f.initialized.state,
      referenceBasis: basis,
      input: {
        kind: "interaction",
        interactionId: "build",
        playerId: north,
        params: {},
        basis: {
          ...basis,
          perspectivePlayerId: north,
          actionSetVersion: "build",
        },
      },
    });
    if (result.kind !== "accept")
      throw new Error("Expected accepted construction");
    const restored = ReducerSessionStateSchema.parse(
      JSON.parse(JSON.stringify(result.state)),
    );
    const next = { ...basis, version: 2 };
    const original = f.bundle.project({
      state: result.state,
      playerIds: [north, south],
      referenceBasis: next,
    });
    const projection = f.bundle.project({
      state: restored,
      playerIds: [north, south],
      referenceBasis: next,
    });
    expect(projection).toEqual(original);
    const ownBoards = projection.seats[north].boards;
    const otherBoards = projection.seats[south].boards;
    if (!ownBoards || !otherBoards)
      throw new Error("Expected projected boards");
    const own = ownBoards.map;
    const other = otherBoards.map;
    if (own.layout !== "square" || other.layout !== "square")
      throw new Error("Expected square");
    expect(Object.keys(own.spaces)).toHaveLength(2);
    expect(Object.keys(other.spaces)).toHaveLength(1);
    expect(own.relations).toHaveLength(1);
    expect(other.relations).toEqual([]);
    expect(own.relations[0].fields).toEqual({ cost: 3 });
    expect(other.tiles.map((tile) => tile.disclosure)).toEqual([
      "concealed",
      "visible",
    ]);
    expect(JSON.stringify(projection)).not.toContain(first);
  });
});
