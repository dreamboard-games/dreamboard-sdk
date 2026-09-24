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
  test("materializes fresh defaults for the active roster and preserves card field schemas", () => {
    const compiled = compileManifest(manifest);
    const table = compiled.createInitialTable({
      playerIds: ["north", "south"],
    });
    expect(table.decks.draw).toEqual(["ace-1", "ace-2"]);
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
