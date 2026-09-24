import { describe, expect, test } from "vitest";
import { z } from "zod";
import { compileManifest } from "./compiler";
import { createGame } from "../authoring/game";
import { perPlayerKeys } from "../per-player";

const manifest = {
  players: { minPlayers: 2, maxPlayers: 4 },
  cardSets: [
    {
      type: "manual",
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: {
        properties: {
          points: { type: "integer", default: 0 },
          color: { type: "enum", enums: ["red", "blue"] },
        },
      },
      cards: [
        { type: "ace", name: "Ace", count: 2, properties: { color: "red" } },
      ],
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["cards"],
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["cards"],
      visibility: "ownerOnly",
    },
  ],
  boards: [],
  resources: [{ id: "points", name: "Points" }],
} as const;
describe("in-memory manifests", () => {
  test("uses an authored card category distinct from its instance type", () => {
    const compiled = compileManifest({
      ...manifest,
      cardSets: [
        {
          ...manifest.cardSets[0],
          cardSchema: {
            variants: {
              "ranked-card": {
                properties: {
                  color: { type: "enum", enums: ["red"] },
                  points: { type: "integer", default: 0 },
                },
              },
            },
          },
          cards: [
            {
              type: "ace",
              cardType: "ranked-card",
              name: "Ace",
              count: 1,
              properties: { color: "red" },
            },
          ],
        },
      ],
    } as const);
    expect(compiled.createInitialTable().cards.ace.cardType).toBe(
      "ranked-card",
    );
    expect(compiled.createInitialTable().cards.ace.properties).toEqual({
      color: "red",
      points: 0,
    });
    expect(compiled.literals.cardTypes).toEqual(["ranked-card"]);
    expect(compiled.literals.cardTypeByCardId.ace).toBe("ranked-card");
  });
  test("materializes fresh defaults for the active roster and preserves card field schemas", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(table.decks.draw).toEqual(["ace-1", "ace-2"]);
    expect(table).toEqual(JSON.parse(JSON.stringify(table)));
    expect(table.cards["ace-1"].properties).toEqual({
      points: 0,
      color: "red",
    });
    expect(perPlayerKeys(table.hands.hand)).toEqual(["north", "south"]);
    expect(compiled.ids.cardId.safeParse("ace-3").success).toBe(false);
    expect(
      compiled.tableSchema.safeParse({
        ...table,
        cards: {
          ...table.cards,
          "ace-1": {
            ...table.cards["ace-1"],
            properties: { points: 1.5, color: "green" },
          },
        },
      }).success,
    ).toBe(false);
    table.decks.draw.pop();
    expect(compiled.createInitialTable().decks.draw).toHaveLength(2);
  });
  test("runs authoring validation during compilation", () => {
    expect(() => compileManifest({ ...manifest, zones: [] })).toThrow(
      /unknown zone 'draw'/,
    );
  });
  test("createGame accepts an ordinary authored manifest value", () => {
    const game = createGame({
      manifest,
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: { play: z.object({}) },
    });
    expect(game).toHaveProperty("assemble");
  });
});

test("player-scoped boards follow the active roster rather than max-player placeholders", () => {
  const board = compileManifest({
    players: { minPlayers: 1, maxPlayers: 4 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        layout: "generic",
        scope: "perPlayer",
        spaces: [],
        relations: [],
        containers: [],
      },
    ],
  } as const);
  const table = board.createInitialTable({ playerIds: ["north", "south"] });
  expect(Object.keys(table.boards.byId)).toEqual(["mat:north", "mat:south"]);
  expect(board.ids.boardId.safeParse("mat:north").success).toBe(true);
  expect(board.ids.boardId.safeParse("other:north").success).toBe(false);
  expect(board.ids.cardId.safeParse("unavailable").success).toBe(false);
});

test("derived geometry IDs remain constrained by the materialized topology", () => {
  const compiled = compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "map",
        name: "Map",
        layout: "square",
        scope: "shared",
        spaces: [
          { id: "a", row: 0, col: 0 },
          { id: "b", row: 0, col: 1 },
        ],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
  } as const);
  expect(compiled.ids.edgeId.safeParse("square-edge:1,0::1,1").success).toBe(
    true,
  );
  expect(compiled.ids.vertexId.safeParse("square-vertex:1,1").success).toBe(
    true,
  );
  expect(compiled.ids.edgeId.safeParse("square-edge:99,0::99,1").success).toBe(
    false,
  );
  expect(compiled.ids.vertexId.safeParse("square-vertex:99,99").success).toBe(
    false,
  );
});
