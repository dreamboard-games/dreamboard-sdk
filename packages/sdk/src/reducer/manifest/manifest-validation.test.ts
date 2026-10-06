import { expect, test } from "vitest";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";
import { compileManifest } from "./compiler.js";
import { validateManifestAuthoring } from "./manifest-validation.js";

const BASE_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 2,
    optimalPlayers: 2,
  },
  cardSets: [],
  zones: [],
  boards: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  resources: [],
};

test("validateManifestAuthoring rejects annotations on unknown tile cells", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "hex",
        cells: [{ id: "a", at: { q: 0, r: 0 } }],
        vertices: [{ cellId: "missing", corner: 0 }],
      },
    ],
  });
  expect(validation.errors.join("\n")).toMatch(/cellId.*missing/);
});
test("validateManifestAuthoring accepts local tile corner annotations", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "hex",
        cells: [{ id: "a", at: { q: 0, r: 0 } }],
        vertices: [{ cellId: "a", corner: 0 }],
      },
    ],
  });
  expect(validation.errors).toEqual([]);
});

test("attached component zones permit expanded piece and die seeds", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    zones: [
      { id: "cargo", name: "Cargo", attachedTo: { pieceType: "ship" } },
      { id: "dice", name: "Dice", attachedTo: { dieType: "die-holder" } },
    ],
    pieceTypes: [{ id: "ship", name: "Ship" }],
    pieceSeeds: [{ typeId: "ship", count: 2 }],
    dieTypes: [{ id: "die-holder", name: "Holder" }],
    dieSeeds: [{ typeId: "die-holder", count: 2 }],
  });
  expect(validation.errors).toEqual([]);
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

test("attached component homes require the correct expanded host base", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    zones: [
      { id: "cargo", name: "Cargo", attachedTo: { pieceType: "ship" } },
      { id: "dice", name: "Dice", attachedTo: { dieType: "die-holder" } },
    ],
    pieceTypes: [{ id: "ship", name: "Ship" }],
    pieceSeeds: [
      {
        id: "ship",
        typeId: "ship",
        count: 2,
        home: { type: "zone", zoneId: "dice", component: "ship-1" },
      },
    ],
    dieTypes: [{ id: "die-holder", name: "Holder" }],
    dieSeeds: [
      {
        id: "holder",
        typeId: "die-holder",
        home: { type: "zone", zoneId: "cargo", component: "ship" },
      },
    ],
  });
  expect(validation.errors).toContain(
    "manifest.pieceSeeds[0].home.component: Expected an expanded component base of type 'die-holder'.",
  );
  expect(validation.errors).toContain(
    "manifest.dieSeeds[0].home.component: Expected an expanded component base of type 'ship'.",
  );
});

test("validateManifestAuthoring rejects player-scoped seed homes without perPlayer scope", () => {
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
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "camp" }],
        relations: [],
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
    "manifest.pieceSeeds[0].home.boardId: Piece seed 'worker-a' requires perPlayer scope because board 'player-mat' has scope 'perPlayer'. Use perPlayer scope to resolve the player-scoped destination.",
  );
  expect(validation.errors).toContain(
    "manifest.dieSeeds[0].home.zoneId: Die seed 'die-a' requires perPlayer scope because zone 'scout-hand' has scope 'perPlayer'. Use perPlayer scope to resolve the player-scoped destination.",
  );
});

test("validateManifestAuthoring accepts player-scoped seed homes with perPlayer scope", () => {
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
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "camp" }],
        relations: [],
      },
    ],
    pieceTypes: [{ id: "meeple", name: "Meeple" }],
    pieceSeeds: [
      {
        id: "worker-a",
        typeId: "meeple",
        scope: "perPlayer",
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
        scope: "perPlayer",
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
        id: "market",
        name: "Market",
        defaultHome: { type: "detached" },
        cardSchema: { type: "object", properties: {}, required: [] },
        cards: [
          {
            id: "scout",
            cardType: "scout",
            name: "Scout",
            count: 1,
            home: { type: "zone", zoneId: "player-hand" },
            properties: {},
          },
          {
            id: "camp",
            cardType: "camp",
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
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "camp" }],
        relations: [],
      },
    ],
  });

  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[0].home.zoneId: Card 'scout' cannot target per-player zone 'player-hand' because shared card inventory has no replication origin. Place it during reducer setup instead.",
  );
  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[1].home.boardId: Card 'camp' cannot target per-player board 'player-mat' because shared card inventory has no replication origin. Place it during reducer setup instead.",
  );
});

test("validateManifestAuthoring rejects reserved record keys before generation", () => {
  const validation = validateManifestAuthoring({
    ...BASE_MANIFEST,
    cardSets: [
      {
        id: "unsafe-cards",
        name: "Unsafe Cards",
        defaultHome: { type: "detached" },
        cardSchema: {
          type: "object",
          properties: {
            prototype: { type: "string" },
            nested: {
              type: "object",
              properties: { constructor: { type: "integer" } },
              required: ["constructor"],
            },
          },
          required: ["prototype", "nested"],
        },
        cards: [
          {
            id: "__proto__",
            cardType: "unsafe",
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
      },
    ],
    pieceTypes: [{ id: "worker", name: "Worker" }],
    pieceSeeds: [{ id: "__proto__", typeId: "worker" }],
  });

  expect(validation.errors).toContain(
    "manifest.cardSets[0].cards[0].id: '__proto__' is reserved and cannot be used as a generated record key.",
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
    "manifest.cardSets[0].cardSchema.properties.prototype: 'prototype' is reserved and cannot be used as a generated record key.",
  );
  expect(validation.errors).toContain(
    "manifest.cardSets[0].cardSchema.properties.nested.properties.constructor: 'constructor' is reserved and cannot be used as a generated record key.",
  );
});

test.each([
  [
    "card-ref:sha256:0000000000000000000000000000000000000000000000000000000000000000",
    1,
  ],
  ["card-ref:invalid", 2],
] as const)("card id %s reserves the concealed-card namespace", (id, count) => {
  const manifest: GameTopologyManifest = {
    ...BASE_MANIFEST,
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        defaultHome: { type: "detached" },
        cardSchema: { type: "object", properties: {}, required: [] },
        cards: [{ id, name: id, cardType: "cards", count, properties: {} }],
      },
    ],
  };
  expect(validateManifestAuthoring(manifest).errors).toContain(
    `manifest.cardSets[0].cards[0].id: The 'card-ref:' prefix is reserved for concealed card positions.`,
  );
  expect(() => compileManifest(manifest)).toThrow(
    "'card-ref:' prefix is reserved",
  );
});

test("distinct literal ids remain distinct when their old handles matched", () => {
  const manifest = {
    ...BASE_MANIFEST,
    cardSets: [
      {
        id: "market",
        name: "Market",
        defaultHome: { type: "detached" },
        cardSchema: { type: "object", properties: {}, required: [] },
        cards: [
          {
            id: "foo-bar",
            cardType: "foo-bar",
            name: "Foo Bar",
            count: 1,
            properties: {},
          },
          {
            id: "foo_bar",
            cardType: "foo_bar",
            name: "Foo Bar 2",
            count: 1,
            properties: {},
          },
        ],
      },
    ],
    zones: [
      { id: "draw-zone", name: "Draw Zone", scope: "shared" },
      { id: "draw_zone", name: "Draw Zone 2", scope: "shared" },
    ],
  } satisfies GameTopologyManifest;

  expect(validateManifestAuthoring(manifest).errors).toEqual([]);
  const compiled = compileManifest(manifest);
  const table = compiled.createInitialTable({
    playerIds: ["player-1", "player-2"],
  });
  expect(Object.keys(table.cards)).toEqual(["foo-bar", "foo_bar"]);
  expect(Object.keys(table.zones)).toEqual(["draw-zone", "draw_zone"]);
  expect(compiled.ids.cardId.safeParse("foo-bar").success).toBe(true);
  expect(compiled.ids.cardId.safeParse("foo_bar").success).toBe(true);
});

test("the same tile category may be used on multiple boards without global aliases", () => {
  const compiled = compileManifest({
    ...BASE_MANIFEST,
    boards: [
      { id: "alpha", name: "Alpha", layout: "hex", scope: "shared" },
      { id: "beta", name: "Beta", layout: "hex", scope: "shared" },
    ],
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "hex",
        cells: [{ id: "a", typeId: "site", at: { q: 0, r: 0 } }],
        edges: [{ cellId: "a", side: 0, typeId: "route" }],
      },
    ],
    tileSeeds: [
      {
        id: "a",
        typeId: "terrain",
        home: {
          type: "board",
          boardId: "alpha",
          layout: "hex",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
      {
        id: "b",
        typeId: "terrain",
        home: {
          type: "board",
          boardId: "beta",
          layout: "hex",
          q: 0,
          r: 0,
          rotation: 0,
        },
      },
    ],
  } as const);
  expect(compiled.tileDefinitions.terrain.cells[0].typeId).toBe("site");
  expect(compiled.tileDefinitions.terrain.edges[0].typeId).toBe("route");
  expect(compiled.createInitialTable({ playerIds: [] }).boards).toEqual({
    alpha: { baseId: "alpha", visibility: "public", relations: [] },
    beta: { baseId: "beta", visibility: "public", relations: [] },
  });
});
