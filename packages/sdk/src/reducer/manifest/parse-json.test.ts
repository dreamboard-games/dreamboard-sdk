import * as z from "zod";
import { expect, test } from "vitest";
import { defineTopologyManifest } from "./authoring";
import { compileManifest } from "./compiler";
import { parseTopologyManifestJson } from "./parse-json";

const minimal = { players: { minPlayers: 1, maxPlayers: 2 }, cardSets: [] };

test("admits exported authored JSON without losing game-owned fields", () => {
  const authored = defineTopologyManifest({
    ...minimal,
    boards: [],
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        defaultHome: { type: "detached" },
        cardSchema: z.object({ payload: z.record(z.string(), z.string()) }),
        cards: [
          {
            id: "one",
            name: "One",
            count: 1,
            cardType: "plain",
            properties: { payload: { arbitrary: "kept" } },
          },
        ],
      },
    ],
    pieceTypes: [
      {
        id: "token",
        name: "Token",
        fieldsSchema: z.object({ level: z.int().default(3) }),
      },
    ],
    pieceSeeds: [{ id: "marker", typeId: "token" }],
  });
  const json: unknown = JSON.parse(JSON.stringify(authored));
  const parsed = parseTopologyManifestJson(json);
  expect(parsed).toEqual(json);
  expect(compileManifest(parsed)).toBeDefined();
});

test("rejects wrong shapes and unknown structural keys at JSON admission", () => {
  for (const value of [
    null,
    [],
    {},
    { ...minimal, legacy: true },
    { ...minimal, players: { minPlayers: "1", maxPlayers: 2 } },
    {
      ...minimal,
      boards: [{ id: "bad", name: "Bad", layout: "unknown", scope: "shared" }],
    },
    { ...minimal, pieceTypes: [{ id: "p", name: "P", legacy: true }] },
    { ...minimal, pieceSeeds: [{ typeId: "p", fields: { bad: undefined } }] },
  ])
    expect(() => parseTopologyManifestJson(value)).toThrow();
});

test("applies semantic checks after structural parsing", () => {
  for (const value of [
    { ...minimal, players: { minPlayers: 3, maxPlayers: 2 } },
    { ...minimal, pieceSeeds: [{ typeId: "missing" }] },
    {
      ...minimal,
      zones: [
        { id: "same", name: "A", scope: "shared" },
        { id: "same", name: "B", scope: "shared" },
      ],
    },
    {
      ...minimal,
      pieceTypes: [
        {
          id: "p",
          name: "P",
          fieldsSchema: { type: "object", unsupportedKeyword: true },
        },
      ],
    },
  ])
    expect(() => parseTopologyManifestJson(value)).toThrow();
});

test("admits each board layout and checks integer geometry", () => {
  const boards = [
    {
      id: "graph",
      name: "Graph",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "a" }],
    },
    {
      id: "hex",
      name: "Hex",
      layout: "hex",
      scope: "shared",
      shape: { kind: "hexagon", radius: 1 },
    },
    {
      id: "square",
      name: "Square",
      layout: "square",
      scope: "shared",
      spaces: [{ id: "a", row: 0, col: -1 }],
    },
  ];
  expect(parseTopologyManifestJson({ ...minimal, boards }).boards).toEqual(
    boards,
  );
  expect(() =>
    parseTopologyManifestJson({
      ...minimal,
      boards: [
        {
          ...boards[1],
          shape: { kind: "coordinates", coordinates: [{ q: 0.5, r: 0 }] },
        },
      ],
    }),
  ).toThrow();
});

test("preserves optional structural metadata across all board layouts", () => {
  const authored = defineTopologyManifest({
    ...minimal,
    players: { minPlayers: 1, maxPlayers: 2, optimalPlayers: 2 },
    zones: [
      {
        id: "reserve",
        name: "Reserve",
        scope: "shared",
        visibility: "hidden",
        allowedCardSetIds: [],
      },
    ],
    boards: [
      {
        id: "graph",
        name: "Graph",
        scope: "shared",
        layout: "generic",
        typeId: "graph-type",
        boardFieldsSchema: z.object({ title: z.string() }),
        fields: { title: "Graph" },
        spaceFieldsSchema: z.object({ value: z.int() }),
        spaces: [{ id: "a", name: "A", typeId: "node", fields: { value: 1 } }],
        relationFieldsSchema: z.object({ cost: z.int() }),
        relations: [
          {
            id: "self",
            typeId: "linked",
            fromSpaceId: "a",
            toSpaceId: "a",
            directed: true,
            fields: { cost: 1 },
          },
        ],
      },
      {
        id: "hex",
        name: "Hex",
        scope: "shared",
        layout: "hex",
        orientation: "flat",
        shape: {
          kind: "coordinates",
          coordinates: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
          ],
        },
        exclude: [{ q: 1, r: 0 }],
        spaces: { "0,0": { id: "origin", typeId: "cell", label: "Origin" } },
        edgeFieldsSchema: z.object({ cost: z.int() }),
        edges: [
          {
            ref: { space: "origin", side: 0 },
            typeId: "border",
            label: "Border",
            tags: ["outside"],
            fields: { cost: 1 },
          },
        ],
        vertexFieldsSchema: z.object({ value: z.int() }),
        vertices: [
          {
            ref: { space: "origin", corner: 0 },
            typeId: "corner",
            label: "Corner",
            tags: ["outside"],
            fields: { value: 2 },
          },
        ],
      },
      {
        id: "square",
        name: "Square",
        scope: "shared",
        layout: "square",
        spaces: [
          { id: "a", row: 0, col: 0, typeId: "cell", label: "A" },
          { id: "b", row: 0, col: 1 },
          { id: "c", row: 1, col: 0 },
          { id: "d", row: 1, col: 1 },
        ],
        edges: [
          {
            ref: { spaces: ["a", "b"] },
            typeId: "border",
            label: "Boundary",
            tags: ["outside"],
          },
        ],
        vertices: [
          {
            ref: { spaces: ["a", "b", "c", "d"] },
            typeId: "corner",
            label: "Corner",
            tags: ["outside"],
          },
        ],
      },
    ],
    pieceTypes: [
      {
        id: "piece",
        name: "Piece",
      },
    ],
    pieceSeeds: [
      {
        id: "piece",
        name: "Named piece",
        typeId: "piece",
        count: 1,
        visibility: { faceUp: false },
      },
    ],
    dieTypes: [
      {
        id: "die",
        name: "Die",
        sides: 6,
      },
    ],
    dieSeeds: [
      {
        id: "die",
        name: "Named die",
        typeId: "die",
        count: 1,
        visibility: { faceUp: true },
      },
    ],
    resources: [{ id: "coin", name: "Coin", icon: "C", visibility: "owner" }],
  });
  const json: unknown = JSON.parse(JSON.stringify(authored));
  expect(parseTopologyManifestJson(json)).toEqual(json);
});

test("reports structural array indices and positive integer requirements", () => {
  expect(() =>
    parseTopologyManifestJson({
      ...minimal,
      pieceSeeds: [{ typeId: "missing", count: 0 }],
    }),
  ).toThrow("manifest.pieceSeeds[0].count: Expected a positive safe integer.");
});
