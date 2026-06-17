import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PluginRuntime } from "./components/PluginRuntime.js";
import { InteractionForm } from "./components/interaction-form/index.js";
import { createDreamboardUI } from "./ui-contract.js";
import { createWorkspaceUIContract } from "./workspace-contract/index.js";
import { Board } from "./primitives/board.js";
import type { InteractionHandle } from "./hooks/useInteractionHandle.js";
import type { PluginRuntimeAPI } from "./api/createPluginRuntimeAPI.js";
import type { PluginStateSnapshot } from "./types/plugin-state.js";
import { interactionDraftDigestForValues } from "./utils/interaction-draft-digest.js";
import { semanticProjectionDigestForState } from "./utils/semantic-projection-digest.js";

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
          descriptorDigest: "sha256:descriptor",
          actorSeat: 0,
          draftDigest: "sha256:draft",
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
                descriptorDigest: "sha256:descriptor",
                actorSeat: 0,
                draftDigest: "sha256:draft",
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

test("generated interaction arms render semantic browser replay digests", () => {
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
  const UI = createWorkspaceUIContract<{
    Root: ReturnType<typeof createDreamboardUI>["Root"];
    Game: ReturnType<typeof createDreamboardUI>["Game"];
  }>({
    uiContract,
    formInputKeysForInteraction: (interaction) =>
      interaction === "play.placeCard"
        ? new Set(["cardId", "spaceId"])
        : new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });
  const placeCardForm = UI.Interaction.useForm("play.placeCard");

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(
        UI.Root as unknown as React.FC<{ children?: unknown }>,
        null,
        createElement(placeCardForm.Arm, null, "Place card"),
      ),
    ),
  );

  expect(html).toContain('data-dreamboard-browser-role="interaction"');
  expect(html).toContain('data-dreamboard-browser-role="actuator"');
  expect(html).toContain(
    'data-dreamboard-descriptor-digest="sha256:descriptor"',
  );
  expect(html).toContain('data-dreamboard-draft-digest="sha256:');
  expect(html).toContain("data-dreamboard-preparation-patterns=");
});

test("UI root emits the semantic projection digest marker", () => {
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
  }>({
    uiContract,
    formInputKeysForInteraction: () => new Set(),
    resourceIds: [],
    hexStaticBoards: {},
    cardIdFromZoneCard: (card: { id: string }) => card.id,
    zoneIdFromZoneCard: () => "hand",
  });
  const digest = semanticProjectionDigestForState(snapshot);

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(UI.Root as unknown as React.FC<{ children?: unknown }>),
    ),
  );

  expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(html).toContain('data-dreamboard-browser-role="projection"');
  expect(html).toContain('data-dreamboard-browser-surface="gameplay"');
  expect(html).toContain('data-dreamboard-browser-scope="runtime"');
  expect(html).toContain(`data-dreamboard-projection-digest="${digest}"`);
});

test("semantic projection digest normalizes order-insensitive target domains", () => {
  const digestFor = (targets: string[], dependentCases: unknown[]) => {
    const snapshot = makeSnapshot();
    const input = snapshot.gameplay.availableInteractions[0]?.inputs.find(
      (candidate) => candidate.key === "spaceId",
    );
    if (!input) {
      throw new Error("Missing spaceId input.");
    }
    const domain = input.domain as {
      eligibleTargets: string[];
      dependencies?: { mode: string; dependentCases: unknown[] };
    };
    domain.eligibleTargets = targets;
    domain.dependencies = {
      mode: "eager",
      dependentCases,
    };
    return semanticProjectionDigestForState(snapshot);
  };

  const first = digestFor(
    ["h-2-10", "h-2-2", "h-2-11"],
    [
      {
        when: { stormSpaceId: "h-2-10" },
        domain: {
          type: "choice",
          choices: [{ value: "none", label: "No eligible captain" }],
        },
      },
      {
        when: { stormSpaceId: "h-2-2" },
        domain: {
          type: "choice",
          choices: [{ value: "player-2", label: "Player 2" }],
        },
      },
    ],
  );

  expect(
    digestFor(
      ["h-2-2", "h-2-11", "h-2-10"],
      [
        {
          when: { stormSpaceId: "h-2-2" },
          domain: {
            type: "choice",
            choices: [{ value: "player-2", label: "Player 2" }],
          },
        },
        {
          when: { stormSpaceId: "h-2-10" },
          domain: {
            type: "choice",
            choices: [{ value: "none", label: "No eligible captain" }],
          },
        },
      ],
    ),
  ).toBe(first);
});

test("board targets render semantic browser replay select actuators", () => {
  const snapshot = makeSnapshot();
  snapshot.gameplay.availableInteractions = [
    {
      phaseName: "play",
      interactionKey: "play.placeCard",
      interactionId: "placeCard",
      kind: "action",
      descriptorDigest: "sha256:descriptor",
      actorSeat: 0,
      draftDigest: "sha256:draft",
      inputs: [
        {
          key: "spaceId",
          kind: "board-space",
          domain: {
            type: "boardTarget",
            projection: "resolved",
            targetKind: "space",
            eligibleTargets: ["hex-a"],
          },
        },
      ],
      commit: { mode: "autoWhenReady" },
      availability: { status: "available" },
    },
  ];
  (globalThis as Record<string, unknown>)[runtimeSingletonKey] = makeRuntime(
    snapshot,
    async () => undefined,
  );

  const html = renderToString(
    createElement(
      PluginRuntime,
      null,
      createElement(
        Board.Root,
        null,
        createElement(Board.SpaceTarget, { value: "hex-a" }, "Hex A"),
      ),
    ),
  );

  expect(html).toContain('data-dreamboard-browser-role="actuator"');
  expect(html).toContain('data-dreamboard-browser-intent="select"');
  expect(html).toContain('data-dreamboard-actuator-kind="click"');
  expect(html).toContain('data-dreamboard-interaction-key="play.placeCard"');
  expect(html).toContain('data-dreamboard-interaction-id="placeCard"');
  expect(html).toContain('data-dreamboard-input-key="spaceId"');
  expect(html).toContain(
    'data-dreamboard-descriptor-digest="sha256:descriptor"',
  );
  expect(html).toContain('data-dreamboard-draft-digest="sha256:');
  expect(html).toContain('data-dreamboard-candidate-state="unselected"');
  expect(html).toContain("data-dreamboard-candidate-value=");
  expect(html).toContain("data-dreamboard-semantic-effects=");
  expect(html).toContain("setCandidate");
});

test("default interaction form controls emit exact semantic effects and bounded fill patterns", () => {
  const descriptor = {
    phaseName: "play",
    interactionKey: "play.configure",
    interactionId: "configure",
    kind: "action",
    descriptorDigest: "sha256:descriptor",
    actorSeat: 0,
    draftDigest: "sha256:draft",
    inputs: [
      {
        key: "mode",
        kind: "choice",
        domain: {
          type: "choice",
          choices: [
            { value: "fast", label: "Fast" },
            { value: "slow", label: "Slow" },
          ],
        },
      },
      {
        key: "bid",
        kind: "number",
        domain: {
          type: "boundedNumber",
          min: 1,
          max: 5,
          step: 1,
        },
      },
    ],
    commit: { mode: "manual" },
    availability: { status: "available" },
  } as const;
  const handle = {
    descriptor,
    commit: descriptor.commit,
    submit: async () => undefined,
    validate: async () => undefined,
    validateDraft: () => ({
      ok: true,
      params: { mode: "fast", bid: 2 },
      fieldErrors: {},
      formErrors: [],
      missing: [],
    }),
    validateDraftServer: async () => undefined,
    submitDraft: async () => undefined,
    available: true,
    status: "open",
    draft: { mode: "fast", bid: 2 },
    values: { mode: "fast", bid: 2 },
    setInput: () => undefined,
    clearInput: () => undefined,
    isReady: true,
    isArmed: false,
    arm: () => undefined,
    disarm: () => undefined,
  } satisfies InteractionHandle<Record<string, unknown>>;

  const html = renderToString(
    createElement(InteractionForm, { descriptor, handle, accordion: false }),
  );

  expect(html).toContain("data-dreamboard-semantic-effects=");
  expect(html).toContain("setCandidate");
  expect(html).toContain("setScalar");
  expect(html).toContain("commit");
  expect(html).toContain("data-dreamboard-accepted-effect-patterns=");
  expect(html).not.toContain('data-dreamboard-candidate-value="2"');
});

test("board target draft digests reflect live draft values", () => {
  const descriptor = {
    phaseName: "playerTurn",
    interactionKey: "playerTurn.moveStorm",
    interactionId: "moveStorm",
    kind: "action",
    descriptorDigest:
      "sha256:842f2aedb8cb3e72e2239e9db8bcd26396a604c1c7293b4567819db201bea794",
    actorSeat: 0,
    draftDigest:
      "sha256:40f0e338c62be1c29b502dcd949cff1297e61d9b3e13feaff5f3bd82a144b0f8",
    inputs: [
      {
        key: "spaceId",
        kind: "board-space",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "space",
          eligibleTargets: ["h-0-0"],
        },
      },
      {
        key: "stealFromPlayerId",
        kind: "choice",
        defaultValue: "none",
        domain: {
          type: "choice",
          choices: [{ value: "none", label: "No eligible player" }],
        },
      },
    ],
    commit: { mode: "manual" },
    availability: { status: "available" },
  } as const;

  expect(
    interactionDraftDigestForValues(descriptor, {
      stealFromPlayerId: "none",
    }),
  ).toBe(descriptor.draftDigest);
  expect(
    interactionDraftDigestForValues(descriptor, {
      spaceId: "h-0-0",
    }),
  ).toBe(
    "sha256:c50299355136b07c6dfaf14cf8f42b178e95f2addc9948ebd8ffe99dd45893de",
  );
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
