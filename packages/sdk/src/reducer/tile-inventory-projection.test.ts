import { createSeatDisclosure } from "./bundle/trusted/tile-disclosure.js";
import { testReferenceBasis } from "../shared/__fixtures__/reference-basis.js";
import { boardEdgeId, boardVertexId } from "../shared/domain/board-element.js";
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
  // Attached cargo resolves its current host owner.
  table.pieces.pawn.ownerId = "player-1";
  table.dice.die.ownerId = "player-1";
  return { compiled, table };
}
function game(privateTiles = false) {
  const model = createGame({
    manifest: compileManifest(
      privateTiles
        ? {
            ...manifest,
            tileSeeds: manifest.tileSeeds.map((tile) => ({
              ...tile,
              disclosure: {
                face: { audience: "none" as const },
                appearance: { layout: "hex" as const, cells: [{ q: 0, r: 0 }] },
              },
            })),
          }
        : manifest,
    ),
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
  test("mixed public inventory remains ordered while the UI facade presents cards and tiles", async () => {
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
      expect(instance.zones.get("stock", "table").count).toBe(2);
      expect(instance.zones.get("stock", "table").getTiles()).toHaveLength(1);
      expect(
        instance.zones.get("stock", "table").getTiles()[0].data,
      ).toMatchObject({
        disclosure: "visible",
        tileTypeId: "forest-face",
      });
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
    "admits a private initial home and projects only its location audience: $zoneId",
    (home) => {
      const parsed = parseTopologyManifestJson({
        ...defineTopologyManifest(manifest),
        tileSeeds: [
          {
            id: "forest-instance",
            typeId: "forest-face",
            scope: "perPlayer",
            home: { type: "zone", ...home },
          },
        ],
      });
      const compiled = compileManifest(parsed);
      const table = compiled.createInitialTable({
        playerIds: ["player-1", "player-2"],
      });
      expect(Object.values(table.tiles)).toHaveLength(2);
      const own = createSeatDisclosure(
        table,
        compiled,
        "player-1",
        testReferenceBasis,
      );
      const ownVisible = own.zones
        .flatMap((zone) => zone.tiles)
        .filter((tile) => tile.disclosure === "visible");
      expect(ownVisible).toHaveLength(home.zoneId === "hand" ? 1 : 0);
      for (const tile of Object.values(table.tiles))
        expect(table.componentLocations[tile.id]).toMatchObject({
          type: "InZone",
          zoneId: home.zoneId,
        });
    },
  );

  test.each(privateDestinations)(
    "moves and deals mixed inventory into private locations atomically: $zoneId",
    (to) => {
      const { compiled, table } = setup();
      moveComponentToZoneInPlace({
        table,
        definitions: compiled,
        componentId: "forest-instance",
        to,
      });
      expect(table.componentLocations["forest-instance"]).toMatchObject({
        type: "InZone",
        ...to,
      });
      expect(table.zones[to.zoneId][to.hostId]).toContain("forest-instance");
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
      const before = [...table.zones.stock.table];
      dealComponentsInPlace({
        table,
        definitions: compiled,
        from: { zoneId: "stock", hostId: "table" },
        to,
        count: 2,
      });
      expect(table.zones[to.zoneId][to.hostId]).toEqual(before.slice(0, 2));
      expect(table.zones.stock.table).toEqual(before.slice(2));
      const own = createSeatDisclosure(
        table,
        compiled,
        "player-1",
        testReferenceBasis,
      );
      const visible = own.tile("forest-instance")?.disclosure;
      expect(visible).toBe(
        ["hand", "cargo"].includes(to.zoneId) ? "visible" : undefined,
      );
      expect(
        createSeatDisclosure(
          table,
          compiled,
          "player-2",
          testReferenceBasis,
        ).tile("forest-instance"),
      ).toBeNull();
    },
  );

  test("rejects every non-tile spatial location before unlinking inventory", () => {
    const { compiled, table } = setup();
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
          table,
          "forest-instance",
          "map",
          boardEdgeId("hex", "map", "100,100:e0"),
          compiled,
        ),
      () =>
        moveComponentToVertexInPlace(
          table,
          "forest-instance",
          "map",
          boardVertexId("hex", "map", "100,100:v0"),
          compiled,
        ),
    ];
    for (const attempt of attempts) {
      expect(attempt).toThrow(/Tiles cannot use spatial component locations/);
      expect(table).toEqual(before);
    }
  });

  test("held tile assignments stay out of seat and UI bridge payloads", async () => {
    const definition = game(true);
    const source = await localSource(definition, { players: 2, seed: 1 });
    try {
      const bundle = createReducerBundle(definition);
      const payloads: unknown[] = [
        bundle.project({
          referenceBasis: testReferenceBasis,
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
                  sessionId: testReferenceBasis.sessionId,
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
