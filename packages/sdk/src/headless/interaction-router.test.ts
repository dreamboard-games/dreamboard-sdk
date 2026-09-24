import { expect, test } from "vitest";
import type { InteractionDescriptor } from "../shared/protocol/frame.js";
import { routeCardInputIntent } from "./interaction-router.js";

function descriptor(
  inputs: InteractionDescriptor["inputs"],
): InteractionDescriptor {
  return {
    phaseName: "play",
    interactionKey: "play.placeCard",
    interactionId: "placeCard",
    surface: "panel",
    kind: "action",
    label: "Place card",
    inputs,
    commit: { mode: "autoWhenReady" },
    availability: { status: "available" },
  };
}

test("routeCardInputIntent applies card and destination inputs atomically", () => {
  const interaction = descriptor([
    {
      key: "cardId",
      kind: "card",
      domain: {
        targetKind: "card",
        zoneIds: ["hand"],

        type: "cardTarget",
        projection: "resolved",
        eligibleTargets: ["card-1"],
      },
    },
    {
      key: "spaceId",
      kind: "board-space",
      domain: {
        boardId: "main",

        type: "boardTarget",
        projection: "resolved",
        targetKind: "space",
        eligibleTargets: ["hex-a"],
      },
    },
  ]);
  const draft: Record<string, unknown> = {};
  const store = {
    getDraft: () => draft,
    setInput: (_interactionKey: string, key: string, value: unknown) => {
      draft[key] = value;
    },
    clearInput: (_interactionKey: string, key?: string) => {
      if (key) delete draft[key];
    },
  };

  const result = routeCardInputIntent(store, interaction, {
    cardInputKey: "cardId",
    cardId: "card-1",
    dropTarget: { inputKey: "spaceId", value: "hex-a" },
  });

  expect(result.params).toEqual({ cardId: "card-1", spaceId: "hex-a" });
  expect(result.readiness.ready).toBe(true);
  expect(draft).toEqual({ cardId: "card-1", spaceId: "hex-a" });
});

test("a card drop cannot prefill a future committed step", () => {
  const interaction: InteractionDescriptor = {
    ...descriptor([
      {
        key: "cardId",
        kind: "card",
        domain: {
          targetKind: "card",
          zoneIds: ["hand"],

          type: "cardTarget",
          projection: "resolved",
          eligibleTargets: ["card-1"],
        },
      },
    ]),
    step: { index: 0, total: 2, selected: {}, canCancel: false },
  };
  const draft: Record<string, unknown> = {};
  const store = {
    getDraft: () => draft,
    setInput: (_: string, key: string, value: unknown) => {
      draft[key] = value;
    },
    clearInput: (_: string, key?: string) => {
      if (key) delete draft[key];
    },
  };
  const result = routeCardInputIntent(store, interaction, {
    cardInputKey: "cardId",
    cardId: "card-1",
    dropTarget: { inputKey: "spaceId", value: "hex-a" },
  });
  expect(result.params).toEqual({ cardId: "card-1" });
  expect(draft).toEqual({ cardId: "card-1" });
  expect(result.readiness.ready).toBe(true);
});
