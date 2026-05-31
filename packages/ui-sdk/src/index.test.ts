import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "bun:test";
import * as components from "./components/index.js";
import * as defaults from "./defaults/index.js";
import * as sdk from "./index.js";
import type { ViewSlotOccupant } from "@dreamboard-games/sdk-types";
import {
  BoardEdgeIdOf,
  BoardSpaceIdOf,
  BoardVertexIdOf,
  calculateViewBox,
  toTrackBoardData,
  useIsMobile,
  type BoardKindStates,
  type BoardRef,
  type BoardStates,
  type GameState,
  type HexBoardState,
  type HexEdgeState,
  type HexTileState,
  type HexVertexState,
  type PerPlayer,
  type PerPlayerBoardRef,
  type SharedBoardRef,
  type SquareEdgeState,
  type SquareGridProps,
  type SquarePieceState,
  type SquareVertexState,
} from "./index.js";

async function walkFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

test("top-level ui-sdk exports the headless scaffold support surface", () => {
  expect(calculateViewBox).toBeDefined();
  expect(toTrackBoardData).toBeDefined();
  expect(useIsMobile).toBeDefined();
  for (const exportName of [
    "useActivePlayers",
    "useBoardInteractions",
    "useBoardTopology",
    "useCards",
    "useGameView",
    "useHandLayout",
    "useHexBoard",
    "useInteractionByKey",
    "useInteractionHandle",
    "usePanZoom",
    "usePlayerInfo",
    "usePlayerTurnOrder",
    "usePluginActions",
    "usePluginRuntime",
    "usePluginSession",
    "usePluginState",
    "useRuntimeContext",
    "useSeatInbox",
    "useSquareBoard",
    "useToast",
  ]) {
    expect(exportName in sdk).toBe(false);
  }
});

test("top-level ui-sdk is the canonical root for visual components", () => {
  expect("PluginRuntime" in sdk).toBe(false);
  expect("GameSkeleton" in sdk).toBe(true);
  expect("HexGrid" in sdk).toBe(true);
  expect("SquareGrid" in sdk).toBe(true);
  expect("ActionButton" in sdk).toBe(true);
  expect("Dialog" in sdk).toBe(true);
  expect("DialogContent" in sdk).toBe(true);
  expect("PromptDialogHost" in sdk).toBe(false);
});

test("CardFace is the only public reusable card shell", () => {
  expect("CardFace" in sdk).toBe(true);
  expect("Card" in sdk).toBe(false);
  expect("CardFace" in components).toBe(true);
  expect("Card" in components).toBe(false);
});

test("top-level ui-sdk no longer exports the legacy interaction-button theme primitives", () => {
  // These shipped with the pre-Theme system and were retired alongside
  // the unified token contract; surfacing them again would re-introduce
  // the bifurcated styling path.
  for (const exportName of [
    "DEFAULT_INTERACTION_BUTTON_TOKENS",
    "InteractionButtonTokens",
    "mergeInteractionTokens",
    "useInteractionTokens",
  ]) {
    expect(exportName in sdk).toBe(false);
  }
});

test("top-level ui-sdk no longer exports secondary interaction shortcuts", () => {
  for (const exportName of [
    "InteractionButton",
    "InteractionDialogForm",
    "InteractionButtonProps",
    "InteractionDialogFormProps",
  ]) {
    expect(exportName in sdk).toBe(false);
  }
  expect("Interaction" in sdk).toBe(false);
});

test("top-level ui-sdk publishes the unified Theme contract", () => {
  expect("ThemeProvider" in sdk).toBe(true);
  expect("useTheme" in sdk).toBe(true);
  expect("tabletopTheme" in sdk).toBe(true);
  expect("arcadeTheme" in sdk).toBe(true);
  expect("studioTheme" in sdk).toBe(true);
  expect("mergeTheme" in sdk).toBe(true);
  expect("buttonStyle" in sdk).toBe(true);
  expect("themeToCssVars" in sdk).toBe(true);
});

test("top-level ui-sdk hides generated-contract registration internals", () => {
  expect("createDreamboardUI" in sdk).toBe(false);
  expect("InteractionForm" in sdk).toBe(false);
  expect("defaultFormInputs" in sdk).toBe(false);
  expect("hasDefaultInteractionFormFields" in sdk).toBe(false);
  expect("InteractionForm" in components).toBe(false);
  expect("defaultFormInputs" in components).toBe(false);
  expect("hasDefaultInteractionFormFields" in components).toBe(false);
});

test("ui-sdk source no longer ships an internal runtime entry point", async () => {
  const sourceRoot = import.meta.dir;
  const internalPath = path.join(sourceRoot, "internal.ts");
  const internalExists = await readFile(internalPath, "utf8")
    .then(() => true)
    .catch(() => false);
  expect(internalExists).toBe(false);
});

test("top-level ui-sdk exposes PlayerRoster as the only player roster primitive", () => {
  expect("PlayerRoster" in sdk).toBe(false);
  for (const exportName of [
    "PlayerInfo",
    "PlayerRail",
    "HudOpponentRail",
    "HudSelfPlaymat",
    "HudStatusBanner",
  ]) {
    expect(exportName in sdk).toBe(false);
    expect(exportName in components).toBe(false);
  }
});

test("top-level ui-sdk does not export internal coordination plumbing", () => {
  for (const exportName of [
    "useArmed",
    "useDraft",
    "useInteractionUiStore",
    "createInteractionUiStore",
    "InteractionUiProvider",
    "ClientParamSchemaProvider",
    "useClientParamSchema",
    "shellSlotForSurface",
    "isGeneratedHexBoardInput",
    "isGeneratedSquareBoardInput",
    "usePluginStateSnapshot",
    "useHexGrid",
    "useSquareGrid",
  ]) {
    expect(exportName in sdk).toBe(false);
  }
});

test("components subpath does not export shell slot internals", () => {
  expect("shellSlotForSurface" in components).toBe(false);
  expect("GameShell" in components).toBe(false);
  expect("GameShell" in sdk).toBe(false);
  expect("PanelSurface" in components).toBe(false);
  expect("BoardSurface" in components).toBe(false);
  expect("InboxSurface" in components).toBe(false);
  expect("PlayerCardsSurface" in components).toBe(false);
  expect("definePlayerCardsSurface" in components).toBe(false);
  expect("defineMarketSurface" in components).toBe(false);
});

test("defaults subpath exposes presentational Radix-style defaults only", () => {
  expect("GameLayout" in defaults).toBe(true);
  expect("DefaultPromptInbox" in defaults).toBe(false);
  expect("DefaultInteractionList" in defaults).toBe(false);
  expect("DefaultInteractionItem" in defaults).toBe(false);
  expect("DefaultInteractionForm" in defaults).toBe(false);
  expect("DefaultZone" in defaults).toBe(false);
  expect("GameShell" in defaults).toBe(false);
  expect("PanelSurface" in defaults).toBe(false);
});

test("ui-sdk source imports generated contracts only via canonical package specifiers", async () => {
  const sourceRoot = import.meta.dir;
  const files = await walkFiles(sourceRoot);
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    if (
      /["'](?:\.\.?\/)+(?:manifest-contract|ui-contract(?:-internal)?)["']/.test(
        content,
      )
    ) {
      offenders.push(path.relative(sourceRoot, filePath));
    }
  }

  expect(offenders).toEqual([]);
});

test("ui-sdk source does not import the private UI package", async () => {
  const sourceRoot = import.meta.dir;
  const files = await walkFiles(sourceRoot);
  const privateUiPackagePattern = new RegExp(
    `(?:from\\s+|import\\s+)["']${["@dreamboard", "ui"].join("/")}(?:["']|/)`,
  );
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    if (privateUiPackagePattern.test(content)) {
      offenders.push(path.relative(sourceRoot, filePath));
    }
  }

  expect(offenders).toEqual([]);
});

test("GameState consumes PerPlayer<T> and BoardRef instead of flat records", () => {
  const perPlayerResources: PerPlayer<Record<string, number>> = {
    __perPlayer: true,
    entries: [
      ["player-1" as never, { gold: 3, wood: 1 }],
      ["player-2" as never, { gold: 2, wood: 4 }],
    ],
  };
  const perPlayerHandCards: PerPlayer<string[]> = {
    __perPlayer: true,
    entries: [["player-1" as never, ["card-1", "card-2"]]],
  };

  const sharedRef: SharedBoardRef = { baseId: "market-board" };
  const perPlayerRef: PerPlayerBoardRef = {
    baseId: "player-mat",
    seat: "player-1" as never,
  };
  const ref: BoardRef = sharedRef;
  expect(ref.baseId).toBe("market-board");
  expect(perPlayerRef.seat).toBe("player-1");

  const sampleHexBoard: HexBoardState = {
    id: "market-board",
    tiles: [],
    edges: [],
    vertices: [],
  };
  const hexBoards: BoardKindStates<HexBoardState> = {
    shared: { "market-board": sampleHexBoard },
    perPlayer: {
      "player-mat": {
        __perPlayer: true,
        entries: [["player-1" as never, sampleHexBoard]],
      },
    },
  };
  const boards: BoardStates = {
    hex: hexBoards,
    network: { shared: {}, perPlayer: {} },
    square: { shared: {}, perPlayer: {} },
    track: { shared: {}, perPlayer: {} },
  };

  const state: GameState = {
    currentPlayerIds: ["player-1" as never],
    decks: {},
    hands: { "main-hand": perPlayerHandCards },
    cards: {},
    playerResources: perPlayerResources,
    currentState: "takeTurn",
    isMyTurn: true,
    boards,
    dice: {},
  };

  expect(state.playerResources.__perPlayer).toBe(true);
  expect(state.playerResources.entries).toHaveLength(2);
  expect(state.hands["main-hand"]?.entries[0]?.[1]).toEqual([
    "card-1",
    "card-2",
  ]);
  expect(Object.keys(state.boards.hex.shared)).toEqual(["market-board"]);
  expect(Object.keys(state.boards.hex.perPlayer)).toEqual(["player-mat"]);
});

test("preferred hex state types remain public from the top-level ui-sdk export", () => {
  const tile: HexTileState = {
    id: "hex-a" as never,
    q: 0,
    r: 0,
    typeId: "forest" as never,
  };
  const edge: HexEdgeState = {
    id: "hex-a$$hex-b",
    hex1: "hex-a" as never,
    hex2: "hex-b" as never,
    typeId: "road" as never,
  };
  const vertex: HexVertexState = {
    id: "hex-a$$hex-b$$hex-c",
    hexes: ["hex-a", "hex-b", "hex-c"] as never,
    typeId: "settlement" as never,
  };

  expect(tile.typeId).toBeDefined();
  expect(edge.typeId).toBeDefined();
  expect(vertex.typeId).toBeDefined();
});

test("tiled board hooks and types accept generated board-state records", () => {
  const generatedHexBoard = {
    id: "hex-board",
    layout: "hex" as const,
    orientation: "pointy-top" as const,
    spaces: {
      a: { id: "a", q: 0, r: 0, typeId: null, fields: { terrain: "forest" } },
      b: { id: "b", q: 1, r: 0, typeId: "hill", fields: { terrain: "hill" } },
      c: { id: "c", q: 0, r: 1, typeId: "water", fields: { terrain: "water" } },
    },
    edges: [
      {
        id: "a$$b",
        spaceIds: ["a", "b"] as const,
        typeId: "road",
        fields: { cost: 1 },
      },
    ] as const,
    vertices: [
      {
        id: "a$$b$$c",
        spaceIds: ["a", "b", "c"] as const,
        typeId: "settlement",
        fields: { bonus: 2 },
      },
    ] as const,
  };

  type HexSpaceId = BoardSpaceIdOf<typeof generatedHexBoard>;
  type HexEdgeId = BoardEdgeIdOf<typeof generatedHexBoard>;
  type HexVertexId = BoardVertexIdOf<typeof generatedHexBoard>;

  const generatedSquareBoard = {
    id: "square-board",
    layout: "square" as const,
    spaces: {
      a1: { id: "a1", row: 0, col: 0, typeId: null, fields: { bonus: 1 } },
      a2: { id: "a2", row: 0, col: 1, typeId: "city", fields: { bonus: 2 } },
      b1: { id: "b1", row: 1, col: 0, typeId: "city", fields: { bonus: 3 } },
      b2: { id: "b2", row: 1, col: 1, typeId: "city", fields: { bonus: 4 } },
    },
    edges: [
      {
        id: "a1$$a2",
        spaceIds: ["a1", "a2"] as const,
        typeId: "wall",
        fields: { strength: 5 },
      },
    ] as const,
    vertices: [
      {
        id: "a1$$a2$$b1$$b2",
        spaceIds: ["a1", "a2", "b1", "b2"] as const,
        typeId: "tower",
        fields: { guard: 1 },
      },
    ] as const,
  };

  type SquareSpaceId = BoardSpaceIdOf<typeof generatedSquareBoard>;
  type SquareEdgeId = BoardEdgeIdOf<typeof generatedSquareBoard>;
  type SquareVertexId = BoardVertexIdOf<typeof generatedSquareBoard>;

  const _hexHookInput: Parameters<typeof useHexBoard>[0] = generatedHexBoard;
  const _hexTopologyInput: Parameters<typeof useBoardTopology>[0] =
    generatedHexBoard;
  const _squareHookInput: Parameters<typeof useSquareBoard>[0] =
    generatedSquareBoard;
  const _squareTopologyInput: Parameters<typeof useBoardTopology>[0] =
    generatedSquareBoard;
  const _readonlySquareEdge = {
    id: "a1$$a2",
    spaceIds: ["a1", "a2"] as const,
  } satisfies SquareEdgeState;
  const _readonlySquareVertex = {
    id: "a1$$a2$$b1",
    spaceIds: ["a1", "a2", "b1"] as const,
  } satisfies SquareVertexState;
  const _squarePiece = {
    id: "worker-1",
    row: 0,
    col: 0,
    owner: "player-1",
  } satisfies SquarePieceState;
  const _squareGridProps = {
    ...generatedSquareBoard,
    pieces: [],
  } satisfies SquareGridProps<typeof generatedSquareBoard>;
  const _slotOccupant: ViewSlotOccupant = {
    pieceId: "worker-1",
    playerId: null,
    slotId: "market",
  };
  const _trackBoardData = toTrackBoardData(
    {
      id: "market-board",
      spaces: {
        start: { id: "start", name: "Start", typeId: "start", fields: {} },
        dock: { id: "dock", name: "Dock", typeId: "dock", fields: {} },
      },
      relations: [
        {
          fromSpaceId: "start",
          toSpaceId: "dock",
          directed: true,
        },
      ],
    },
    {
      layout: { type: "linear" },
      pieces: [
        { id: "pawn-1", spaceId: "start", owner: "player-1", typeId: "pawn" },
      ] as const,
    },
  );
  const _hexSpaceId: HexSpaceId = "a";
  const _hexEdgeId: HexEdgeId = "a$$b";
  const _hexVertexId: HexVertexId = "a$$b$$c";
  const _squareSpaceId: SquareSpaceId = "a1";
  const _squareEdgeId: SquareEdgeId = "a1$$a2";
  const _squareVertexId: SquareVertexId = "a1$$a2$$b1$$b2";

  void [
    _hexHookInput,
    _hexTopologyInput,
    _squareHookInput,
    _squareTopologyInput,
    _readonlySquareEdge,
    _readonlySquareVertex,
    _squarePiece,
    _squareGridProps,
    _slotOccupant,
    _trackBoardData,
    _hexSpaceId,
    _hexEdgeId,
    _hexVertexId,
    _squareSpaceId,
    _squareEdgeId,
    _squareVertexId,
  ];

  expect(_trackBoardData.pieces[0]?.spaceId).toBe("start");
});
