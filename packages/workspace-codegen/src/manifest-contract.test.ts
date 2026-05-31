import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "bun:test";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import {
  generateManifestContractSource,
  generateManifestContractSources,
} from "./manifest-contract.js";

const require = createRequire(import.meta.url);
const tscBin = require.resolve("typescript/bin/tsc");
const workspaceCodegenRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(import.meta.dir, "../../..");
const workspaceCodegenNodeModulesRoot = path.join(
  workspaceCodegenRoot,
  "node_modules",
);
const appSdkPackageRoot = path.join(repoRoot, "packages/app-sdk");
const sdkTypesPackageRoot = path.join(repoRoot, "packages/sdk-types");

const TEST_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 4,
    optimalPlayers: 3,
  },
  cardSets: [
    {
      type: "manual",
      id: "standard-deck",
      name: "Standard Deck",
      cardSchema: {
        properties: {
          value: {
            type: "integer",
            description: "Card value",
          },
          note: {
            type: "string",
            description: "Optional note",
            optional: true,
            nullable: true,
          },
          scoreByPlayer: {
            type: "record",
            description: "Scores by player",
            values: {
              type: "integer",
              description: "Player score",
            },
          },
        },
      },
      cards: [
        {
          type: "CARD_A",
          name: "Card A",
          count: 1,
          properties: {
            value: 1,
            note: null,
            scoreByPlayer: {
              "player-1": 2,
            },
          },
        },
      ],
    },
  ],
  zones: [
    {
      id: "draw-deck",
      name: "Draw Deck",
      scope: "shared",
      allowedCardSetIds: ["standard-deck"],
    },
    {
      id: "main-hand",
      name: "Main Hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["standard-deck"],
    },
  ],
  boardTemplates: [],
  boards: [
    {
      id: "track-board",
      name: "Track Board",
      layout: "generic",
      typeId: "track",
      scope: "shared",
      boardFieldsSchema: {
        properties: {
          roundMarker: {
            type: "integer",
            description: "Round marker index",
          },
          notes: {
            type: "record",
            description: "Board notes",
            optional: true,
            values: {
              type: "string",
              description: "Board note",
            },
          },
        },
      },
      spaceFieldsSchema: {
        properties: {
          bonusByPlayer: {
            type: "record",
            description: "Bonus by player",
            values: {
              type: "integer",
              description: "Bonus amount",
            },
          },
          labelOverride: {
            type: "string",
            description: "Optional override label",
            optional: true,
            nullable: true,
          },
        },
      },
      relationFieldsSchema: {
        properties: {
          cost: {
            type: "integer",
            description: "Movement cost",
            optional: true,
          },
        },
      },
      containerFieldsSchema: {
        properties: {
          displaySize: {
            type: "integer",
            description: "Display size",
          },
          featuredByPlayer: {
            type: "record",
            description: "Featured markers by player",
            optional: true,
            values: {
              type: "boolean",
              description: "Whether featured",
            },
          },
        },
      },
      fields: {
        roundMarker: 1,
      },
      spaces: [
        {
          id: "space-a",
          typeId: "worker-space",
          fields: {
            bonusByPlayer: {
              "player-1": 2,
            },
            labelOverride: null,
          },
        },
      ],
      relations: [
        {
          typeId: "adjacent",
          fromSpaceId: "space-a",
          toSpaceId: "space-a",
          directed: false,
          fields: {
            cost: 1,
          },
        },
      ],
      containers: [
        {
          id: "market-row",
          name: "Market Row",
          host: {
            type: "board",
          },
          allowedCardSetIds: ["standard-deck"],
          fields: {
            displaySize: 3,
          },
        },
      ],
    },
    {
      id: "hex-map",
      name: "Hex Map",
      layout: "hex",
      typeId: "map",
      scope: "shared",
      orientation: "pointy-top",
      spaceFieldsSchema: {
        properties: {
          richness: {
            type: "integer",
            description: "Space richness",
          },
        },
      },
      edgeFieldsSchema: {
        properties: {
          rate: {
            type: "integer",
            description: "Edge trade rate",
          },
        },
      },
      vertexFieldsSchema: {
        properties: {
          buildCost: {
            type: "integer",
            description: "Vertex build cost",
          },
        },
      },
      spaces: [
        {
          id: "hex-a",
          q: 0,
          r: 0,
          typeId: "forest",
          fields: {
            richness: 3,
          },
        },
        {
          id: "hex-b",
          q: 1,
          r: 0,
        },
        {
          id: "hex-c",
          q: 0,
          r: 1,
        },
      ],
      edges: [
        {
          ref: {
            spaces: ["hex-a", "hex-b"],
          },
          typeId: "three-to-one",
          fields: {
            rate: 3,
          },
        },
      ],
      vertices: [
        {
          ref: {
            spaces: ["hex-a", "hex-b", "hex-c"],
          },
          typeId: "settlement-slot",
          fields: {
            buildCost: 2,
          },
        },
      ],
    },
    {
      id: "square-grid",
      name: "Square Grid",
      layout: "square",
      typeId: "grid",
      scope: "shared",
      relationFieldsSchema: {
        properties: {
          cost: {
            type: "integer",
            description: "Movement cost",
          },
        },
      },
      containerFieldsSchema: {
        properties: {
          capacity: {
            type: "integer",
            description: "Container capacity",
          },
        },
      },
      edgeFieldsSchema: {
        properties: {
          durability: {
            type: "integer",
            description: "Edge durability",
          },
        },
      },
      vertexFieldsSchema: {
        properties: {
          value: {
            type: "integer",
            description: "Vertex value",
          },
        },
      },
      spaces: [
        {
          id: "cell-a1",
          row: 0,
          col: 0,
          typeId: "meadow",
        },
        {
          id: "cell-a2",
          row: 0,
          col: 1,
        },
        {
          id: "cell-b1",
          row: 1,
          col: 0,
        },
        {
          id: "cell-b2",
          row: 1,
          col: 1,
        },
      ],
      relations: [
        {
          id: "portal",
          typeId: "portal",
          fromSpaceId: "cell-a1",
          toSpaceId: "cell-b2",
          directed: false,
          fields: {
            cost: 2,
          },
        },
      ],
      containers: [
        {
          id: "cache",
          name: "Cache",
          host: {
            type: "board",
          },
          fields: {
            capacity: 2,
          },
        },
      ],
      edges: [
        {
          ref: {
            spaces: ["cell-a1", "cell-a2"],
          },
          typeId: "wall-slot",
          fields: {
            durability: 2,
          },
        },
      ],
      vertices: [
        {
          ref: {
            spaces: ["cell-a1", "cell-a2", "cell-b1", "cell-b2"],
          },
          typeId: "crossing",
          fields: {
            value: 1,
          },
        },
      ],
    },
  ],
  pieceTypes: [
    {
      id: "worker",
      name: "Worker",
      fieldsSchema: {
        properties: {
          exhausted: {
            type: "boolean",
            description: "Whether the worker is exhausted",
          },
          ownerScoreByPlayer: {
            type: "record",
            description: "Score by player",
            values: {
              type: "integer",
              description: "Score",
            },
          },
        },
      },
    },
    {
      id: "player-mat",
      name: "Player Mat",
      slots: [{ id: "worker-rest", name: "Worker Rest" }],
    },
  ],
  pieceSeeds: [
    {
      id: "mat-alpha",
      typeId: "player-mat",
    },
    {
      id: "worker-1",
      typeId: "worker",
      fields: {
        exhausted: false,
      },
    },
  ],
  dieTypes: [
    {
      id: "d6",
      name: "D6",
      sides: 6,
      fieldsSchema: {
        properties: {
          icon: {
            type: "string",
            description: "Icon name",
          },
          weightByFace: {
            type: "record",
            description: "Weight by face",
            values: {
              type: "integer",
              description: "Weight",
            },
          },
          note: {
            type: "string",
            description: "Optional note",
            optional: true,
            nullable: true,
          },
        },
      },
    },
    {
      id: "die-holder",
      name: "Die Holder",
      sides: 6,
      slots: [{ id: "staging", name: "Staging" }],
    },
  ],
  dieSeeds: [
    {
      id: "holder-a",
      typeId: "die-holder",
    },
    {
      id: "d6",
      typeId: "d6",
      fields: {
        icon: "pip",
      },
    },
  ],
  resources: [
    {
      id: "coins",
      name: "Coins",
    },
  ],
  setupOptions: [],
  setupProfiles: [],
};

const EMPTY_MANIFEST: GameTopologyManifest = {
  players: {
    minPlayers: 2,
    maxPlayers: 4,
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

async function expectGeneratedContractTypechecks(options: {
  tempPrefix: string;
  manifest: GameTopologyManifest;
  usageSource: string;
}): Promise<void> {
  const tempRoot = await createGeneratedContractTempRoot(options.tempPrefix);
  const source = generateManifestContractSource(options.manifest);

  try {
    const contractPath = path.join(tempRoot, "manifest-contract.ts");
    const usagePath = path.join(tempRoot, "usage.ts");
    await writeFile(contractPath, source, "utf8");
    await writeFile(usagePath, options.usageSource, "utf8");

    const result = Bun.spawnSync({
      cmd: [
        tscBin,
        "--noEmit",
        "--strict",
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "bundler",
        "--skipLibCheck",
        contractPath,
        usagePath,
      ],
      cwd: workspaceCodegenRoot,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (result.exitCode !== 0) {
      const decoder = new TextDecoder();
      throw new Error(
        `Typecheck failed for generated contract fixture\nstdout:\n${decoder.decode(result.stdout)}\nstderr:\n${decoder.decode(result.stderr)}`,
      );
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function withGeneratedContractModule<Result>(options: {
  tempPrefix: string;
  manifest: GameTopologyManifest;
  run: (module: Record<string, any>) => Promise<Result> | Result;
}): Promise<Result> {
  const tempRoot = await createGeneratedContractTempRoot(options.tempPrefix);
  const source = generateManifestContractSource(options.manifest);

  try {
    const contractPath = path.join(tempRoot, "manifest-contract.ts");
    await writeFile(contractPath, source, "utf8");
    const module = (await import(
      `${pathToFileURL(contractPath).href}?t=${Date.now()}`
    )) as Record<string, any>;
    return await options.run(module);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function withGeneratedSplitContractModule<Result>(options: {
  tempPrefix: string;
  manifest: GameTopologyManifest;
  run: (module: Record<string, any>) => Promise<Result> | Result;
}): Promise<Result> {
  const tempRoot = await createGeneratedContractTempRoot(options.tempPrefix);
  const sources = generateManifestContractSources(options.manifest);

  try {
    for (const [relativePath, source] of Object.entries(sources)) {
      await writeFile(path.join(tempRoot, path.basename(relativePath)), source);
    }
    const contractPath = path.join(tempRoot, "manifest-contract.ts");
    const module = (await import(
      `${pathToFileURL(contractPath).href}?t=${Date.now()}`
    )) as Record<string, any>;
    return await options.run(module);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function createGeneratedContractTempRoot(tempPrefix: string) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), tempPrefix));
  const nodeModulesRoot = path.join(tempRoot, "node_modules");
  const scopedRoot = path.join(nodeModulesRoot, "@dreamboard-games");
  await mkdir(scopedRoot, { recursive: true });
  await symlink(
    path.join(workspaceCodegenNodeModulesRoot, "zod"),
    path.join(nodeModulesRoot, "zod"),
    "dir",
  );
  await symlink(
    appSdkPackageRoot,
    path.join(scopedRoot, "app-sdk"),
    "dir",
  );
  await symlink(
    sdkTypesPackageRoot,
    path.join(scopedRoot, "sdk-types"),
    "dir",
  );
  return tempRoot;
}

test("generateManifestContractSource emits typed topology fields and helper literals", () => {
  const source = generateManifestContractSource(TEST_MANIFEST);

  expect(source).toContain("export type TrackBoardBoardFields = {");
  expect(source).toContain('  "roundMarker": number;');
  expect(source).toContain("export type TrackBoardSpaceFields = {");
  expect(source).toContain("export type TrackBoardContainerFields = {");
  expect(source).toContain("export type TrackBoardRelationFields = {");
  expect(source).toContain("export type HexMapSpaceFields = {");
  expect(source).toContain("export type HexMapEdgeFields = {");
  expect(source).toContain("export type HexMapVertexFields = {");
  expect(source).toContain("export type HexAuthoredEdgeRef<");
  expect(source).toContain("export type HexAuthoredEdgeState<");
  expect(source).toContain("export type HexAuthoredVertexRef<");
  expect(source).toContain("export type HexAuthoredVertexState<");
  expect(source).toContain("export type SquareGridRelationFields = {");
  expect(source).toContain("export type SquareGridContainerFields = {");
  expect(source).toContain("export type SquareGridEdgeFields = {");
  expect(source).toContain("export type SquareGridVertexFields = {");
  expect(source).toContain("export type WorkerPieceFields = {");
  expect(source).toContain("export type D6DieFields = {");
  expect(source).toContain(
    'spaceTypeIds: ["forest", "meadow", "worker-space"] as const',
  );
  expect(source).toContain(
    'edgeTypeIds: ["three-to-one", "wall-slot"] as const',
  );
  expect(source).toContain("authoredHexEdges<");
  expect(source).toContain("authoredHexVertices<");
  expect(source).toContain("resolveHexEdgeId<");
  expect(source).toContain("resolveHexVertexId<");
  expect(source).toContain(
    'vertexTypeIds: ["crossing", "settlement-slot"] as const',
  );
  expect(source).toContain('boardTypeIds: ["grid", "map", "track"] as const');
  expect(source).toContain(
    'boardLayouts: ["generic", "hex", "square"] as const',
  );
  expect(source).toContain("const spaceIdsByBoardIdLookup =");
  expect(source).toContain("const spaceTypeIdByBoardIdLookup =");
  expect(source).toContain("const containerIdsByBoardIdLookup =");
  expect(source).toContain("const containerHostByBoardIdLookup =");
  expect(source).toContain(
    'export type BoardSpaceFieldsByBoardId = {\n  "track-board": TrackBoardSpaceFields;',
  );
  expect(source).toContain(
    'export type BoardContainerFieldsByBoardId = {\n  "track-board": TrackBoardContainerFields;',
  );
  expect(source).toContain(
    "export type BoardState<BoardIdValue extends BoardId = BoardId> =",
  );
  expect(source).toContain("export type BoardSpaceStateByBoardId = {");
  expect(source).toContain(
    "export type BoardSpaceFields<BoardIdValue extends BoardId = BoardId> =",
  );
  expect(source).toContain("export type BoardContainerStateByBoardId = {");
  expect(source).toContain(
    "export interface TiledEdgeStateRecord<\n  SpaceIdValue extends SpaceId = SpaceId,\n  EdgeIdValue extends EdgeId = EdgeId,",
  );
  expect(source).toContain("  id: EdgeIdValue;");
  expect(source).toContain(
    "export interface TiledVertexStateRecord<\n  SpaceIdValue extends SpaceId = SpaceId,\n  VertexIdValue extends VertexId = VertexId,",
  );
  expect(source).toContain("  id: VertexIdValue;");
  expect(source).toContain("export type HexEdgeState<");
  expect(source).toContain(
    "export type TiledBoardId = keyof HexBoardStateById | keyof SquareBoardStateById;",
  );
  expect(source).toContain("export type TiledVertexFields<");
  expect(source).toContain('"space-a": "worker-space"');
  expect(source).toContain('"market-row": {\n      "type": "board"');
  expect(source).toContain("const boardIdsByTypeIdLookup =");
  expect(source).toContain("const spaceIdsByTypeIdLookup =");
  expect(source).toContain("const relationTypeIdsByBoardIdLookup =");
  expect(source).toContain("const edgeIdsByTypeIdLookup =");
  expect(source).toContain("const vertexIdsByTypeIdLookup =");
  expect(source).toContain("boardIdsForLayout<");
  expect(source).toContain("boardIdsForType<TypeIdValue");
  expect(source).toContain("spaceKinds<BoardIdValue");
  expect(source).toContain("export const records = {");
  expect(source).toContain("export const idGuards = {");
  expect(source).toContain("expectEdgeId(value: string): EdgeId");
  expect(source).toContain("spaceRecord<");
  expect(source).toContain("isSpaceId<");
  expect(source).toContain("expectSpaceId<");
  expect(source).toContain("edgeRecord<");
  expect(source).toContain("vertexRecord<");
  expect(source).toContain("containerHost<");
  expect(source).toContain("function buildPerPlayerCardIds(");
  expect(source).toContain("export type CardIdsBySharedZoneId = {");
  expect(source).toContain("function buildPlayerResources(");
  expect(source).toContain('from "@dreamboard-games/app-sdk/reducer";');
  expect(source).toContain("export function dealToPlayerZone(options: {");
  expect(source).toContain(
    "export function dealToPlayerBoardContainer(options: {",
  );
  expect(source).toContain(
    "export function seedSharedBoardContainer(options: {",
  );
  expect(source).toContain("export function seedSharedBoardSpace(options: {");
  expect(source).toContain("export function shuffle(");
  expect(source).toContain("createManifestStringLiteralSchema");
  expect(source).toContain(
    "export const runtimeSchema = createManifestRuntimeSchema({",
  );
  expect(source).toContain(
    "componentLocations: z.record(\n    z.string(),\n    z.union([",
  );
  expect(source).toContain('type: z.literal("InSlot")');
  expect(source).toContain('kind: z.literal("piece")');
  expect(source).toContain('id: z.literal("mat-alpha")');
  expect(source).toContain('slotId: z.literal("worker-rest")');
  expect(source).toContain('kind: z.literal("die")');
  expect(source).toContain('id: z.literal("holder-a")');
  expect(source).toContain('slotId: z.literal("staging")');
  expect(source).toContain("zones: (playerIds?: readonly string[]) => ({");
  expect(source).toContain("export const staticBoards =");
  expect(source).toContain(
    "staticBoards: staticBoards as unknown as StaticBoards<TableState>,",
  );
  expect(source).toContain("cardSetIdsByZoneId: cloneManifestDefault(");
  expect(source).toContain(
    'cardSetIdsBySharedZoneId: {\n  "draw-deck": ["standard-deck"] as const,',
  );
  expect(source).toContain("allowedCardSetIds?: readonly CardSetId[];");
  expect(source).not.toContain("export type BoardSpaceId = SpaceId | TileId;");
  expect(source).toContain('layout: z.literal("generic")');
  expect(source).toContain("typeId: ids.relationTypeId");
  expect(source).toContain("export type SquareBoardStateById = {");
  expect(source).toContain("export type CardStateRecord<");
  expect(source).toContain(
    '"CARD_A": CardStateRecord<"CARD_A", "standard-deck", "CARD_A", StandardDeckCardProperties>;',
  );
  expect(source).toContain("name: z.string().optional()");
  expect(source).toContain("text: z.string().optional()");
  expect(source).not.toContain("cardName: z.string().optional()");
  expect(source).not.toContain("description: z.string().optional()");
  expect(source).toContain(
    "const cardPropertiesSchemaByCardSetId: Record<string, z.ZodType<unknown>> = {",
  );
  expect(source).toContain(
    "function createCardStateSchema<CardIdValue extends CardId>(",
  );
  expect(source).toContain(
    "literals.cardIds.map((cardId) => [cardId, createCardStateSchema(cardId)])",
  );
  expect(source).not.toContain("const createStringLiteralSchema = <Values");
  expect(source).not.toContain(
    "function createRuntimeSchema<PhaseNameSchema extends z.ZodTypeAny>(",
  );
  expect(source).not.toContain("export type SpaceFieldsBySpaceId =");
});

test("generateManifestContractSource emits shared home zone literals for card types", () => {
  const source = generateManifestContractSource({
    ...EMPTY_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "market",
        name: "Market",
        cardSchema: { properties: {} },
        cards: [
          {
            type: "coin",
            name: "Coin",
            count: 1,
            home: { type: "zone", zoneId: "coin-supply" },
            properties: {},
          },
          {
            type: "curse",
            name: "Curse",
            count: 1,
            home: { type: "zone", zoneId: "discard" },
            properties: {},
          },
        ],
      },
    ],
    zones: [
      {
        id: "coin-supply",
        name: "Coin Supply",
        scope: "shared",
        allowedCardSetIds: ["market"],
      },
      {
        id: "discard",
        name: "Discard",
        scope: "perPlayer",
        allowedCardSetIds: ["market"],
      },
    ],
  });

  expect(source).toContain(
    'sharedZoneIdsByCardSetId: {\n  "market": ["coin-supply"] as const,',
  );
  expect(source).toContain(
    'homeSharedZoneIdsByCardType: {\n  "coin": ["coin-supply"] as const,\n  "curse": [] as const,',
  );
  expect(source).toContain(
    'homeSharedZoneIdByCardType: {\n  "coin": "coin-supply",',
  );
  expect(source).not.toContain('"curse": "discard"');
});

test("generateManifestContractSource defaults omitted die sides to 6 in createInitialTable", async () => {
  await withGeneratedContractModule({
    tempPrefix: ".tmp-die-default-sides-contract-",
    manifest: {
      players: {
        minPlayers: 2,
        maxPlayers: 4,
        optimalPlayers: 3,
      },
      cardSets: [],
      zones: [],
      boardTemplates: [],
      boards: [],
      pieceTypes: [],
      pieceSeeds: [],
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
      resources: [],
      setupOptions: [],
      setupProfiles: [],
    } satisfies GameTopologyManifest,
    run: (module) => {
      const table = module.createInitialTable({
        playerIds: ["player-1", "player-2"],
      });

      expect(table.dice["d6-a"]).toMatchObject({
        id: "d6-a",
        sides: 6,
      });
    },
  });
});

test("generated createInitialTable keeps shared card homes aligned across decks, zones, and locations", async () => {
  await withGeneratedContractModule({
    tempPrefix: ".tmp-shared-card-home-contract-",
    manifest: {
      players: {
        minPlayers: 2,
        maxPlayers: 4,
        optimalPlayers: 3,
      },
      cardSets: [
        {
          type: "manual",
          id: "market",
          name: "Market",
          cardSchema: { properties: {} },
          cards: [
            {
              type: "coin",
              name: "Coin",
              count: 2,
              home: { type: "zone", zoneId: "coin-supply" },
              properties: {},
            },
            {
              type: "gem",
              name: "Gem",
              count: 2,
              home: { type: "zone", zoneId: "gem-supply" },
              properties: {},
            },
          ],
        },
      ],
      zones: [
        {
          id: "coin-supply",
          name: "Coin Supply",
          scope: "shared",
          allowedCardSetIds: ["market"],
        },
        {
          id: "gem-supply",
          name: "Gem Supply",
          scope: "shared",
          allowedCardSetIds: ["market"],
        },
      ],
      boardTemplates: [],
      boards: [],
      pieceTypes: [],
      pieceSeeds: [],
      dieTypes: [],
      dieSeeds: [],
      resources: [],
      setupOptions: [],
      setupProfiles: [],
    } satisfies GameTopologyManifest,
    run: (module) => {
      const table = module.createInitialTable({
        playerIds: ["player-1", "player-2"],
        shuffleItems: (values: readonly unknown[]) => [...values].reverse(),
      });

      for (const [zoneId, cardType] of [
        ["coin-supply", "coin"],
        ["gem-supply", "gem"],
      ] as const) {
        expect(table.zones.shared[zoneId]).toEqual(table.decks[zoneId]);
        expect(table.zones.shared[zoneId]).toHaveLength(2);
        table.zones.shared[zoneId].forEach(
          (cardId: string, position: number) => {
            expect(table.cards[cardId].cardType).toBe(cardType);
            expect(table.componentLocations[cardId]).toEqual({
              type: "InDeck",
              deckId: zoneId,
              playedBy: null,
              position,
            });
          },
        );
      }
    },
  });
});

test("generateManifestContractSources split runtime module executes generated runtime exports", async () => {
  await withGeneratedSplitContractModule({
    tempPrefix: ".tmp-split-runtime-contract-",
    manifest: TEST_MANIFEST,
    run: (module) => {
      const table = module.createInitialTable({
        playerIds: ["player-1", "player-2"],
      });

      expect(table.playerOrder).toEqual(["player-1", "player-2"]);
      expect(table.zones.shared["draw-deck"]).toEqual(["CARD_A"]);
      expect(table.zones.perPlayer["main-hand"].entries).toEqual([
        ["player-1", []],
        ["player-2", []],
      ]);
      expect(table.boards.byId["track-board"].fields).toEqual({
        roundMarker: 1,
      });

      expect(() => module.tableSchema.parse(table)).not.toThrow();
      expect(() =>
        module.runtimeSchema.parse({
          phaseName: "play",
          playerIds: ["player-1", "player-2"],
          setupProfileId: null,
        }),
      ).not.toThrow();

      const gameStateSchema = module.createGameStateSchema({
        phaseNameSchema: module.ids.phaseName,
        publicSchema: module.ids.resourceId.optional(),
        privateSchema: module.ids.cardId.optional(),
        hiddenSchema: module.ids.boardId.optional(),
        phasesSchema: module.ids.phaseName,
      });
      expect(() =>
        gameStateSchema.parse({
          table,
          public: undefined,
          private: {},
          hidden: undefined,
          flow: {
            currentPhase: "play",
            turn: 0,
            round: 0,
            activePlayers: [],
          },
          phase: "play",
          runtime: {},
        }),
      ).not.toThrow();

      expect(module.manifestContract.defaults.zones).toBeFunction();
      expect(module.manifestContract.createGameStateSchema).toBeFunction();
      expect(
        module.manifestContract.staticBoards.byId["track-board"].layout,
      ).toBe("generic");
      expect(module.default).toBe(module.manifestContract);
    },
  });
});

test("generateManifestContractSource exposes generated static board topology", async () => {
  await withGeneratedContractModule({
    tempPrefix: ".tmp-static-board-contract-",
    manifest: TEST_MANIFEST,
    run: (module) => {
      const hexBoard = module.staticBoards.hex["hex-map"];
      const squareBoard = module.staticBoards.square["square-grid"];

      expect(module.manifestContract.staticBoards.hex["hex-map"]).toEqual(
        hexBoard,
      );
      expect(hexBoard.spaces["hex-a"]).toMatchObject({ q: 0, r: 0 });
      expect(hexBoard.edges).toEqual(module.staticBoards.byId["hex-map"].edges);
      expect(hexBoard.vertices).toEqual(
        module.staticBoards.byId["hex-map"].vertices,
      );
      expect(
        hexBoard.vertices.some((vertex: { spaceIds: readonly string[] }) =>
          ["hex-a", "hex-b", "hex-c"].every((spaceId) =>
            vertex.spaceIds.includes(spaceId),
          ),
        ),
      ).toBe(true);
      expect(squareBoard.edges).toEqual(
        module.staticBoards.byId["square-grid"].edges,
      );
      expect(squareBoard.vertices).toEqual(
        module.staticBoards.byId["square-grid"].vertices,
      );
    },
  });
});

test("generateManifestContractSource typechecks static board topology ids", async () => {
  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-static-board-types-contract-",
    manifest: TEST_MANIFEST,
    usageSource: `import {
  staticBoards,
  type HexEdgeState,
  type HexVertexState,
} from "./manifest-contract";

const hex = staticBoards.hex["hex-map"];
const hexEdge: HexEdgeState<"hex-map"> = hex.edges[0];
const hexVertex: HexVertexState<"hex-map"> = hex.vertices[0];
const hexSpaceId: "hex-a" | "hex-b" | "hex-c" = hex.edges[0].spaceIds[0];
const richness: number = hex.spaces["hex-a"].fields.richness;

const square = staticBoards.square["square-grid"];
const squareEdge = square.edges[0];
const squareSpaceId: "cell-a1" | "cell-a2" | "cell-b1" | "cell-b2" =
  squareEdge.spaceIds[0];

void hexEdge;
void hexVertex;
void hexSpaceId;
void richness;
void squareEdge;
void squareSpaceId;
`,
  });
});

test("generateManifestContractSource renders optional nullable and record schemas", () => {
  const source = generateManifestContractSource(TEST_MANIFEST);

  expect(source).toContain('  "note"?: string | null;');
  expect(source).toContain('  "scoreByPlayer": Record<string, number>;');
  expect(source).toContain('  "labelOverride"?: string | null;');
  expect(source).toContain(
    "export const StandardDeckCardPropertiesSchema = z.object({",
  );
  expect(source).toContain('"note": z.string().nullable().optional()');
  expect(source).toContain("z.record(z.string(), z.number().int())");
});

test("generateManifestContractSource emits variant card property schemas", async () => {
  const manifest: GameTopologyManifest = {
    ...EMPTY_MANIFEST,
    cardSets: [
      {
        type: "manual",
        id: "market-cards",
        name: "Market Cards",
        cardSchema: {
          shared: {
            cost: { type: "integer", optional: true, default: 0 },
          },
          variants: {
            copper: {
              properties: {
                coins: { type: "integer" },
              },
            },
            estate: {
              properties: {
                vp: { type: "integer" },
              },
            },
          },
        },
        cards: [
          {
            type: "copper",
            name: "Copper",
            count: 1,
            properties: { coins: 1 },
          },
          {
            type: "estate",
            name: "Estate",
            count: 1,
            properties: { vp: 1, cost: 2 },
          },
        ],
      },
    ],
    zones: [
      {
        id: "hand",
        name: "Hand",
        scope: "perPlayer",
        visibility: "ownerOnly",
        allowedCardSetIds: ["market-cards"],
      },
    ],
  };

  const source = generateManifestContractSource(manifest);
  expect(source).toContain("export type MarketCardsCopperCardProperties");
  expect(source).toContain('  "coins": number;');
  expect(source).toContain('  "cost": number;');
  expect(source).toContain('"cost": z.number().int().optional().default(0)');
  expect(source).toContain("market-cards:copper");

  await withGeneratedContractModule({
    tempPrefix: ".tmp-variant-card-properties-runtime-",
    manifest,
    run: (module) => {
      const table = module.createInitialTable({
        playerIds: ["player-1", "player-2"],
      });
      expect(table.cards.copper.properties.cost).toBe(0);
    },
  });

  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-variant-card-properties-contract-",
    manifest,
    usageSource: `import { asPlayerId, createTableQueries } from "@dreamboard-games/app-sdk/reducer";
import { createInitialTable } from "./manifest-contract";

const table = createInitialTable({ playerIds: ["player-1", "player-2"] });
const copperCoins: number = table.cards["copper"].properties.coins;
const copperCost: number = table.cards["copper"].properties.cost;
const estateVp: number = table.cards["estate"].properties.vp;

const q = createTableQueries(table);
const cardId = q.zone.playerCards(asPlayerId("player-1"), "hand")[0];
if (cardId) {
  const card = q.card.get(cardId);
  if (card.cardType === "copper") {
    const coins: number = card.properties.coins;
    void coins;
  }
  if (card.cardType === "estate") {
    const vp: number = card.properties.vp;
    void vp;
  }
}

void copperCoins;
void copperCost;
void estateVp;
`,
  });
});

test("generateManifestContractSource preserves enum literal unions inside array items", async () => {
  const manifest = structuredClone(TEST_MANIFEST);
  const manualCardSet = manifest.cardSets?.[0];

  if (!manualCardSet || manualCardSet.type !== "manual") {
    throw new Error("Expected TEST_MANIFEST to include a manual card set.");
  }

  manualCardSet.cardSchema = {
    properties: {
      ...manualCardSet.cardSchema?.properties,
      tags: {
        type: "array",
        optional: true,
        items: {
          type: "enum",
          enums: ["intel", "timed", "public", "secret"],
        },
      },
    },
  };
  manualCardSet.cards = manualCardSet.cards.map((card) => ({
    ...card,
    properties: {
      ...card.properties,
      tags: ["intel"],
    },
  }));

  const source = generateManifestContractSource(manifest);

  expect(source).toContain(
    '  "tags"?: Array<"intel" | "timed" | "public" | "secret">;',
  );

  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-enum-array-contract-",
    manifest,
    usageSource: `import { type StandardDeckCardProperties } from "./manifest-contract";

declare const metadata: StandardDeckCardProperties;

const firstTag: "intel" | "timed" | "public" | "secret" | undefined =
  metadata.tags?.[0];

void firstTag;
`,
  });
});

test("generateManifestContractSource uses safe empty component state maps", () => {
  const source = generateManifestContractSource(EMPTY_MANIFEST);

  expect(source).toContain(
    "export type CardStateById = Record<string, never>;",
  );
  expect(source).toContain(
    "export type PieceStateById = Record<string, never>;",
  );
  expect(source).toContain("export type DieStateById = Record<string, never>;");
  expect(source).not.toContain("function createCardStateSchema<CardIdValue");
});

test("generateManifestContractSource typechecks ergonomic board aliases", async () => {
  const perPlayerManifest: GameTopologyManifest = {
    ...structuredClone(TEST_MANIFEST),
    boards: [
      ...structuredClone(TEST_MANIFEST.boards),
      {
        id: "player-track",
        name: "Player Track",
        layout: "generic",
        scope: "perPlayer",
        spaces: [
          {
            id: "lane-start",
            typeId: "worker-space",
          },
        ],
        relations: [],
        containers: [],
      },
    ],
  };

  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-board-alias-contract-",
    manifest: perPlayerManifest,
    usageSource: `import {
  boardHelpers,
  idGuards,
  literals,
  records,
  type BoardFields,
  type BoardSpaceFields,
  type BoardSpaceState,
  type BoardState,
  type HexAuthoredEdgeRef,
  type HexAuthoredEdgeState,
  type HexAuthoredVertexRef,
  type HexAuthoredVertexState,
  type HexEdgeFields,
  type HexEdgeState,
  type SquareEdgeFields,
  type SquareEdgeState,
  type TiledEdgeState,
  type TiledVertexState,
} from "./manifest-contract";

const sharedBoardId = "track-board" as const;
type SharedBoardState = BoardState<typeof sharedBoardId>;
type SharedBoardFields = BoardFields<typeof sharedBoardId>;
type SharedSpaceState = BoardSpaceState<typeof sharedBoardId>;
type SharedSpaceFields = BoardSpaceFields<typeof sharedBoardId>;
type SharedHexAuthoredEdgeRef = HexAuthoredEdgeRef<"hex-map">;
type SharedHexAuthoredEdgeState = HexAuthoredEdgeState<"hex-map">;
type SharedHexAuthoredVertexRef = HexAuthoredVertexRef<"hex-map">;
type SharedHexAuthoredVertexState = HexAuthoredVertexState<"hex-map">;
type SharedHexEdgeState = HexEdgeState<"hex-map">;
type SharedHexEdgeFields = HexEdgeFields<"hex-map">;
type SharedSquareEdgeState = SquareEdgeState<"square-grid">;
type SharedSquareEdgeFields = SquareEdgeFields<"square-grid">;
type SharedTiledEdgeState = TiledEdgeState<"hex-map">;
type SharedTiledVertexState = TiledVertexState<"square-grid">;
type PerPlayerBoardState = BoardState<"player-track:player-1">;
type PerPlayerSpaceState = BoardSpaceState<"player-track:player-1">;
type PerPlayerSpaceFields = BoardSpaceFields<"player-track:player-1">;

const firstPerPlayerBoardId = boardHelpers.boardIdsForBase("player-track")[0];
const firstPerPlayerSpaceId =
  boardHelpers.spaceIds(firstPerPlayerBoardId)[0];
const perPlayerSpaceType =
  boardHelpers.spaceKinds(firstPerPlayerBoardId)[firstPerPlayerSpaceId];
const authoredHexEdgeRef: SharedHexAuthoredEdgeRef = {
  spaces: ["hex-a", "hex-b"],
};
const authoredHexVertexRef: SharedHexAuthoredVertexRef = {
  spaces: ["hex-a", "hex-b", "hex-c"],
};
const firstHexEdgeState = boardHelpers.authoredHexEdges("hex-map")[0];
const firstHexVertexState = boardHelpers.authoredHexVertices("hex-map")[0];
const firstHexRouteId = boardHelpers.resolveHexEdgeId(
  "hex-map",
  authoredHexEdgeRef,
);
const firstHexSettlementId = boardHelpers.resolveHexVertexId(
  "hex-map",
  authoredHexVertexRef,
);
const edgeOwnerById = records.edgeIds(null);
const vertexOwnerById = records.vertexIds((vertexId) => vertexId);
const squareSpaceLabelById = boardHelpers.spaceRecord("square-grid", (spaceId) =>
  spaceId,
);
const squareContainerStateById = boardHelpers.containerRecord(
  "square-grid",
  false,
);
const squareRelationStateById = boardHelpers.relationTypeRecord(
  "square-grid",
  true,
);
const squareEdgeStateById = boardHelpers.edgeRecord("square-grid", null);
const squareVertexStateById = boardHelpers.vertexRecord("square-grid", null);
const maybeSpaceId = "cell-a1";
if (boardHelpers.isSpaceId("square-grid", maybeSpaceId)) {
  void maybeSpaceId;
}
const ensuredSpaceId = boardHelpers.expectSpaceId("square-grid", "cell-a1");
const ensuredEdgeId = boardHelpers.expectEdgeId(
  "square-grid",
  boardHelpers.edgeIds("square-grid", "wall-slot")[0],
);
const ensuredVertexId = boardHelpers.expectVertexId(
  "square-grid",
  boardHelpers.vertexIds("square-grid", "crossing")[0],
);
const manifestEdgeId = idGuards.expectEdgeId(firstHexRouteId);
if (idGuards.isVertexId(firstHexSettlementId)) {
  void firstHexSettlementId;
}
const firstSquareCheckpointId =
  boardHelpers.vertexIds("square-grid", "crossing")[0];
const hexBoardIds = boardHelpers.boardIdsForLayout("hex");
const genericBoardBaseIds = boardHelpers.boardBaseIdsForLayout("generic");

const squareContainerHost =
  boardHelpers.containerHost("square-grid", "cache");
const authoredHexEdgeRate =
  (null as unknown as SharedHexAuthoredEdgeState).fields.rate;
const authoredHexVertexCost =
  (null as unknown as SharedHexAuthoredVertexState).fields.buildCost;
const hexEdgeRate = (null as unknown as SharedHexEdgeState).fields.rate;
const squareEdgeDurability =
  (null as unknown as SharedSquareEdgeState).fields.durability;
const tiledEdgeRate = (null as unknown as SharedTiledEdgeState).fields.rate;
const tiledVertexValue =
  (null as unknown as SharedTiledVertexState).fields.value;

void literals.boardIds;
void literals.boardTemplateIds;
void perPlayerSpaceType;
void firstHexEdgeState.ref;
void firstHexVertexState.ref;
void firstHexRouteId;
void firstHexSettlementId;
void edgeOwnerById;
void vertexOwnerById;
void squareSpaceLabelById;
void squareContainerStateById;
void squareRelationStateById;
void squareEdgeStateById;
void squareVertexStateById;
void ensuredSpaceId;
void ensuredEdgeId;
void ensuredVertexId;
void manifestEdgeId;
void firstSquareCheckpointId;
void hexBoardIds;
void genericBoardBaseIds;
void boardHelpers.boardBaseIdsForTemplate;
void boardHelpers.boardTemplateLayout;
void squareContainerHost;
void authoredHexEdgeRate;
void authoredHexVertexCost;
void hexEdgeRate;
void squareEdgeDurability;
void tiledEdgeRate;
void tiledVertexValue;
void (null as SharedBoardState | SharedBoardFields | SharedSpaceState | SharedSpaceFields | null);
void (null as SharedHexAuthoredEdgeState | SharedHexAuthoredVertexState | null);
void (null as SharedHexEdgeState | SharedHexEdgeFields | null);
void (null as SharedSquareEdgeState | SharedSquareEdgeFields | null);
void (null as PerPlayerBoardState | PerPlayerSpaceState | PerPlayerSpaceFields | null);
`,
  });
});

test("generated boardHelpers expose authored hex lookups and resolvers", async () => {
  await withGeneratedContractModule({
    tempPrefix: ".tmp-authored-hex-runtime-",
    manifest: TEST_MANIFEST,
    async run(module) {
      const authoredEdges = module.boardHelpers.authoredHexEdges("hex-map");
      const authoredVertices =
        module.boardHelpers.authoredHexVertices("hex-map");

      expect(authoredEdges).toEqual([
        {
          ref: { spaces: ["hex-a", "hex-b"] },
          typeId: "three-to-one",
          fields: { rate: 3 },
        },
      ]);
      expect(authoredVertices).toEqual([
        {
          ref: { spaces: ["hex-a", "hex-b", "hex-c"] },
          typeId: "settlement-slot",
          fields: { buildCost: 2 },
        },
      ]);
      expect(
        module.boardHelpers.resolveHexEdgeId("hex-map", authoredEdges[0]!.ref),
      ).toBe(module.boardHelpers.edgeIds("hex-map", "three-to-one")[0]);
      expect(
        module.boardHelpers.resolveHexVertexId(
          "hex-map",
          authoredVertices[0]!.ref,
        ),
      ).toBe(module.boardHelpers.vertexIds("hex-map", "settlement-slot")[0]);
      expect(() =>
        module.boardHelpers.resolveHexEdgeId(
          "missing-board" as never,
          authoredEdges[0]!.ref,
        ),
      ).toThrow("Unknown hex board");
      expect(() =>
        module.boardHelpers.resolveHexEdgeId("hex-map", {
          spaces: ["hex-b", "hex-c"],
        } as never),
      ).toThrow("Unknown authored hex edge ref");
    },
  });
});

test("generated boardHelpers support authored hex resolvers for per-player boards", async () => {
  const perPlayerHexManifest: GameTopologyManifest = {
    ...structuredClone(TEST_MANIFEST),
    boards: [
      ...structuredClone(TEST_MANIFEST.boards),
      {
        id: "player-hex-map",
        name: "Player Hex Map",
        layout: "hex",
        scope: "perPlayer",
        orientation: "pointy-top",
        edgeFieldsSchema: {
          properties: {
            rate: {
              type: "integer",
              description: "Edge trade rate",
            },
          },
        },
        vertexFieldsSchema: {
          properties: {
            buildCost: {
              type: "integer",
              description: "Vertex build cost",
            },
          },
        },
        spaces: [
          {
            id: "player-hex-a",
            q: 0,
            r: 0,
          },
          {
            id: "player-hex-b",
            q: 1,
            r: 0,
          },
          {
            id: "player-hex-c",
            q: 0,
            r: 1,
          },
        ],
        edges: [
          {
            ref: {
              spaces: ["player-hex-a", "player-hex-b"],
            },
            typeId: "three-to-one",
            fields: {
              rate: 2,
            },
          },
        ],
        vertices: [
          {
            ref: {
              spaces: ["player-hex-a", "player-hex-b", "player-hex-c"],
            },
            typeId: "settlement-slot",
            fields: {
              buildCost: 4,
            },
          },
        ],
      },
    ],
  };

  await withGeneratedContractModule({
    tempPrefix: ".tmp-authored-hex-per-player-runtime-",
    manifest: perPlayerHexManifest,
    async run(module) {
      const playerHexBoardRef = module.boardHelpers.boardRefForPlayer(
        "player-hex-map",
        "player-1",
      );
      expect(playerHexBoardRef).toEqual({
        baseId: "player-hex-map",
        seat: "player-1",
      });
      const playerHexBoardId = module.boardHelpers
        .boardIdsForBase("player-hex-map")
        .find((id: string) => id.endsWith(":player-1"));
      if (!playerHexBoardId) {
        throw new Error("expected runtime board id for player-1");
      }
      const authoredEdgeRef =
        module.boardHelpers.authoredHexEdges(playerHexBoardId)[0]!.ref;
      const authoredVertexRef =
        module.boardHelpers.authoredHexVertices(playerHexBoardId)[0]!.ref;

      expect(playerHexBoardId).toBe("player-hex-map:player-1");
      expect(
        module.boardHelpers.resolveHexEdgeId(playerHexBoardId, authoredEdgeRef),
      ).toBe(module.boardHelpers.edgeIds(playerHexBoardId, "three-to-one")[0]);
      expect(
        module.boardHelpers.resolveHexVertexId(
          playerHexBoardId,
          authoredVertexRef,
        ),
      ).toBe(
        module.boardHelpers.vertexIds(playerHexBoardId, "settlement-slot")[0],
      );
    },
  });
});

test("generated records and idGuards preserve exact manifest ids", async () => {
  await withGeneratedContractModule({
    tempPrefix: ".tmp-generated-id-helpers-",
    manifest: TEST_MANIFEST,
    async run(module) {
      const expectedEdgeRecord = Object.fromEntries(
        module.literals.edgeIds.map((edgeId: string) => [edgeId, null]),
      );
      const expectedVertexRecord = Object.fromEntries(
        module.literals.vertexIds.map((vertexId: string) => [
          vertexId,
          vertexId,
        ]),
      );
      const expectedSquareEdgeRecord = Object.fromEntries(
        module.literals.edgeIds
          .filter((edgeId: string) =>
            module.boardHelpers.isEdgeId("square-grid", edgeId),
          )
          .map((edgeId: string) => [edgeId, false]),
      );
      const expectedSquareVertexRecord = Object.fromEntries(
        module.literals.vertexIds
          .filter((vertexId: string) =>
            module.boardHelpers.isVertexId("square-grid", vertexId),
          )
          .map((vertexId: string) => [vertexId, null]),
      );
      const firstHexEdgeId = module.boardHelpers.resolveHexEdgeId("hex-map", {
        spaces: ["hex-a", "hex-b"],
      });

      expect(module.records.edgeIds(null)).toEqual(expectedEdgeRecord);
      expect(module.records.vertexIds((vertexId: string) => vertexId)).toEqual(
        expectedVertexRecord,
      );
      expect(module.cardTypes.cardA).toBe("CARD_A");
      expect(module.zones.drawDeck).toBe("draw-deck");
      expect(module.zones.mainHand).toBe("main-hand");
      expect(module.boardHelpers.spaceRecord("square-grid", 0)).toEqual({
        "cell-a1": 0,
        "cell-a2": 0,
        "cell-b1": 0,
        "cell-b2": 0,
      });
      expect(module.boardHelpers.edgeRecord("square-grid", false)).toEqual(
        expectedSquareEdgeRecord,
      );
      expect(module.boardHelpers.vertexRecord("square-grid", null)).toEqual(
        expectedSquareVertexRecord,
      );
      expect(module.idGuards.isEdgeId(firstHexEdgeId)).toBe(true);
      expect(module.idGuards.isEdgeId("missing-edge")).toBe(false);
      expect(module.idGuards.expectEdgeId(firstHexEdgeId)).toBe(firstHexEdgeId);
      expect(() => module.idGuards.expectEdgeId("missing-edge")).toThrow(
        "Unknown edge id 'missing-edge'.",
      );
      expect(module.boardHelpers.isSpaceId("square-grid", "cell-a1")).toBe(
        true,
      );
      expect(module.boardHelpers.isSpaceId("square-grid", "missing")).toBe(
        false,
      );
      expect(module.boardHelpers.expectSpaceId("square-grid", "cell-a1")).toBe(
        "cell-a1",
      );
      expect(() =>
        module.boardHelpers.expectSpaceId("square-grid", "missing"),
      ).toThrow("Unknown space id 'missing' on board 'square-grid'.");
    },
  });
});

test("generateManifestContractSource typechecks preset standard deck contracts", async () => {
  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-preset-contract-",
    manifest: {
      players: {
        minPlayers: 2,
        maxPlayers: 4,
        optimalPlayers: 4,
      },
      cardSets: [
        {
          type: "preset",
          id: "playing-cards",
          presetId: "standard_52_deck",
          name: "Standard 52-Card Deck",
        },
      ],
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
    } satisfies GameTopologyManifest,
    usageSource: `export {};`,
  });
});

test("generateManifestContractSource typechecks typed zone card helpers against card state names", async () => {
  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-zone-card-helper-contract-",
    manifest: TEST_MANIFEST,
    usageSource: `import { asPlayerId, createTableQueries } from "@dreamboard-games/app-sdk/reducer";
import { createInitialTable } from "./manifest-contract";

const table = createInitialTable({
  playerIds: ["player-1", "player-2"],
});
const q = createTableQueries(table);

const sharedCardId = q.zone.sharedCards("draw-deck")[0];
const sharedCardName: string | undefined = sharedCardId
  ? table.cards[sharedCardId].name
  : undefined;
const sharedCardText: string | undefined = sharedCardId
  ? table.cards[sharedCardId].text
  : undefined;

const handCardId = q.zone.playerCards(asPlayerId("player-1"), "main-hand")[0];
const handCardName: string | undefined = handCardId
  ? table.cards[handCardId].name
  : undefined;
const handCardText: string | undefined = handCardId
  ? table.cards[handCardId].text
  : undefined;

void sharedCardName;
void sharedCardText;
void handCardName;
void handCardText;
`,
  });
}, 20_000);

test("generateManifestContractSource typechecks manifest-bound setup bootstrap helpers", async () => {
  await expectGeneratedContractTypechecks({
    tempPrefix: ".tmp-setup-bootstrap-contract-",
    manifest: TEST_MANIFEST,
    usageSource: `import {
  dealToPlayerBoardContainer,
  dealToPlayerZone,
  seedSharedBoardContainer,
  seedSharedBoardSpace,
  setupProfiles,
  shuffle,
} from "./manifest-contract";

const profiles = setupProfiles({
  draft: {
    bootstrap: [
      shuffle({
        type: "sharedZone",
        zoneId: "draw-deck",
      }),
      seedSharedBoardContainer({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        boardId: "track-board",
        containerId: "market-row",
        count: 1,
      }),
      dealToPlayerZone({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        zoneId: "main-hand",
        count: 1,
      }),
      dealToPlayerBoardContainer({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        boardId: "track-board",
        containerId: "market-row",
        count: 1,
      }),
      seedSharedBoardSpace({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        boardId: "track-board",
        spaceId: "space-a",
        count: 1,
      }),
    ],
  },
});

void profiles;
`,
  });
});
