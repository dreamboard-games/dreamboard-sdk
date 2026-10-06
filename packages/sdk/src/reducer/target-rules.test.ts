import type { BoardVertexId } from "../shared/domain/board-identities.js";
import { perPlayerInstanceId } from "../shared/domain/per-player-instance.js";
import { createInputTestState, inputDefinitions } from "./input-test-fixtures";
import { createStateQueries } from "./table-queries";
import { describe, expect, test } from "vitest";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  choiceTarget,
} from "./inputs";
import type { CollectorState } from "./model/spec";
import type { ZoneDefinitions } from "./model";

const state = createInputTestState();
const q = createStateQueries<CollectorState, ZoneDefinitions>(
  state,
  inputDefinitions,
);
const ctx = { state, playerId: "player-1", q };
const [firstVertex, secondVertex] = createStateQueries(
  state,
  inputDefinitions,
).board("board").state.vertices;
if (!firstVertex || !secondVertex)
  throw new Error("Target fixture needs two vertices.");
const v1 = firstVertex.id;
const v2 = secondVertex.id;

describe("target rules", () => {
  test("board targets expose eligible, validate, isEligible, and bind", () => {
    const target = boardTarget
      .vertex<CollectorState, BoardVertexId<"board">>("board")
      .where({
        id: "only-v1",
        errorCode: "not-v1",
        message: "Only v1 is legal.",
        test: ({ targetId }) => targetId === v1,
      })
      .build();

    expect(target.eligible(ctx)).toEqual([v1]);
    expect(target.isEligible(ctx, v1)).toBe(true);
    expect(target.validate(ctx, v2)).toEqual({
      errorCode: "not-v1",
      message: "Only v1 is legal.",
    });
    expect(target.bind(ctx).eligible()).toEqual([v1]);

    const input = boardInput.vertex<CollectorState, BoardVertexId<"board">>({
      target,
    });
    expect(input.meta).toMatchObject({
      targetKind: "vertex",
      boardId: "board",
    });
    expect(input.validateTarget?.(state, "player-1", q, v2)).toEqual({
      errorCode: "not-v1",
      message: "Only v1 is legal.",
    });
  });

  test("per-player board targets use structured target values", () => {
    const target = boardTarget
      .playerSpace<CollectorState, "workshop-mat", "s1" | "s2">("workshop-mat")
      .where({
        id: "own-cell",
        errorCode: "not-owned",
        test: ({ playerId, targetId: target, q }) =>
          q.board(target.boardId).state.playerId === playerId,
      })
      .build();

    const input = boardInput.playerSpace({ target });
    const ownedTarget = {
      boardId: perPlayerInstanceId("board", "workshop-mat", "player-1"),
      spaceId: "s1",
    } as const;
    const otherPlayerTarget = {
      boardId: perPlayerInstanceId("board", "workshop-mat", "player-2"),
      spaceId: "s1",
    } as const;

    expect(target.eligible(ctx)).toContainEqual(ownedTarget);
    expect(input.eligibleTargets?.(state, "player-1", q)).toContainEqual(
      ownedTarget,
    );
    expect(input.domain?.(state, "player-1", q)).toMatchObject({
      type: "boardTarget",
      projection: "resolved",
      valueKind: "board-space",
      eligibleTargets: [ownedTarget, { ...ownedTarget, spaceId: "s2" }],
    });
    expect(input.schema.parse(ownedTarget)).toEqual(ownedTarget);
    expect(
      input.validateTarget?.(state, "player-1", q, otherPlayerTarget),
    ).toEqual({
      errorCode: "not-owned",
      message: undefined,
    });
  });

  test("board target predicates capture selected step values", () => {
    const target = boardTarget
      .space<CollectorState, "s1" | "s2">("main-board")
      .where({
        id: "selected-mode",
        errorCode: "wrong-mode",
        test: ({ targetId }) => targetId === "s2",
      })
      .build();

    const input = boardInput.space({ target });

    expect(input.eligibleTargets?.(state, "player-1", q)).toEqual(["s2"]);
    expect(input.validateTarget?.(state, "player-1", q, "s1")).toEqual({
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

  test("card target predicates capture selected step values", () => {
    const target = cardTarget
      .zones<CollectorState, "card-a" | "card-b">(["hand"])
      .where({
        id: "selected-mode",
        errorCode: "wrong-mode",
        test: ({ targetId }) => targetId === "card-b",
      })
      .build();

    const input = cardInput({ target });

    expect(input.eligibleTargets?.(state, "player-1", q)).toEqual(["card-b"]);
    expect(input.validateTarget?.(state, "player-1", q, "card-a")).toEqual({
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

    expect(target.options(ctx)).toEqual([
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ]);
  });
});

describe("runtime target admission", () => {
  test.each([null, undefined, 1, [], {}, "missing-card", { id: "card-a" }])(
    "rejects unknown card target %# before predicates",
    (value) => {
      let predicateCalls = 0;
      const input = cardInput({
        target: cardTarget
          .zones(["hand"])
          .where({
            id: "record-calls",
            errorCode: "PREDICATE_REJECTED",
            test: () => {
              predicateCalls++;
              return true;
            },
          })
          .build(),
      });
      expect(input.validateTarget?.(state, "player-1", q, value)).toMatchObject(
        { errorCode: "CARD_TARGET_NOT_ELIGIBLE" },
      );
      expect(predicateCalls).toBe(0);
    },
  );

  test.each([
    null,
    undefined,
    "s1",
    {},
    {
      boardId: perPlayerInstanceId("board", "workshop-mat", "player-1"),
      spaceId: "s1",
      injected: true,
    },
    {
      boardId: perPlayerInstanceId("board", "wrong", "player-1"),
      spaceId: "s1",
    },
    { boardId: "workshop-mat", playerId: "missing-player", spaceId: "s1" },
  ])(
    "rejects unknown structured board target %# before predicates",
    (value) => {
      let predicateCalls = 0;
      const input = boardInput.playerSpace({
        target: boardTarget
          .playerSpace("workshop-mat")
          .where({
            id: "record-calls",
            errorCode: "PREDICATE_REJECTED",
            test: () => {
              predicateCalls++;
              return true;
            },
          })
          .build(),
      });
      expect(input.validateTarget?.(state, "player-1", q, value)).toMatchObject(
        { errorCode: "BOARD_TARGET_NOT_ELIGIBLE" },
      );
      expect(predicateCalls).toBe(0);
    },
  );

  test("predicates receive the canonical candidate instead of the submitted object", () => {
    const seen: unknown[] = [];
    const target = boardTarget
      .playerSpace("workshop-mat")
      .where({
        id: "record-candidate",
        errorCode: "REJECTED",
        test: ({ targetId: target }) => {
          seen.push(target);
          return true;
        },
      })
      .build();
    const submitted = {
      boardId: perPlayerInstanceId("board", "workshop-mat", "player-1"),
      spaceId: "s1",
    };
    expect(target.validate(ctx, submitted)).toBeNull();
    expect(seen).toEqual([
      {
        boardId: perPlayerInstanceId("board", "workshop-mat", "player-1"),
        spaceId: "s1",
      },
    ]);
    expect(seen[0]).not.toBe(submitted);
  });
});
