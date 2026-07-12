import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  choiceTarget,
  promptInput,
} from "../reducer";
import type { CollectorState } from "./model/spec";

const state = {
  table: {
    playerOrder: ["player-1", "player-2"],
    hands: { hand: {} },
    zones: { perPlayer: { hand: {} }, shared: {} },
  },
  flow: { currentPhase: "play" },
} as CollectorState;

const q = {
  board: {
    get: () => ({ spaces: ["s1", "s2"] }),
    tiled: () => ({ vertices: ["v1", "v2"], edges: ["e1", "e2"] }),
  },
  zone: {
    playerCards: () => ["card-a", "card-b"],
    sharedCards: () => [],
  },
};

const ctx = {
  state,
  playerId: "player-1",
  q,
} as never;

describe("target rules", () => {
  test("board targets expose eligible, validate, isEligible, and bind", () => {
    const target = boardTarget
      .vertex<CollectorState, "v1" | "v2">("board")
      .where({
        id: "only-v1",
        errorCode: "not-v1",
        message: "Only v1 is legal.",
        test: ({ targetId }) => targetId === "v1",
      })
      .build();

    expect(target.eligible(ctx)).toEqual(["v1"]);
    expect(target.isEligible(ctx, "v1")).toBe(true);
    expect(target.validate(ctx, "v2")).toEqual({
      errorCode: "not-v1",
      message: "Only v1 is legal.",
    });
    expect(target.bind(ctx).eligible()).toEqual(["v1"]);

    const input = boardInput.vertex<CollectorState, "v1" | "v2">({ target });
    expect(input.meta).toMatchObject({
      targetKind: "vertex",
      boardId: "board",
    });
    expect(input.validateTarget?.(state, "player-1", q, "v2")).toEqual({
      errorCode: "not-v1",
      message: "Only v1 is legal.",
    });
  });

  test("per-player board targets use structured target values", () => {
    const target = boardTarget
      .playerSpace<CollectorState, "workshop-mat", "cell-a">("workshop-mat")
      .where({
        id: "own-cell",
        errorCode: "not-owned",
        test: ({ playerId, target }) => target.playerId === playerId,
      })
      .build();

    const input = boardInput.playerSpace({ target });
    const ownedTarget = {
      boardId: "workshop-mat",
      playerId: "player-1",
      spaceId: "s1",
    } as const;
    const otherPlayerTarget = {
      boardId: "workshop-mat",
      playerId: "player-2",
      spaceId: "s1",
    } as const;

    expect(target.eligible(ctx)).toContainEqual(ownedTarget);
    expect(input.eligibleTargets?.(state, "player-1", q)).toContainEqual(
      ownedTarget,
    );
    expect(input.domain?.(state, "player-1", q, {} as never)).toMatchObject({
      type: "boardTarget",
      projection: "resolved",
      valueKind: "player-board-space",
      eligibleTargets: ["s1", "s2"],
    });
    expect(input.schema.parse(ownedTarget)).toEqual(ownedTarget);
    expect(
      input.validateTarget?.(state, "player-1", q, otherPlayerTarget),
    ).toEqual({
      errorCode: "not-owned",
      message: undefined,
    });
  });

  test("board targets receive dependency values for projection and validation", () => {
    const target = boardTarget
      .space<CollectorState, "s1" | "s2">("board")
      .where({
        id: "selected-mode",
        errorCode: "wrong-mode",
        test: ({ targetId, values }) =>
          values?.mode === "wide" ? targetId === "s2" : targetId === "s1",
      })
      .build();

    const modeRef = {
      key: "mode",
      collector: { kind: "form", schema: z.string() },
    } as never;
    const input = boardInput.space({ target, dependsOn: [modeRef] });

    expect(
      input.eligibleTargets?.(state, "player-1", q, { mode: "wide" }),
    ).toEqual(["s2"]);
    expect(
      input.validateTarget?.(state, "player-1", q, "s1", { mode: "wide" }),
    ).toEqual({
      errorCode: "wrong-mode",
      message: undefined,
    });
  });

  test("card targets expose the same rule API and validate collectors", () => {
    const target = cardTarget
      .zones<CollectorState, "card-a" | "card-b">(["hand"])
      .where({
        id: "only-card-a",
        errorCode: "card-blocked",
        test: ({ targetId }) => targetId === "card-a",
      })
      .build();

    expect(target.eligible(ctx)).toEqual(["card-a"]);
    expect(target.bind(ctx).isEligible("card-b")).toBe(false);

    const input = cardInput<CollectorState, "card-a" | "card-b">({ target });
    expect(input.meta).toMatchObject({
      targetKind: "card",
      zoneId: "hand",
      zoneIds: ["hand"],
    });
    expect(input.validateTarget?.(state, "player-1", q, "card-b")).toEqual({
      errorCode: "card-blocked",
      message: undefined,
    });
  });

  test("card targets receive dependency values for projection and validation", () => {
    const target = cardTarget
      .zones<CollectorState, "card-a" | "card-b">(["hand"])
      .where({
        id: "selected-mode",
        errorCode: "wrong-mode",
        test: ({ targetId, values }) =>
          values?.mode === "expensive"
            ? targetId === "card-b"
            : targetId === "card-a",
      })
      .build();

    const modeRef = {
      key: "mode",
      collector: { kind: "form", schema: z.string() },
    } as never;
    const input = cardInput({ target, dependsOn: [modeRef] });

    expect(
      input.eligibleTargets?.(state, "player-1", q, { mode: "expensive" }),
    ).toEqual(["card-b"]);
    expect(
      input.validateTarget?.(state, "player-1", q, "card-a", {
        mode: "expensive",
      }),
    ).toEqual({
      errorCode: "wrong-mode",
      message: undefined,
    });
  });

  test("choice targets project labels and validate prompt collectors", () => {
    const target = choiceTarget
      .options<CollectorState, "yes" | "no">([
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ])
      .where({
        id: "only-yes",
        errorCode: "choice-blocked",
        test: ({ targetId }) => targetId === "yes",
      })
      .build();

    expect(target.eligible(ctx)).toEqual(["yes"]);
    expect(target.eligibleOptions(ctx)).toEqual([{ id: "yes", label: "Yes" }]);
    expect(target.bind(ctx).validate("no")).toEqual({
      errorCode: "choice-blocked",
      message: undefined,
    });

    const input = promptInput({
      schema: z.enum(["yes", "no"]),
      target,
    });
    expect(input.validateTarget?.(state, "player-1", q, "no")).toEqual({
      errorCode: "choice-blocked",
      message: undefined,
    });
  });
});
