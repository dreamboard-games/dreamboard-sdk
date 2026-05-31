import { afterEach, expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PluginRuntime } from "./components/PluginRuntime.js";
import { createDreamboardUI } from "./ui-contract.js";
import { createWorkspaceUIContract } from "./workspace-contract.js";
import type { PluginRuntimeAPI } from "./runtime/createPluginRuntimeAPI.js";
import type { PluginStateSnapshot } from "./types/plugin-state.js";

const runtimeSingletonKey = "__dreamboardPluginRuntimeApi";
const repoRoot = path.resolve(import.meta.dir, "../../..");

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[runtimeSingletonKey];
});

test("ui-runtime exposes runtime and generated-contract construction APIs", () => {
  expect(PluginRuntime).toBeDefined();
  expect(createDreamboardUI).toBeDefined();
  expect(createWorkspaceUIContract).toBeDefined();
});

test("ui-runtime card inputs do not retain the old swipe gesture contract", async () => {
  const interactionPrimitive = await readFile(
    path.join(repoRoot, "packages/ui-runtime/src/primitives/interaction.tsx"),
    "utf8",
  );
  const workspaceContract = await readFile(
    path.join(repoRoot, "packages/ui-runtime/src/workspace-contract.ts"),
    "utf8",
  );

  expect(interactionPrimitive).not.toContain("useDrag");
  expect(interactionPrimitive).not.toContain("data-swipe");
  expect(workspaceContract).not.toContain('swipe?: "auto" | "off"');
});

test("ui-runtime no longer ships duplicated theme or presentation modules", async () => {
  const removedPaths = [
    "theme",
    "components/ActionButton.tsx",
    "components/ActionPanel.tsx",
    "components/Card.tsx",
    "components/ChromeSuppressionContext.tsx",
    "components/CostDisplay.tsx",
    "components/DiceRoller.tsx",
    "components/Drawer.tsx",
    "components/ErrorBoundary.tsx",
    "components/GameEndDisplay.tsx",
    "components/GameSkeleton.tsx",
    "components/Hand.tsx",
    "components/HandDock.tsx",
    "components/MobileHandTray.tsx",
    "components/MoreActions.tsx",
    "components/PhaseIndicator.tsx",
    "components/PlayArea.tsx",
    "components/PrimaryActionButton.tsx",
    "components/PrimaryButton.tsx",
    "components/ResourceCounter.tsx",
    "components/ThemedButton.tsx",
    "components/Toast.tsx",
    "components/index.ts",
    "components/board/hex-board-view.ts",
    "components/board/HexGrid.tsx",
    "components/board/index.ts",
    "components/board/interaction-accessibility.ts",
    "components/board/NetworkGraph.tsx",
    "components/board/SlotSystem.tsx",
    "components/board/SquareGrid.tsx",
    "components/board/TrackBoard.tsx",
    "components/board/ZoneMap.tsx",
    "components/surfaces",
    "helpers",
    "internal",
    "hooks/useBoardTopology.ts",
    "hooks/useCards.ts",
    "hooks/useHandLayout.ts",
    "hooks/useHexBoard.ts",
    "hooks/useHexGrid.ts",
    "hooks/useIsMobile.ts",
    "hooks/usePanZoom.ts",
    "hooks/useSquareBoard.ts",
    "hooks/useSquareGrid.ts",
    "types/hex-color.ts",
    "types/player-state.ts",
    "types/tiled-board.ts",
  ];
  const offenders: string[] = [];
  for (const removedPath of removedPaths) {
    const fullPath = path.join(
      repoRoot,
      "packages/ui-runtime/src",
      removedPath,
    );
    const exists = await readFile(fullPath, "utf8")
      .then(() => true)
      .catch(() =>
        readdir(fullPath)
          .then(() => true)
          .catch(() => false),
      );
    if (exists) offenders.push(removedPath);
  }
  expect(offenders).toEqual([]);
});

test("ui-runtime kept modules consume presentation from @dreamboard-games/ui-sdk", async () => {
  const sourceFiles = [
    "packages/ui-runtime/src/primitives/board.tsx",
    "packages/ui-runtime/src/primitives/game.tsx",
    "packages/ui-runtime/src/primitives/player-roster.tsx",
    "packages/ui-runtime/src/components/InteractionForm.tsx",
    "packages/ui-runtime/src/hooks/useMe.ts",
    "packages/ui-runtime/src/types/plugin-state.ts",
  ];
  for (const filePath of sourceFiles) {
    const content = await readFile(path.join(repoRoot, filePath), "utf8");
    expect(content).not.toMatch(/from\s+["']\.\.?\/theme\//);
    expect(content).not.toMatch(
      /from\s+["']\.\.?\/components\/(?!InteractionForm|PluginRuntime|board\/target-layer)/,
    );
    expect(content).not.toMatch(
      /from\s+["']\.\.?\/types\/(hex-color|player-state|tiled-board)/,
    );
  }
});

test("PluginRuntime renders generated UI primitives with ui-runtime context identity", () => {
  const snapshot: PluginStateSnapshot<{ ok: true }, "main", string, "pass"> = {
    view: { ok: true },
    gameplay: {
      currentPhase: "main",
      currentStage: null,
      activePlayers: ["player-1"],
      simultaneousPhase: null,
      availableInteractions: [],
      zones: {
        hand: {
          cardIds: ["card-1"],
          cardViewsById: {
            "card-1": JSON.stringify({
              id: "card-1",
              cardType: "test-card",
              name: "Test Card",
              properties: {},
            }),
          },
          playableByCardId: {},
        },
      },
    },
    lobby: {
      seats: [
        {
          playerId: "player-1",
          displayName: "Player One",
        },
      ],
      canStart: true,
      hostUserId: "user-1",
    },
    notifications: [],
    session: {
      sessionId: "session-1",
      controllablePlayerIds: ["player-1"],
      controllingPlayerId: "player-1",
      userId: "user-1",
    },
    history: null,
    syncId: 1,
  };
  const runtime: PluginRuntimeAPI = {
    validateInteraction: async () => ({ valid: true }),
    submitInteraction: async () => undefined,
    getSessionState: () => ({
      status: "ready",
      sessionId: "session-1",
      controllablePlayerIds: ["player-1"],
      controllingPlayerId: "player-1",
      userId: "user-1",
    }),
    disconnect: () => undefined,
    switchPlayer: () => undefined,
    getSnapshot: () => snapshot,
    subscribeToState: () => () => undefined,
    _subscribeToSessionState: () => () => undefined,
  };
  (globalThis as Record<string, unknown>)[runtimeSingletonKey] = runtime;

  const baseUI = createDreamboardUI({
    interactions: { pass: {} },
    zones: { hand: {} },
    cards: { "card-1": {} },
    phases: { main: {} },
  });
  const UI = createWorkspaceUIContract<{
    Root: ReturnType<typeof createDreamboardUI>["Root"];
    Game: ReturnType<typeof createDreamboardUI>["Game"];
  }>({
    uiContract: {
      interactions: { pass: {} },
      zones: { hand: {} },
      cards: { "card-1": {} },
      phases: { main: {} },
    },
    formInputKeysForInteraction: () => new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(
        UI.Root,
        null,
        createElement(UI.Game.Root, null, ({ me }) =>
          createElement("section", { "data-player": me.playerId ?? "" }, [
            createElement(
              baseUI.Interaction.Root,
              { key: "interaction", interaction: "pass" },
              createElement(baseUI.Interaction.Label, null),
            ),
            createElement(
              baseUI.Zone.Root,
              { key: "zone", zone: "hand" },
              createElement(baseUI.Zone.List, null, (card) =>
                createElement("span", { key: card.id }, card.id),
              ),
            ),
          ]),
        ),
      ),
    ),
  );

  expect(html).toContain("Pass");
  expect(html).toContain("card-1");
  expect(html).toContain('data-player="player-1"');
});
