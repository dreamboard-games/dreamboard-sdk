import { describe, expect, mock, test } from "bun:test";
import type {
  InteractionDescriptor,
  ZoneHandlesSnapshot,
} from "../types/plugin-state.js";
import type { InteractionUiStore } from "../context/InteractionDraftContext.js";
import {
  applyCardIntent,
  encodeRuntimeDropTargetId,
  encodeRuntimeDropTargetKind,
  projectDraftCardState,
  selectedCardIdsForZone,
  visualStateForCard,
} from "./card-intent-adapter.js";
import { validateInteractionInputDomains } from "./interaction-inputs.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";

function makeStore(initial: Record<string, Record<string, unknown>> = {}) {
  const drafts: Record<string, Record<string, unknown>> = {
    ...Object.fromEntries(
      Object.entries(initial).map(([key, value]) => [key, { ...value }]),
    ),
  };
  const arms: Record<string, string | null> = {};
  const submitting: Record<string, boolean> = {};
  let pending: string | null = null;

  const store: InteractionUiStore = {
    getDraft: (key) => drafts[key] ?? {},
    setInput: (key, input, value) => {
      drafts[key] = { ...(drafts[key] ?? {}), [input]: value };
    },
    clearInput: (key, input) => {
      if (input === undefined) {
        delete drafts[key];
        return;
      }
      const draft = drafts[key];
      if (!draft) return;
      delete draft[input];
      if (Object.keys(draft).length === 0) delete drafts[key];
    },
    clearAll: () => {
      for (const key of Object.keys(drafts)) delete drafts[key];
    },
    getArmed: (surface) => arms[surface] ?? null,
    arm: (surface, key) => {
      arms[surface] = key;
    },
    getPendingInteraction: () => pending,
    setPendingInteraction: (key) => {
      pending = key;
    },
    getPendingInteractionRevision: () => 0,
    isSubmitting: (key) => submitting[key] === true,
    claimSubmitting: (key) => {
      if (submitting[key]) return false;
      submitting[key] = true;
      return true;
    },
    setSubmitting: (key, value) => {
      submitting[key] = value;
    },
  };

  return { store, drafts, arms, submitting, getPending: () => pending };
}

function autoCommitDescriptor(
  inputs: InteractionDescriptor["inputs"],
  overrides: Partial<InteractionDescriptor> = {},
): InteractionDescriptor {
  return {
    phaseName: "play",
    interactionKey: "play.placeCard",
    interactionId: "placeCard",
    kind: "action",
    inputs,
    commit: { mode: "autoWhenReady" },
    availability: { status: "available" },
    ...overrides,
  } as InteractionDescriptor;
}

function manualCommitDescriptor(
  inputs: InteractionDescriptor["inputs"],
  overrides: Partial<InteractionDescriptor> = {},
): InteractionDescriptor {
  return autoCommitDescriptor(inputs, {
    commit: { mode: "manual" },
    interactionKey: "play.collectMany",
    interactionId: "collectMany",
    ...overrides,
  });
}

function snapshotForDescriptor(
  descriptor: InteractionDescriptor,
  cardIds: readonly string[],
): ZoneHandlesSnapshot {
  return {
    cardIds,
    cardViewsById: Object.fromEntries(
      cardIds.map((cardId) => [
        cardId,
        JSON.stringify({
          id: cardId,
          cardType: "test",
          name: cardId,
          properties: {},
        }),
      ]),
    ),
    playableByCardId: Object.fromEntries(
      cardIds.map((cardId) => [cardId, [descriptor]]),
    ),
  };
}

describe("applyCardIntent", () => {
  test("activate on a single-card autoWhenReady interaction submits exactly once", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
        },
      },
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "activate", cardId: "card-1" },
    );
    expect(result.status).toBe("submitted");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({ cardId: "card-1" });
  });

  test("activate on a multi-card selection mutates draft without submission", async () => {
    const descriptor = manualCommitDescriptor([
      {
        key: "cardIds",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1", "card-2"],
          selection: { mode: "many", min: 1, max: 3 },
        },
      },
    ]);
    const { store, drafts } = makeStore();
    // Override descriptor to use the conventional "cardId" fallback name?
    // No — the adapter uses inputByTarget so the actual key is honored.
    const snapshot: ZoneHandlesSnapshot = {
      cardIds: ["card-1", "card-2"],
      cardViewsById: {},
      playableByCardId: {
        "card-1": [descriptor],
        "card-2": [descriptor],
      },
    };
    const submit = mock(async () => {});
    const r1 = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshot,
        submit,
      },
      { type: "activate", cardId: "card-1" },
    );
    expect(r1.status).toBe("pending");
    expect(submit).toHaveBeenCalledTimes(0);
    expect(drafts["play.collectMany"]).toEqual({ cardIds: ["card-1"] });

    const r2 = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshot,
        submit,
      },
      { type: "activate", cardId: "card-2" },
    );
    expect(r2.status).toBe("pending");
    expect(submit).toHaveBeenCalledTimes(0);
    expect(drafts["play.collectMany"]).toEqual({
      cardIds: ["card-1", "card-2"],
    });
  });

  test("drop with card+destination applies both inputs atomically before readiness", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
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
    ]);
    const { store, drafts } = makeStore();
    const submit = mock(async () => {});
    const targetId = encodeRuntimeDropTargetId("spaceId", "hex-a");
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "drop", cardId: "card-1", targetId },
    );
    expect(result.status).toBe("submitted");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({
      cardId: "card-1",
      spaceId: "hex-a",
    });
    expect(drafts["play.placeCard"]).toBeUndefined();
  });

  test("drop with a kind-encoded target resolves to the descriptor input key", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
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
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const targetId = encodeRuntimeDropTargetKind("space", "hex-a");
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "drop", cardId: "card-1", targetId },
    );
    expect(result.status).toBe("submitted");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({
      cardId: "card-1",
      spaceId: "hex-a",
    });
  });

  test("drop with a kind that no descriptor input matches is ignored", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
        },
      },
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      {
        type: "drop",
        cardId: "card-1",
        targetId: encodeRuntimeDropTargetKind("space", "hex-a"),
      },
    );
    expect(result.status).toBe("ignored");
    if (result.status === "ignored") {
      expect(result.reason).toBe("drop-target-input-unknown");
    }
    expect(submit).toHaveBeenCalledTimes(0);
  });

  test("drop onto an ineligible board target is ignored authoritatively", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
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
        },
      },
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      {
        type: "drop",
        cardId: "card-1",
        targetId: encodeRuntimeDropTargetId("spaceId", "hex-z"),
      },
    );
    expect(result.status).toBe("ignored");
    if (result.status === "ignored") {
      expect(result.reason).toBe("drop-target-not-eligible");
    }
    expect(submit).toHaveBeenCalledTimes(0);
  });

  test("activate on an unavailable interaction is ignored", async () => {
    const descriptor = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
      ],
      {
        availability: {
          status: "notYourTurn",
          reason: "wrong-phase",
        },
      },
    );
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "activate", cardId: "card-1" },
    );
    expect(result.status).toBe("ignored");
    expect(submit).toHaveBeenCalledTimes(0);
  });

  test("activate on a card without an eligible descriptor is ignored", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
        },
      },
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "activate", cardId: "card-zzz" },
    );
    expect(result.status).toBe("ignored");
    expect(submit).toHaveBeenCalledTimes(0);
  });

  test("selectedCardIdsForZone reports many-selection drafts so the hand can stage", () => {
    const descriptor = manualCommitDescriptor([
      {
        key: "cardIds",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          zoneIds: ["hand"],
          eligibleTargets: ["card-1", "card-2"],
          selection: { mode: "many", min: 1, max: 3 },
        },
      },
    ]);
    const { store } = makeStore();
    store.setInput(descriptor.interactionKey, "cardIds", ["card-1", "card-2"]);
    const state = {
      gameplay: {
        availableInteractions: [descriptor],
      },
    } as unknown as PluginStateSnapshot;
    const ids = selectedCardIdsForZone(store, "hand", state);
    expect(new Set(ids)).toEqual(new Set(["card-1", "card-2"]));
  });

  test("drop picks the descriptor whose destination is eligible when a card has multiple playable actions", async () => {
    const cardOnly = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
      ],
      {
        interactionKey: "play.discard",
        interactionId: "discard",
      },
    );
    const cardPlusSpace = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
        {
          key: "spaceId",
          kind: "board-space",
          domain: {
            type: "boardTarget",
            projection: "resolved",
            targetKind: "space",
            eligibleTargets: ["b"],
            dependencies: {
              mode: "eager",
              dependentCases: [
                {
                  when: { cardId: "card-1" },
                  domain: {
                    type: "boardTarget",
                    projection: "resolved",
                    targetKind: "space",
                    eligibleTargets: ["b"],
                  },
                },
              ],
            },
          },
        },
      ],
      {
        interactionKey: "play.placeCard",
        interactionId: "placeCard",
      },
    );
    const snapshot: ZoneHandlesSnapshot = {
      cardIds: ["card-1"],
      cardViewsById: {},
      // Snapshot lists the card-only descriptor first, mimicking the case
      // where a simpler action wins resolution if we don't consider the
      // destination.
      playableByCardId: { "card-1": [cardOnly, cardPlusSpace] },
    };
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [cardOnly, cardPlusSpace],
        zoneSnapshot: snapshot,
        submit,
      },
      {
        type: "drop",
        cardId: "card-1",
        targetId: encodeRuntimeDropTargetKind("space", "b"),
      },
    );
    expect(result.status).toBe("submitted");
    if (result.status === "submitted") {
      expect(result.descriptor.interactionKey).toBe("play.placeCard");
    }
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({
      cardId: "card-1",
      spaceId: "b",
    });
  });

  test("drop is ignored as ambiguous when multiple descriptors accept both card and target", async () => {
    const variantA = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
        {
          key: "spaceId",
          kind: "board-space",
          domain: {
            type: "boardTarget",
            projection: "resolved",
            targetKind: "space",
            eligibleTargets: ["b"],
            dependencies: {
              mode: "eager",
              dependentCases: [
                {
                  when: { cardId: "card-1" },
                  domain: {
                    type: "boardTarget",
                    projection: "resolved",
                    targetKind: "space",
                    eligibleTargets: ["b"],
                  },
                },
              ],
            },
          },
        },
      ],
      { interactionKey: "play.placeA", interactionId: "placeA" },
    );
    const variantB = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
        {
          key: "spaceId",
          kind: "board-space",
          domain: {
            type: "boardTarget",
            projection: "resolved",
            targetKind: "space",
            eligibleTargets: ["b"],
            dependencies: {
              mode: "eager",
              dependentCases: [
                {
                  when: { cardId: "card-1" },
                  domain: {
                    type: "boardTarget",
                    projection: "resolved",
                    targetKind: "space",
                    eligibleTargets: ["b"],
                  },
                },
              ],
            },
          },
        },
      ],
      { interactionKey: "play.placeB", interactionId: "placeB" },
    );
    const snapshot: ZoneHandlesSnapshot = {
      cardIds: ["card-1"],
      cardViewsById: {},
      playableByCardId: { "card-1": [variantA, variantB] },
    };
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [variantA, variantB],
        zoneSnapshot: snapshot,
        submit,
      },
      {
        type: "drop",
        cardId: "card-1",
        targetId: encodeRuntimeDropTargetKind("space", "b"),
      },
    );
    expect(result.status).toBe("ignored");
    if (result.status === "ignored") {
      expect(result.reason).toBe("ambiguous-drop");
    }
    expect(submit).toHaveBeenCalledTimes(0);
  });

  test("card activate followed by form input enters pending collection without premature submit", async () => {
    const descriptor = autoCommitDescriptor(
      [
        {
          key: "cardId",
          kind: "card",
          domain: {
            type: "cardTarget",
            projection: "resolved",
            eligibleTargets: ["card-1"],
          },
        },
        {
          key: "label",
          kind: "form",
          domain: {
            type: "choice",
            choices: [
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ],
          },
        },
      ],
      {
        commit: { mode: "manual" },
        interactionKey: "play.placeAndLabel",
        interactionId: "placeAndLabel",
      },
    );
    const { store, drafts } = makeStore();
    const submit = mock(async () => {});
    // Step 1: activate the card. The descriptor still needs the form
    // value, so the result must be pending — not submitted — and the
    // draft must hold the card id awaiting the form value.
    const activateResult = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "activate", cardId: "card-1" },
    );
    expect(activateResult.status).toBe("pending");
    if (activateResult.status === "pending") {
      expect(activateResult.descriptor.interactionKey).toBe(
        "play.placeAndLabel",
      );
      expect(activateResult.readiness.ready).toBe(false);
      expect(activateResult.readiness.missingInputs).toContain("label");
      expect(activateResult.params).toEqual({ cardId: "card-1" });
    }
    expect(submit).toHaveBeenCalledTimes(0);
    expect(drafts["play.placeAndLabel"]).toEqual({ cardId: "card-1" });
    // Step 2: form input lands. Once the second input is supplied via
    // the canonical draft mutation, readiness flips to true.
    store.setInput("play.placeAndLabel", "label", "yes");
    expect(drafts["play.placeAndLabel"]).toEqual({
      cardId: "card-1",
      label: "yes",
    });
  });

  test("drop with an opaque non-runtime target id is ignored", async () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
        },
      },
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "drop", cardId: "card-1", targetId: "freeform:thing" },
    );
    expect(result.status).toBe("ignored");
    if (result.status === "ignored") {
      expect(result.reason).toBe("drop-target-not-decodable");
    }
    expect(submit).toHaveBeenCalledTimes(0);
  });
});

describe("decodeAuthoredCardIntent", () => {
  test("returns the manifest target value for a kind-encoded drop", async () => {
    const { decodeAuthoredCardIntent } =
      await import("../primitives/hand-intent-adapter.js");
    const decoded = decodeAuthoredCardIntent({
      type: "drop",
      cardId: "card-1",
      targetId: encodeRuntimeDropTargetKind("space", "h-0-0"),
      source: "pointer",
    });
    expect(decoded).toEqual({
      type: "drop",
      cardId: "card-1",
      targetId: "h-0-0",
      source: "pointer",
    });
  });

  test("returns the manifest input value for an input-encoded drop", async () => {
    const { decodeAuthoredCardIntent } =
      await import("../primitives/hand-intent-adapter.js");
    const decoded = decodeAuthoredCardIntent({
      type: "drop",
      cardId: "card-1",
      targetId: encodeRuntimeDropTargetId("spaceId", "h-0-0"),
      source: "keyboard",
    });
    expect(decoded.type).toBe("drop");
    if (decoded.type === "drop") {
      expect(decoded.targetId).toBe("h-0-0");
    }
  });

  test("non-drop intents pass through unchanged", async () => {
    const { decodeAuthoredCardIntent } =
      await import("../primitives/hand-intent-adapter.js");
    const activate = decodeAuthoredCardIntent({
      type: "activate",
      cardId: "card-1",
      source: "tap",
    });
    expect(activate).toEqual({
      type: "activate",
      cardId: "card-1",
      source: "tap",
    });
  });

  test("opaque non-decodable target ids fall through unchanged", async () => {
    const { decodeAuthoredCardIntent } =
      await import("../primitives/hand-intent-adapter.js");
    const decoded = decodeAuthoredCardIntent({
      type: "drop",
      cardId: "card-1",
      targetId: "freeform:thing",
      source: "pointer",
    });
    if (decoded.type === "drop") {
      expect(decoded.targetId).toBe("freeform:thing");
    }
  });
});

describe("generated facade integration", () => {
  test("dropTargetIdFor encoding matches runtime resolver", async () => {
    const { dropTargetIdFor } = await import("../primitives/hand-surface.js");
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
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
    ]);
    const { store } = makeStore();
    const submit = mock(async () => {});
    const targetId = dropTargetIdFor("space", "hex-a");
    const result = await applyCardIntent(
      {
        store,
        availableInteractions: [descriptor],
        zoneSnapshot: snapshotForDescriptor(descriptor, ["card-1"]),
        submit,
      },
      { type: "drop", cardId: "card-1", targetId },
    );
    expect(result.status).toBe("submitted");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({
      cardId: "card-1",
      spaceId: "hex-a",
    });
  });
});

describe("projectDraftCardState", () => {
  test("captures single-card draft as selected, leaves others untouched", () => {
    const descriptor = autoCommitDescriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1", "card-2"],
        },
      },
    ]);
    const projection = projectDraftCardState(
      [descriptor],
      { [descriptor.interactionKey]: { cardId: "card-1" } },
      validateInteractionInputDomains,
    );
    expect(projection).toHaveLength(1);
    expect([...projection[0]!.draftCardIds]).toEqual(["card-1"]);
    expect(visualStateForCard("card-1", projection)).toEqual({
      selected: true,
      invalid: false,
    });
    expect(visualStateForCard("card-2", projection)).toEqual({
      selected: false,
      invalid: false,
    });
  });

  test("captures many-selection draft including duplicate-aware sets", () => {
    const descriptor = manualCommitDescriptor([
      {
        key: "cardIds",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1", "card-2", "card-3"],
          selection: { mode: "many", min: 1, max: 3 },
        },
      },
    ]);
    const projection = projectDraftCardState(
      [descriptor],
      { [descriptor.interactionKey]: { cardIds: ["card-1", "card-3"] } },
      validateInteractionInputDomains,
    );
    expect(new Set(projection[0]!.draftCardIds)).toEqual(
      new Set(["card-1", "card-3"]),
    );
    expect(visualStateForCard("card-1", projection).selected).toBe(true);
    expect(visualStateForCard("card-2", projection).selected).toBe(false);
    expect(visualStateForCard("card-3", projection).selected).toBe(true);
  });

  test("flags invalid card ids when validation rejects the draft", () => {
    const descriptor = manualCommitDescriptor([
      {
        key: "cardIds",
        kind: "card",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
          selection: { mode: "many", min: 1, max: 1 },
        },
      },
    ]);
    const projection = projectDraftCardState(
      [descriptor],
      { [descriptor.interactionKey]: { cardIds: ["card-1", "card-2"] } },
      validateInteractionInputDomains,
    );
    const card1 = visualStateForCard("card-1", projection);
    const card2 = visualStateForCard("card-2", projection);
    expect(card1.selected).toBe(true);
    // card-2 is in the draft array but the domain rejects it; both end up in
    // the invalid set because the field error covers the whole input.
    expect(card2.selected).toBe(true);
    expect(card1.invalid || card2.invalid).toBe(true);
  });

  test("ignores descriptors without card-target inputs", () => {
    const descriptor = autoCommitDescriptor([
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
    ]);
    const projection = projectDraftCardState(
      [descriptor],
      { [descriptor.interactionKey]: { spaceId: "hex-a" } },
      validateInteractionInputDomains,
    );
    expect(projection).toEqual([]);
    expect(visualStateForCard("any", projection)).toEqual({
      selected: false,
      invalid: false,
    });
  });
});
