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

test("admits board layouts and checks tile-local integer geometry", () => {
  const boards = [
    {
      id: "graph",
      name: "Graph",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "a" }],
    },
    { id: "hex", name: "Hex", layout: "hex", scope: "shared" },
    { id: "square", name: "Square", layout: "square", scope: "shared" },
  ];
  const tileTypes = [
    {
      id: "hex-terrain",
      name: "Hex terrain",
      layout: "hex",
      cells: [{ id: "origin", at: { q: 0, r: 0 } }],
    },
    {
      id: "square-terrain",
      name: "Square terrain",
      layout: "square",
      cells: [{ id: "origin", at: { col: -1, row: 0 } }],
    },
  ];
  const parsed = parseTopologyManifestJson({ ...minimal, boards, tileTypes });
  expect(parsed.boards).toEqual(boards);
  expect(parsed.tileTypes).toEqual(tileTypes);
  for (const at of [
    { q: 0.5, r: 0 },
    { q: 0, r: Infinity },
    { col: 0.5, row: 0 },
  ]) {
    const type = "q" in at ? tileTypes[0] : tileTypes[1];
    expect(() =>
      parseTopologyManifestJson({
        ...minimal,
        boards,
        tileTypes: [{ ...type, cells: [{ id: "origin", at }] }],
      }),
    ).toThrow();
  }
  for (const legacy of [
    { ...boards[1], shape: { kind: "hexagon", radius: 1 } },
    { ...boards[2], spaces: [{ id: "a", row: 0, col: 0 }] },
    { ...boards[1], edges: [] },
  ])
    expect(() =>
      parseTopologyManifestJson({ ...minimal, boards: [legacy] }),
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
      },
      { id: "square", name: "Square", scope: "shared", layout: "square" },
    ],
    tileTypes: [
      {
        id: "hex-terrain",
        name: "Hex terrain",
        layout: "hex",
        frontImage: "assets/terrain.png",
        fieldsSchema: z.object({ category: z.string() }),
        fields: { category: "land" },
        propertiesSchema: z.object({ visited: z.boolean().default(false) }),
        cellFieldsSchema: z.object({ altitude: z.number() }),
        cells: [
          {
            id: "origin",
            at: { q: 0, r: 0 },
            name: "Origin",
            typeId: "cell",
            fields: { altitude: 3 },
          },
        ],
        edgeFieldsSchema: z.object({
          cost: z.int(),
          tags: z.array(z.string()),
        }),
        edges: [
          {
            cellId: "origin",
            side: 0,
            typeId: "border",
            label: "Border",
            fields: { cost: 1, tags: ["outside"] },
          },
        ],
        vertexFieldsSchema: z.object({ value: z.int() }),
        vertices: [
          {
            cellId: "origin",
            corner: 0,
            typeId: "corner",
            label: "Corner",
            fields: { value: 2 },
          },
        ],
      },
      {
        id: "square-terrain",
        name: "Square terrain",
        layout: "square",
        cells: [
          { id: "a", at: { row: 0, col: 0 }, typeId: "cell", name: "A" },
          { id: "b", at: { row: 0, col: 1 } },
          { id: "c", at: { row: 1, col: 0 } },
          { id: "d", at: { row: 1, col: 1 } },
        ],
        edges: [
          {
            cellId: "a",
            side: 0,
            typeId: "border",
            label: "Boundary",
            fields: { tags: ["outside"] },
          },
        ],
        vertices: [
          { cellId: "a", corner: 0, typeId: "corner", label: "Corner" },
        ],
      },
    ],
    tileSeeds: [
      {
        id: "hex-tile",
        typeId: "hex-terrain",
        properties: { visited: true },
        home: {
          type: "board",
          boardId: "hex",
          layout: "hex",
          q: 1,
          r: -1,
          rotation: 1,
        },
      },
      {
        id: "square-tile",
        typeId: "square-terrain",
        home: {
          type: "board",
          boardId: "square",
          layout: "square",
          col: -1,
          row: 0,
          rotation: 2,
        },
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
