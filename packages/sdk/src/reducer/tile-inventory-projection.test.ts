import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createGame,
  createReducerBundle,
  compileManifest,
  defineTopologyManifest,
  parseTopologyManifestJson,
} from "../reducer.js";
import { createGameInstance } from "../headless/instance.js";
import { localSource } from "../testing/sources/local-source.js";
import { HostToPluginEnvelopeSchema } from "../shared/protocol/schema.js";
import { computePluginActionSetVersion } from "../shared/protocol/digest.js";
import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "../shared/protocol/protocol.js";
import type { RuntimeTableRecord } from "./model.js";
import { createTableQueries } from "./table-queries.js";
import {
  dealComponentsInPlace,
  moveComponentToZoneInPlace,
} from "./table/card-mutations.js";
import {
  moveComponentToSpaceInPlace,
  moveComponentToEdgeInPlace,
  moveComponentToVertexInPlace,
} from "./table/component-mutations.js";

const manifest = {
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "stock" },
      cards: [
        {
          id: "ace",
          count: 1,
          cardType: "cards",
          name: "Ace",
          properties: {},
          frontImage: "assets/ace.webp",
          backImage: "assets/back.webp",
        },
      ],
    },
  ],
  pieceTypes: [{ id: "worker", name: "Worker" }],
  pieceSeeds: [
    { id: "pawn", typeId: "worker", home: { type: "zone", zoneId: "stock" } },
  ],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    { id: "die", typeId: "d6", home: { type: "zone", zoneId: "stock" } },
  ],
  tileTypes: [
    {
      id: "forest-face",
      name: "Forest face",
      layout: "hex",
      cells: [{ id: "cell", at: { q: 0, r: 0 } }],
      propertiesSchema: z.object({ note: z.string().default("instance-only") }),
      frontImage: "assets/forest.webp",
    },
  ],
  tileSeeds: [
    {
      id: "forest-instance",
      typeId: "forest-face",
      home: { type: "zone", zoneId: "stock" },
    },
  ],
  zones: [
    { id: "stock", name: "Stock", scope: "shared", visibility: "public" },
    { id: "discard", name: "Discard", scope: "shared", visibility: "public" },
    { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
    { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
    {
      id: "cargo",
      name: "Cargo",
      attachedTo: { pieceType: "worker" },
      visibility: "ownerOnly",
    },
    {
      id: "vault",
      name: "Vault",
      attachedTo: { dieType: "d6" },
      visibility: "hidden",
    },
  ],
  boards: [
    {
      id: "map",
      name: "Map",
      scope: "shared",
      layout: "hex",
      shape: { kind: "hexagon", radius: 0 },
    },
  ],
} as const;

function setup() {
  const compiled = compileManifest(manifest);
  // Broad runtime admission is intentional: invalid spatial tile calls cannot
  // originate from the exact authored API, but must still reject before writes.
  const table: RuntimeTableRecord = compiled.createInitialTable({
    playerIds: ["player-1", "player-2"],
  });
  // Nonpublic cargo remains unsupported even when its host has a seated owner.
  table.pieces.pawn.ownerId = "player-1";
  table.dice.die.ownerId = "player-1";
  return { compiled, table };
}
function game() {
  const model = createGame({
    manifest,
    phases: { play: z.object({}) },
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = model.phase("play");
  return model.assemble({
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        interactions: {},
      }),
    },
    view: model.view(() => ({})),
  });
}
const privateHomes = [
  { zoneId: "bag" },
  { zoneId: "hand" },
  { zoneId: "cargo", component: "pawn" },
  { zoneId: "vault", component: "die" },
] as const;
const privateDestinations = [
  { zoneId: "bag", hostId: "table" },
  { zoneId: "hand", hostId: "player-1" },
  { zoneId: "cargo", hostId: "pawn" },
  { zoneId: "vault", hostId: "die" },
] as const;

describe("tile inventory projection boundary", () => {
  test("mixed public inventory remains ordered while the UI facade presents only cards", async () => {
    const definition = game();
    const source = await localSource(definition, { players: 2, seed: 1 });
    const instance = createGameInstance<typeof definition>()({ source });
    try {
      const admitted = definition.contract.manifest.tableSchema.parse(
        source.checkpoint().state.domain.table,
      );
      expect(admitted.zones.stock.table).toHaveLength(4);
      expect(admitted.zones.stock.table).toEqual(
        expect.arrayContaining(["ace", "pawn", "die", "forest-instance"]),
      );
      expect(instance.zones.get("stock", "table").count).toBe(1);
      expect(
        instance.zones
          .get("stock", "table")
          .getCards()
          .map((card) => card.id),
      ).toEqual(["ace"]);
      const { compiled, table } = setup();
      moveComponentToZoneInPlace({
        table,
        definitions: compiled,
        componentId: "forest-instance",
        to: { zoneId: "stock", hostId: "table" },
        position: "top",
      });
      const before = [...table.zones.stock.table];
      const q = createTableQueries(table, compiled);
      expect(q.zone("stock", "table")).toEqual(before);
      expect(q.tile("forest-instance")).toMatchObject({
        id: "forest-instance",
        tileTypeId: "forest-face",
        properties: { note: "instance-only" },
      });
      dealComponentsInPlace({
        table,
        definitions: compiled,
        from: { zoneId: "stock", hostId: "table" },
        to: { zoneId: "discard", hostId: "table" },
        count: 2,
      });
      expect(q.zone("discard", "table")).toEqual(before.slice(0, 2));
      expect(q.zone("stock", "table")).toEqual(before.slice(2));
    } finally {
      instance.dispose();
      source.dispose();
    }
  });

  test.each(privateHomes)(
    "rejects a tile's nonpublic initial home: $zoneId",
    (home) => {
      expect(() =>
        compileManifest(
          parseTopologyManifestJson({
            ...defineTopologyManifest(manifest),
            tileSeeds: [
              {
                id: "forest-instance",
                typeId: "forest-face",
                scope: "perPlayer",
                home: { type: "zone", ...home },
              },
            ],
          }),
        ),
      ).toThrow(
        /manifest\.tileSeeds\[0\]\.home: Tile inventory requires a public zone/,
      );
    },
  );

  test.each(privateDestinations)(
    "rejects nonpublic movement and mixed dealing atomically: $zoneId",
    (to) => {
      const { compiled, table } = setup();
      const before = structuredClone(table);
      expect(() =>
        moveComponentToZoneInPlace({
          table,
          definitions: compiled,
          componentId: "forest-instance",
          to,
        }),
      ).toThrow("Tiles require public zone destinations");
      expect(table).toEqual(before);
      // A valid card precedes the tile so rejection cannot leave a moved prefix.
      moveComponentToZoneInPlace({
        table,
        definitions: compiled,
        componentId: "ace",
        to: { zoneId: "stock", hostId: "table" },
        position: "top",
      });
      moveComponentToZoneInPlace({
        table,
        definitions: compiled,
        componentId: "forest-instance",
        to: { zoneId: "stock", hostId: "table" },
        position: 1,
      });
      const beforeDeal = structuredClone(table);
      expect(() =>
        dealComponentsInPlace({
          table,
          definitions: compiled,
          from: { zoneId: "stock", hostId: "table" },
          to,
          count: 2,
        }),
      ).toThrow("Tiles require public zone destinations");
      expect(table).toEqual(beforeDeal);
    },
  );

  test("rejects every non-tile spatial location before unlinking inventory", () => {
    const { compiled, table } = setup();
    const board = table.boards.hex.map;
    // Keep actual tiled layout evidence while admitting a dynamic component ID.
    const tiledTable = {
      ...table,
      boards: { ...table.boards, byId: table.boards.hex },
    };
    const before = structuredClone(table);
    const attempts = [
      () =>
        moveComponentToSpaceInPlace(
          table,
          "forest-instance",
          "map",
          "0,0",
          compiled,
        ),
      () =>
        moveComponentToEdgeInPlace(
          tiledTable,
          "forest-instance",
          "map",
          board.edges[0].id,
          compiled,
        ),
      () =>
        moveComponentToVertexInPlace(
          tiledTable,
          "forest-instance",
          "map",
          board.vertices[0].id,
          compiled,
        ),
    ];
    for (const attempt of attempts) {
      expect(attempt).toThrow(/Tiles cannot use spatial component locations/);
      expect(table).toEqual(before);
    }
  });

  test("static, seat and UI bridge payloads do not automatically carry tile assignments", async () => {
    const definition = game();
    const source = await localSource(definition, { players: 2, seed: 1 });
    try {
      const bundle = createReducerBundle(definition);
      const payloads: unknown[] = [
        bundle.boardStatic(),
        bundle.project({
          state: source.checkpoint().state,
          playerIds: ["player-1", "player-2"],
        }),
      ];
      for (const playerId of ["player-1", "player-2"]) {
        source.switchSeat(playerId);
        const snapshot = source.inspect();
        payloads.push(
          HostToPluginEnvelopeSchema.parse({
            protocol: DREAMBOARD_PLUGIN_PROTOCOL,
            version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
            channelId: "tile-proof",
            sequence: 1,
            payload: {
              type: "gameplay.frame",
              frame: {
                ...snapshot.frame,
                basis: {
                  version: snapshot.version,
                  perspectivePlayerId: playerId,
                  actionSetVersion: computePluginActionSetVersion({
                    version: snapshot.version,
                    availableInteractions: snapshot.frame.availableInteractions,
                  }),
                },
              },
            },
          }),
        );
      }
      for (const payload of payloads) {
        const serialized = JSON.stringify(payload);
        for (const secret of [
          "tileSeeds",
          "tileTypes",
          "forest-instance",
          "forest-face",
          "instance-only",
          "forest.webp",
        ])
          expect(serialized).not.toContain(secret);
      }
    } finally {
      source.dispose();
    }
  });
});
