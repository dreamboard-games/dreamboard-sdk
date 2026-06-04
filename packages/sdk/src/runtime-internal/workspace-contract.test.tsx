import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PluginRuntime } from "./components/PluginRuntime.js";
import { createDreamboardUI } from "./ui-contract.js";
import { createWorkspaceUIContract } from "./workspace-contract.js";
import type { PluginRuntimeAPI } from "./runtime/createPluginRuntimeAPI.js";
import type { PluginStateSnapshot } from "./types/plugin-state.js";

const runtimeSingletonKey = "__dreamboardPluginRuntimeApi";

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[runtimeSingletonKey];
});

function makeSnapshot(): PluginStateSnapshot<
  { ok: true },
  "play",
  string,
  "play.placeCard"
> {
  return {
    view: { ok: true },
    gameplay: {
      currentPhase: "play",
      currentStage: null,
      activePlayers: ["player-1"],
      simultaneousPhase: null,
      availableInteractions: [
        {
          phaseName: "play",
          interactionKey: "play.placeCard",
          interactionId: "placeCard",
          kind: "action",
          inputs: [
            {
              key: "cardId",
              kind: "card",
              domain: {
                type: "cardTarget",
                projection: "resolved",
                eligibleTargets: ["card-1"],
                zoneIds: ["hand"],
              },
            },
            {
              key: "spaceId",
              kind: "board-space",
              domain: {
                type: "boardTarget",
                projection: "resolved",
                targetKind: "space",
                eligibleTargets: ["hex-a"],
                dependencies: {
                  mode: "eager",
                  dependentCases: [
                    {
                      when: { cardId: "card-1" },
                      domain: {
                        type: "boardTarget",
                        projection: "resolved",
                        targetKind: "space",
                        eligibleTargets: ["hex-a"],
                      },
                    },
                  ],
                },
              },
            },
          ],
          commit: { mode: "autoWhenReady" },
          availability: { status: "available" },
        },
      ],
      zones: {
        hand: {
          cardIds: ["card-1"],
          cardViewsById: {
            "card-1": JSON.stringify({
              id: "card-1",
              cardType: "test-card",
              name: "Test card",
              properties: {},
            }),
          },
          playableByCardId: {
            "card-1": [
              {
                phaseName: "play",
                interactionKey: "play.placeCard",
                interactionId: "placeCard",
                kind: "action",
                inputs: [
                  {
                    key: "cardId",
                    kind: "card",
                    domain: {
                      type: "cardTarget",
                      projection: "resolved",
                      eligibleTargets: ["card-1"],
                      zoneIds: ["hand"],
                    },
                  },
                ],
                commit: { mode: "autoWhenReady" },
                availability: { status: "available" },
              },
            ],
          },
        },
      },
    },
    lobby: {
      seats: [{ playerId: "player-1", displayName: "Player One" }],
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
}

function makeRuntime(
  snapshot: PluginStateSnapshot,
  submit: (...args: unknown[]) => Promise<void>,
): PluginRuntimeAPI {
  return {
    validateInteraction: async () => ({ valid: true }),
    submitInteraction: submit as PluginRuntimeAPI["submitInteraction"],
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
}

test("generated hand renders typed drop targets with kind-encoded ids", () => {
  const snapshot = makeSnapshot();
  const submit = async () => undefined;
  (globalThis as Record<string, unknown>)[runtimeSingletonKey] = makeRuntime(
    snapshot,
    submit,
  );

  const uiContract = {
    interactions: { "play.placeCard": {} },
    zones: { hand: {} },
    cards: { "card-1": {} },
    phases: { play: {} },
  } as const;
  const baseUI = createDreamboardUI(uiContract);
  const UI = createWorkspaceUIContract<{
    Root: ReturnType<typeof createDreamboardUI>["Root"];
    Game: ReturnType<typeof createDreamboardUI>["Game"];
    Zone: { useHand: typeof useHandFacade };
  }>({
    uiContract,
    formInputKeysForInteraction: () => new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });

  interface ZoneCard {
    id: string;
  }
  interface HandFacade {
    Hand: (props: {
      children?: ((card: ZoneCard) => unknown) | unknown;
      layout?: unknown;
      mobileInteraction?: "direct-activate" | "drag-to-target";
      dropTargets?: ReadonlyArray<{
        target:
          | { kind: "card"; card: string }
          | { kind: "space" | "edge" | "vertex" | "tile"; target: string };
        label: string;
        render: () => unknown;
      }>;
    }) => unknown;
  }
  const useHandFacade = (
    UI as unknown as {
      Zone: {
        useHand: (
          name: string,
          options: { zone: string; role: string; label: string },
        ) => HandFacade;
      };
    }
  ).Zone.useHand;

  function HandHarness() {
    const hand = useHandFacade("playerHand", {
      zone: "hand",
      role: "primary",
      label: "Hand",
    });
    return createElement(
      hand.Hand as unknown as React.FC<unknown>,
      {
        mobileInteraction: "drag-to-target",
        dropTargets: [
          {
            target: { kind: "space", target: "hex-a" },
            label: "Place at hex A",
            render: () => createElement("div", { "data-marker": "drop-a" }),
          },
        ],
        children: (card: ZoneCard, state: { eligible?: boolean }) =>
          createElement("span", {
            "data-card": card.id,
            "data-card-eligible": state.eligible ? "true" : "false",
          }),
      } as unknown,
    );
  }

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        createElement(HandHarness),
      ),
    ),
  );

  // The generated facade composes CardDragSurface + CardDropTargetView when
  // dropTargets are present, and the runtime adapter encodes the typed kind
  // into the opaque target id. Both signals must appear in the SSR output.
  expect(html).toContain("data-dreamboard-card-drag-surface");
  expect(html).toContain('data-target-id="dreamboard:drop:kind:space:hex-a"');
  expect(html).toContain("Place at hex A");
  // The generated children renderer must receive the projected visual
  // state. card-1 is eligible for the placeCard descriptor's cardId
  // input, so the SSR markup must reflect that through the children
  // callback rather than dropping the state argument silently.
  expect(html).toContain('data-card-eligible="true"');
});

test("generated hand renders selection summary through the renderSummary slot", () => {
  const snapshot = makeSnapshot();
  (globalThis as Record<string, unknown>)[runtimeSingletonKey] = makeRuntime(
    snapshot,
    async () => undefined,
  );

  const uiContract = {
    interactions: { "play.placeCard": {} },
    zones: { hand: {} },
    cards: { "card-1": {} },
    phases: { play: {} },
  } as const;
  const UI = createWorkspaceUIContract<{
    Root: ReturnType<typeof createDreamboardUI>["Root"];
    Game: ReturnType<typeof createDreamboardUI>["Game"];
    Zone: { useHand: typeof useHandFacade };
  }>({
    uiContract,
    formInputKeysForInteraction: () => new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });

  interface ZoneCard {
    id: string;
  }
  interface SummaryShape {
    selectedCount: number;
    selectedIds: readonly string[];
    hasInvalidSelection: boolean;
  }
  interface HandFacade {
    Hand: (props: {
      children?: unknown;
      renderSummary?: (summary: SummaryShape) => unknown;
    }) => unknown;
  }
  const useHandFacade = (
    UI as unknown as {
      Zone: {
        useHand: (
          name: string,
          options: { zone: string; role: string; label: string },
        ) => HandFacade;
      };
    }
  ).Zone.useHand;

  function HandHarness() {
    const hand = useHandFacade("playerHand", {
      zone: "hand",
      role: "primary",
      label: "Hand",
    });
    return createElement(
      hand.Hand as unknown as React.FC<unknown>,
      {
        renderSummary: (summary: SummaryShape) =>
          createElement(
            "span",
            {
              "data-marker": "summary",
              "data-count": String(summary.selectedCount),
            },
            `${summary.selectedCount} selected`,
          ),
        children: (card: ZoneCard) =>
          createElement("span", { "data-card": card.id }),
      } as unknown,
    );
  }

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        createElement(HandHarness),
      ),
    ),
  );

  // The generated facade composes the runtime hand-summary chrome and the
  // author's renderSummary slot. With no draft mutations the count is 0
  // and `hasInvalidSelection` is false; both are exposed via stable
  // data attributes so authors can style around them.
  expect(html).toContain("data-dreamboard-runtime-hand-summary");
  expect(html).toContain('data-selection-count="0"');
  expect(html).toContain('data-has-invalid-selection="false"');
  expect(html).toContain('data-marker="summary"');
  expect(html).toContain("0 selected");
});
