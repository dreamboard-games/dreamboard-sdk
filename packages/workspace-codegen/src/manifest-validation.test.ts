import { expect, test } from "bun:test";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import { validateManifestAuthoring } from "./manifest-validation.js";

const BASE_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boardTemplates: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
  setupOptions: [],
  setupProfiles: [],
};

test("validateManifestAuthoring rejects hex vertex refs that do not resolve to a shared corner", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    boards: [
      {
        id: "hex-board",
        name: "Hex Board",
        layout: "hex",
        scope: "shared",
        spaces: [
          { id: "a", q: 0, r: 0 },
          { id: "b", q: 1, r: 0 },
          { id: "c", q: 2, r: 0 },
        ],
        vertices: [
          {
            ref: {
              spaces: ["a", "b", "c"],
            },
          },
        ],
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.boards[0].vertices[0].ref: Hex board 'hex-board' with spaces 'a, b, c' failed validation. Hex vertex ref spaces 'a, b, c' do not resolve to exactly one shared vertex.",
  );
});

test("validateManifestAuthoring accepts hex vertex refs that resolve after template space merge", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    boardTemplates: [
      {
        id: "triad",
        name: "Triad",
        layout: "hex",
        spaces: [
          { id: "a", q: 0, r: 0 },
          { id: "b", q: 1, r: 0 },
          { id: "c", q: 0, r: 1 },
        ],
      },
    ],
    boards: [
      {
        id: "hex-board",
        name: "Hex Board",
        layout: "hex",
        scope: "shared",
        templateId: "triad",
        spaces: [{ id: "a", q: 0, r: 0 }],
        vertices: [
          {
            ref: {
              spaces: ["a", "b", "c"],
            },
          },
        ],
      },
    ],
  });

  expect(validation.errors).toEqual([]);
});

test("validateManifestAuthoring rejects slot-bearing piece seeds without explicit singleton ids", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    pieceTypes: [
      {
        id: "player-mat",
        name: "Player Mat",
        slots: [{ id: "worker-rest" }],
      },
    ],
    pieceSeeds: [
      {
        typeId: "player-mat",
        count: 2,
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.pieceSeeds[0].id: Piece seed for slot-bearing type 'player-mat' must declare an explicit id.",
  );
});

test("validateManifestAuthoring rejects slot-bearing die seeds with count greater than one", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    dieTypes: [
      {
        id: "die-holder",
        name: "Die Holder",
        sides: 6,
        slots: [{ id: "staging" }],
      },
    ],
    dieSeeds: [
      {
        id: "holder",
        typeId: "die-holder",
        count: 2,
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.dieSeeds[0].count: Die seed 'holder' for slot-bearing type 'die-holder' must omit count or set it to 1.",
  );
});

test("validateManifestAuthoring accepts die types that omit sides", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    dieTypes: [
      {
        id: "d6",
        name: "D6",
      },
    ],
    dieSeeds: [
      {
        id: "d6-a",
        typeId: "d6",
      },
    ],
  });

  expect(validation.errors).toEqual([]);
});

test("validateManifestAuthoring rejects invalid strict slot hosts and slot ids", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    cardSets: [
      {
        id: "main",
        name: "Main",
        type: "manual",
        cardSchema: {
          properties: {},
        },
        cards: [
          {
            type: "ace",
            name: "Ace",
            count: 1,
            properties: {},
            home: {
              type: "slot",
              host: {
                kind: "piece",
                id: "missing-host",
              },
              slotId: "worker-rest",
            },
          },
        ],
      },
    ],
    pieceTypes: [
      {
        id: "player-mat",
        name: "Player Mat",
        slots: [{ id: "worker-rest" }],
      },
    ],
    pieceSeeds: [
      {
        id: "mat-alpha",
        typeId: "player-mat",
      },
    ],
    dieTypes: [
      {
        id: "die-holder",
        name: "Die Holder",
        sides: 6,
        slots: [{ id: "staging" }],
      },
      {
        id: "d6",
        name: "D6",
        sides: 6,
      },
    ],
    dieSeeds: [
      {
        id: "holder-a",
        typeId: "die-holder",
      },
      {
        id: "d6-a",
        typeId: "d6",
        home: {
          type: "slot",
          host: {
            kind: "die",
            id: "holder-a",
          },
          slotId: "missing-slot",
        },
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[0].home.host: Unknown strict slot host 'piece:missing-host'. Hosts must be singleton piece/die seeds whose type declares slots.",
  );
  expect(validation.errors).toContain(
    "manifest.dieSeeds[1].home.slotId: Unknown slot 'missing-slot' for host 'die:holder-a'.",
  );
});

test("validateManifestAuthoring rejects player-scoped seed homes without ownerId", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    zones: [
      {
        id: "scout-hand",
        name: "Scout Hand",
        scope: "perPlayer",
      },
    ],
    boards: [
      {
        id: "player-mat",
        name: "Player Mat",
        layout: "square",
        scope: "perPlayer",
        spaces: [{ id: "camp", row: 0, col: 0 }],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
    pieceTypes: [{ id: "meeple", name: "Meeple" }],
    pieceSeeds: [
      {
        id: "worker-a",
        typeId: "meeple",
        home: {
          type: "space",
          boardId: "player-mat",
          spaceId: "camp",
        },
      },
    ],
    dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
    dieSeeds: [
      {
        id: "die-a",
        typeId: "d6",
        home: {
          type: "zone",
          zoneId: "scout-hand",
        },
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.pieceSeeds[0].home.boardId: Piece seed 'worker-a' requires ownerId because board 'player-mat' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.",
  );
  expect(validation.errors).toContain(
    "manifest.dieSeeds[0].home.zoneId: Die seed 'die-a' requires ownerId because zone 'scout-hand' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.",
  );
});

test("validateManifestAuthoring accepts player-scoped seed homes with ownerId", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    zones: [
      {
        id: "scout-hand",
        name: "Scout Hand",
        scope: "perPlayer",
      },
    ],
    boards: [
      {
        id: "player-mat",
        name: "Player Mat",
        layout: "square",
        scope: "perPlayer",
        spaces: [{ id: "camp", row: 0, col: 0 }],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
    pieceTypes: [{ id: "meeple", name: "Meeple" }],
    pieceSeeds: [
      {
        id: "worker-a",
        typeId: "meeple",
        ownerId: "player-1",
        home: {
          type: "space",
          boardId: "player-mat",
          spaceId: "camp",
        },
      },
    ],
    dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
    dieSeeds: [
      {
        id: "die-a",
        typeId: "d6",
        ownerId: "player-1",
        home: {
          type: "zone",
          zoneId: "scout-hand",
        },
      },
    ],
  });

  expect(validation.errors).toEqual([]);
});

test("validateManifestAuthoring rejects player-scoped card homes", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "market",
        name: "Market",
        cardSchema: { properties: {} },
        cards: [
          {
            type: "scout",
            name: "Scout",
            count: 1,
            home: { type: "zone", zoneId: "player-hand" },
            properties: {},
          },
          {
            type: "camp",
            name: "Camp",
            count: 1,
            home: {
              type: "space",
              boardId: "player-mat",
              spaceId: "camp",
            },
            properties: {},
          },
        ],
      },
    ],
    zones: [
      {
        id: "player-hand",
        name: "Player Hand",
        scope: "perPlayer",
      },
    ],
    boards: [
      {
        id: "player-mat",
        name: "Player Mat",
        layout: "square",
        scope: "perPlayer",
        spaces: [{ id: "camp", row: 0, col: 0 }],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[0].home.zoneId: Card 'scout' cannot target per-player zone 'player-hand' because card inventory has no ownerId. Place it during reducer setup instead.",
  );
  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[1].home.boardId: Card 'camp' cannot target per-player board 'player-mat' because card inventory has no ownerId. Place it during reducer setup instead.",
  );
});

test("validateManifestAuthoring rejects reserved record keys before generation", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "unsafe-cards",
        name: "Unsafe Cards",
        cardSchema: {
          properties: {
            prototype: { type: "string" },
            nested: {
              type: "object",
              properties: {
                constructor: { type: "integer" },
              },
            },
          },
        },
        cards: [
          {
            type: "__proto__",
            name: "Unsafe Card",
            count: 1,
            properties: {},
          },
        ],
      },
    ],
    zones: [
      {
        id: "prototype",
        name: "Unsafe Zone",
        scope: "shared",
      },
    ],
    boards: [
      {
        id: "safe-board",
        name: "Safe Board",
        layout: "generic",
        scope: "shared",
        spaces: [{ id: "constructor" }],
        relations: [],
        containers: [],
      },
    ],
    pieceTypes: [{ id: "worker", name: "Worker" }],
    pieceSeeds: [{ id: "__proto__", typeId: "worker" }],
    setupOptions: [
      {
        id: "__proto__",
        name: "Unsafe Option",
        choices: [{ id: "constructor", label: "Unsafe Choice" }],
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[0].type: '__proto__' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.pieceSeeds[*][0]: '__proto__' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.zones[0].id: 'prototype' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.boards[0].spaces[0].id: 'constructor' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.setupOptions[0].id: '__proto__' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.cardSets[0].cardSchema.properties.prototype: 'prototype' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.cardSets[0].cardSchema.properties.nested.properties.constructor: 'constructor' is reserved and cannot be used as a generated record key.",
  );
});

test("validateManifestAuthoring rejects generated handle key collisions", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "market",
        name: "Market",
        cardSchema: { properties: {} },
        cards: [
          { type: "foo-bar", name: "Foo Bar", count: 1, properties: {} },
          { type: "foo_bar", name: "Foo Bar 2", count: 1, properties: {} },
        ],
      },
    ],
    zones: [
      { id: "draw-zone", name: "Draw Zone", scope: "shared" },
      { id: "draw_zone", name: "Draw Zone 2", scope: "shared" },
    ],
  });

  expect(validation.errors).toContain(
    "Card type values foo-bar, foo_bar all generate handle 'fooBar'.",
  );
  expect(validation.errors).toContain(
    "Zone values draw-zone, draw_zone all generate handle 'drawZone'.",
  );
});

test("validateManifestAuthoring warns when board-scoped category type ids are ambiguous across boards", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    boards: [
      {
        id: "alpha",
        name: "Alpha",
        layout: "hex",
        scope: "shared",
        spaces: [{ id: "a", q: 0, r: 0, typeId: "site" }],
        edges: [
          {
            ref: { spaces: ["a"] },
            typeId: "route",
          },
        ],
        vertices: [],
      },
      {
        id: "beta",
        name: "Beta",
        layout: "hex",
        scope: "shared",
        spaces: [{ id: "b", q: 0, r: 0, typeId: "site" }],
        edges: [
          {
            ref: { spaces: ["b"] },
            typeId: "route",
          },
        ],
        vertices: [],
      },
    ],
  });

  expect(validation.errors).toEqual([]);
  expect(validation.warnings).toContain(
    "Ambiguous space.typeId 'site' is authored on multiple boards (alpha, beta). Prefer boardHelpers.spaceIdsByBoardId / boardHelpers.spaceTypeIdByBoardId for board-scoped lookups.",
  );
  expect(validation.warnings).toContain(
    "Ambiguous edge.typeId 'route' is authored on multiple boards (alpha, beta). Prefer boardHelpers.edgeIdsByBoardIdAndTypeId for board-scoped lookups.",
  );
});
