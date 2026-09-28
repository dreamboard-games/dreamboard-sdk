import { expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../authoring/game";
import type { GameTopologyManifest } from "../../shared/domain/manifest";
import { defineTopologyManifest } from "./authoring";
import { compileManifest } from "./compiler";
import { materializeManifestTable } from "./materialize";
import { validateManifestAuthoring } from "./manifest-validation";

const base = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [],
};

test.each([
  -1,
  0,
  0.5,
  1.5,
  NaN,
  Infinity,
  -Infinity,
  Number.MAX_SAFE_INTEGER + 1,
])(
  "rejects invalid count %s at every authoring and runtime boundary",
  (count) => {
    const cases: GameTopologyManifest[] = [
      {
        ...base,
        cardSets: [
          {
            id: "cards",
            name: "Cards",
            cardSchema: { properties: {} },
            defaultHome: { type: "detached" },
            cards: [
              {
                id: "ace",
                cardType: "ace",
                name: "Ace",
                count,
                properties: {},
              },
            ],
          },
        ],
      },
      { ...base, pieceSeeds: [{ typeId: "token", count }] },
      { ...base, dieSeeds: [{ typeId: "die", count }] },
    ];
    for (const manifest of cases) {
      expect(validateManifestAuthoring(manifest).errors).toEqual([
        expect.stringMatching(/\.count: Expected a positive safe integer/),
      ]);
      const boundaries = [
        () => void Reflect.apply(defineTopologyManifest, undefined, [manifest]),
        () => compileManifest(manifest),
        () =>
          createGame({
            manifest,
            state: {
              public: z.object({}),
              private: z.object({}),
              hidden: z.object({}),
            },
            phases: { play: z.object({}) },
          }),
        () =>
          materializeManifestTable({
            manifest,
            playerIds: ["player-1"],
            shuffleItems: (items) => [...items],
          }),
      ];
      for (const construct of boundaries) {
        expect(construct).toThrow(/\.count: Expected a positive safe integer/);
      }
    }
  },
);

test("rejects invalid player bounds before allocating players", () => {
  for (const players of [
    { minPlayers: 1, maxPlayers: Infinity },
    { minPlayers: 0, maxPlayers: 2 },
    { minPlayers: 1.5, maxPlayers: 2 },
    { minPlayers: 3, maxPlayers: 2 },
  ]) {
    expect(() => compileManifest({ ...base, players })).toThrow(
      /manifest.players/,
    );
  }
});

test("compiled initialization keeps the validated source snapshot", () => {
  const source = {
    ...base,
    pieceTypes: [{ id: "token", name: "Token" }],
    pieceSeeds: [{ typeId: "token", count: 1 }],
  };
  const compiled = compileManifest(source);
  source.pieceSeeds[0].count = -1;
  expect(Object.keys(compiled.createInitialTable().pieces)).toEqual(["token"]);
});

test("defined topology validates duplicate identities and snapshots its input", () => {
  const source = {
    ...base,
    pieceTypes: [{ id: "token", name: "Token" }],
    pieceSeeds: [{ typeId: "token", count: 1 }],
  };
  const validated = defineTopologyManifest(source);
  source.pieceSeeds[0].count = -1;
  expect(validated.pieceSeeds[0].count).toBe(1);
  expect(() =>
    defineTopologyManifest({
      ...base,
      pieceTypes: [source.pieceTypes[0], source.pieceTypes[0]],
    }),
  ).toThrow(/Duplicate piece type id/);
});
