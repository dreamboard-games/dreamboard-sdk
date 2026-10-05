import { ref, FIELD_REF_KEY } from "./field-schemas.js";
import * as z from "zod";
import { describe, expect, test } from "vitest";
import { compileManifest } from "./compiler";
import { parseTopologyManifestJson } from "./parse-json";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";

const source = {
  players: { minPlayers: 1, maxPlayers: 4 },
  zones: [
    {
      id: "supply",
      name: "Supply",
      scope: "perPlayer",
      visibility: "public",
      allowedCardSetIds: ["cards"],
    },
    {
      id: "shared",
      name: "Shared",
      scope: "shared",
      allowedCardSetIds: ["cards"],
    },
  ],
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "supply" },
      cards: [
        {
          id: "starter",
          name: "Starter",
          cardType: "standard",
          count: 2,
          scope: "perPlayer",
          properties: {},
        },
      ],
    },
  ],
  pieceTypes: [
    { id: "trail", name: "Trail" },
    { id: "holder", name: "Holder", slots: [{ id: "cargo" }] },
  ],
  pieceSeeds: [
    {
      id: "trail",
      typeId: "trail",
      count: 10,
      scope: "perPlayer",
      home: { type: "zone", zoneId: "supply" },
    },
    { id: "shared-piece", typeId: "trail" },
    { id: "holder", typeId: "holder", scope: "perPlayer" },
  ],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [
    {
      id: "die",
      typeId: "d6",
      scope: "perPlayer",
      home: {
        type: "slot",
        host: { kind: "piece", id: "holder" },
        slotId: "cargo",
      },
    },
  ],
  boards: [
    {
      id: "mat",
      name: "Mat",
      layout: "generic",
      scope: "perPlayer",
      spaces: [{ id: "home" }],
    },
  ],
} as const;

describe("per-player inventory", () => {
  test.each([3, 4])(
    "expands one inventory per actual seat (%i players)",
    (count) => {
      const compiled = compileManifest(source);
      const playerIds = ["north:one", 'south/"two"', "東", "@db/seat"].slice(
        0,
        count,
      );
      const table = compiled.createInitialTable({ playerIds });
      expect(Object.keys(table.cards)).toHaveLength(count * 2);
      expect(Object.keys(table.pieces)).toHaveLength(count * 11 + 1);
      expect(Object.keys(table.dice)).toHaveLength(count);
      expect(Object.keys(table.boards.byId)).toHaveLength(count);
      expect(table.pieces["shared-piece"].ownerId).toBeNull();
      for (const playerId of playerIds) {
        const pieceId = perPlayerInstanceId("piece", "trail-3", playerId);
        expect(table.pieces[pieceId].ownerId).toBe(playerId);
        expect(table.componentLocations[pieceId]).toEqual({
          type: "InZone",
          zoneId: "supply",
          hostId: playerId,
          playedBy: null,
        });
        expect(
          table.zones.supply[compiled.ids.playerId.parse(playerId)],
        ).toHaveLength(12);
        const dieId = perPlayerInstanceId("die", "die", playerId);
        expect(table.componentLocations[dieId]).toMatchObject({
          type: "InSlot",
          host: {
            kind: "piece",
            id: perPlayerInstanceId("piece", "holder", playerId),
          },
          slotId: "cargo",
        });
        expect(
          table.boards.byId[perPlayerInstanceId("board", "mat", playerId)]
            .playerId,
        ).toBe(playerId);
      }
      expect(compiled.tableSchema.safeParse(table).success).toBe(true);
      expect(
        Object.keys(compiled.records.pieceIds(() => 0, { playerIds })),
      ).toEqual(Object.keys(table.pieces));
      expect(compiled.literals.pieceIds).toEqual(["shared-piece"]);
      expect(Object.keys(compiled.staticBoards.byId)).toEqual([]);
    },
  );

  test("declared identity syntax and live roster membership are separate", () => {
    const compiled = compileManifest(source);
    const foreign = perPlayerInstanceId("piece", "trail-3", "absent");
    expect(compiled.ids.pieceId.safeParse(foreign).success).toBe(true);
    expect(
      compiled.ids.pieceId.safeParse(
        perPlayerInstanceId("die", "trail-3", "north"),
      ).success,
    ).toBe(false);
    expect(
      compiled.ids.pieceId.safeParse(
        perPlayerInstanceId("piece", "trail-11", "north"),
      ).success,
    ).toBe(false);
    const table = compiled.createInitialTable({ playerIds: ["north"] });
    const data = table.pieces[perPlayerInstanceId("piece", "trail-3", "north")];
    const forged = {
      ...table,
      pieces: { ...table.pieces, [foreign]: { ...data, id: foreign } },
    };
    expect(compiled.tableSchema.safeParse(forged).success).toBe(false);
    const tampered = structuredClone(table);
    tampered.boards.byId[
      perPlayerInstanceId("board", "mat", "north")
    ].playerId = compiled.ids.playerId.parse("absent");
    expect(compiled.tableSchema.safeParse(tampered).success).toBe(false);
  });

  test("reserved authored namespace and authored audiences are rejected", () => {
    for (const patch of [
      { id: '@db/["piece","x","north"]' },
      { ownerId: "north" },
      { visibility: { visibleTo: ["north"] } },
    ])
      expect(() =>
        parseTopologyManifestJson({
          players: { minPlayers: 1, maxPlayers: 2 },
          cardSets: [],
          pieceTypes: [{ id: "x", name: "X" }],
          pieceSeeds: [{ id: "x", typeId: "x", ...patch }],
        }),
      ).toThrow();
  });
});

test("table admission rejects invalid roster and dependent identity maps without throwing", () => {
  const compiled = compileManifest(source);
  const table = compiled.createInitialTable({ playerIds: ["north"] });
  for (const playerIds of [["north", "north"], [""], ["__proto__"]])
    expect(() => compiled.records.pieceIds(0, { playerIds })).toThrow();
  for (const playerOrder of [["north", "north"], [""], ["south"], [42]])
    expect(
      compiled.tableSchema.safeParse({ ...table, playerOrder }).success,
    ).toBe(false);
  const foreign = perPlayerInstanceId("card", "starter-1", "absent");
  expect(
    compiled.tableSchema.safeParse({
      ...table,
      ownerOfCard: { ...table.ownerOfCard, [foreign]: null },
    }).success,
  ).toBe(false);
  expect(
    compiled.tableSchema.safeParse({
      ...table,
      visibility: { ...table.visibility, [foreign]: { faceUp: true } },
    }).success,
  ).toBe(false);
  expect(
    compiled.tableSchema.safeParse({ ...table, ownerOfCard: {} }).success,
  ).toBe(false);
  expect(
    compiled.tableSchema.safeParse({ ...table, visibility: {} }).success,
  ).toBe(false);
  const id = perPlayerInstanceId("piece", "trail-1", "north");
  expect(
    compiled.tableSchema.safeParse({
      ...table,
      componentLocations: {
        ...table.componentLocations,
        [id]: {
          type: "OnSpace",
          boardId: perPlayerInstanceId("board", "mat", "absent"),
          spaceId: "home",
        },
      },
    }).success,
  ).toBe(false);
});

test("manifest defaults admit declared future instances, then the actual session roster", () => {
  const futurePiece = perPlayerInstanceId("piece", "trail-3", "future:seat");
  const futureCard = perPlayerInstanceId("card", "starter-1", "future:seat");
  const sharedBoard = {
    id: "public-board",
    name: "Public",
    layout: "generic",
    scope: "shared",
    spaces: [],
    boardFieldsSchema: z.object({
      nested: z
        .object({ selected: ref.pieceId() })
        .default({ selected: ref.pieceId().parse(futurePiece) }),
      many: z.array(ref.cardId()).default([ref.cardId().parse(futureCard)]),
      byName: z
        .record(z.string(), ref.pieceId())
        .default({ [FIELD_REF_KEY]: ref.pieceId().parse(futurePiece) }),
      data: z
        .object({ [FIELD_REF_KEY]: z.string() })
        .default({ [FIELD_REF_KEY]: "ordinary data" }),
    }),
  } as const;
  const compiled = compileManifest({
    ...source,
    boards: [...source.boards, sharedBoard],
  });
  const table = compiled.createInitialTable({ playerIds: ["future:seat"] });
  expect(table.boards.byId["public-board"].fields.data).toEqual({
    [FIELD_REF_KEY]: "ordinary data",
  });
  expect(compiled.tableSchema.safeParse(table).success).toBe(true);
  expect(() =>
    compiled.createInitialTable({ playerIds: ["absent"] }),
  ).toThrow();
  expect(() => compiled.createInitialTable({ playerIds: [] })).toThrow();
  for (const invalid of [
    perPlayerInstanceId("die", "trail-3", "future:seat"),
    perPlayerInstanceId("piece", "trail-11", "future:seat"),
    '@db/[ "piece","trail-3","future:seat"]',
  ])
    expect(() =>
      compileManifest({
        ...source,
        boards: [
          {
            ...sharedBoard,
            boardFieldsSchema: z.object({
              selected: ref.pieceId().default(ref.pieceId().parse(invalid)),
            }),
          },
        ],
      }),
    ).toThrow(/declared pieceId reference/);
});

test("replicated slot ordering uses each resolved host independently", () => {
  const compiled = compileManifest({
    ...source,
    cardSets: [
      {
        ...source.cardSets[0],
        defaultHome: {
          type: "slot",
          host: { kind: "piece", id: "holder" },
          slotId: "cargo",
        },
      },
    ],
  });
  const table = compiled.createInitialTable({ playerIds: ["north", "south"] });
  for (const playerId of ["north", "south"])
    for (const ordinal of [1, 2] as const) {
      const card = perPlayerInstanceId("card", `starter-${ordinal}`, playerId);
      expect(table.componentLocations[card]).toEqual({
        type: "InSlot",
        host: {
          kind: "piece",
          id: perPlayerInstanceId("piece", "holder", playerId),
        },
        slotId: "cargo",
        position: ordinal - 1,
      });
    }
});
