import { describe, expect, test } from "vitest";
import { createExpectApi } from "./create-expect-api.ts";
import type { InteractionDescriptorLike } from "./definitions.ts";
import {
  SCENARIO_ASSERTION_ERROR_CODE,
  ScenarioAssertionError,
} from "./scenario-assertion-error.ts";

function makeDescriptor(
  descriptor: Partial<InteractionDescriptorLike>,
): InteractionDescriptorLike {
  return {
    interactionId: "placeThingCard",
    availability: { status: "available" },
    kind: "choose-zone",
    surface: "board",
    context: { to: "player-1" },
    ...descriptor,
  };
}

describe("createExpectApi — value matchers", () => {
  const expectFn = createExpectApi();

  test("all built-in matcher mismatches use the typed scenario assertion error", () => {
    const mismatches: readonly (() => unknown)[] = [
      () => expectFn(1).toBe(2),
      () => expectFn({ a: 1 }).toEqual({ a: 2 }),
      () => expectFn({ a: 1 }).toMatchObject({ a: 2 }),
      () => expectFn(undefined).toBeDefined(),
      () => expectFn(1).toBeUndefined(),
      () => expectFn(1).toBeNull(),
      () => expectFn([]).toContain("missing"),
      () => expectFn(1).toContain(1),
      () => expectFn([]).toContainEqual({ id: "missing" }),
      () => expectFn(1).toContainEqual(1),
      () => expectFn([]).toHaveLength(1),
      () => expectFn(1).toHaveLength(1),
      () => expectFn(1).toBeGreaterThan(1),
      () => expectFn("1").toBeGreaterThan(1),
      () => expectFn(0).toBeGreaterThanOrEqual(1),
      () => expectFn("1").toBeGreaterThanOrEqual(1),
      () => expectFn(null).toThrow(),
      () => expectFn(() => undefined).toThrow(),
      () =>
        expectFn(() => {
          throw new Error("actual");
        }).toThrow("expected"),
      () => expectFn({}).toMatchSnapshot(),
    ];

    for (const mismatch of mismatches) {
      expect(mismatch).toThrow(ScenarioAssertionError);
      try {
        mismatch();
      } catch (error) {
        expect(error).toMatchObject({
          name: "ScenarioAssertionError",
          code: SCENARIO_ASSERTION_ERROR_CODE,
        });
      }
    }
  });

  test("does not wrap a generic exception thrown by an authored predicate", () => {
    const unexpected = new Error("predicate crashed");
    let caught: unknown;

    try {
      expectFn(() => {
        throw new Error("actual");
      }).toThrow(() => {
        throw unexpected;
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(unexpected);
  });

  test("toBe passes on strict equality and throws otherwise", () => {
    expectFn(1).toBe(1);
    expect(() => expectFn(1).toBe(2)).toThrow();
  });

  test("toEqual performs deep equality", () => {
    expectFn({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
    expect(() => expectFn({ a: 1 }).toEqual({ a: 2 })).toThrow();
  });

  test("toMatchObject allows partial matches", () => {
    expectFn({ a: 1, b: 2, nested: { c: 3 } }).toMatchObject({
      a: 1,
      nested: { c: 3 },
    });
    expect(() => expectFn({ a: 1 }).toMatchObject({ a: 2 })).toThrow();
    expect(() => expectFn({ a: 1 }).toMatchObject({ b: 1 })).toThrow();
  });

  test("toBeDefined / toBeUndefined / toBeNull", () => {
    expectFn(1).toBeDefined();
    expectFn(undefined).toBeUndefined();
    expectFn(null).toBeNull();
    expect(() => expectFn(undefined).toBeDefined()).toThrow();
    expect(() => expectFn(1).toBeUndefined()).toThrow();
    expect(() => expectFn(1).toBeNull()).toThrow();
  });

  test("toContain works for arrays and strings", () => {
    expectFn([1, 2, 3]).toContain(2);
    expectFn("hello world").toContain("world");
    expect(() => expectFn([1, 2, 3]).toContain(4)).toThrow();
    expect(() => expectFn("hello").toContain("world")).toThrow();
    expect(() => expectFn(42 as unknown).toContain(1)).toThrow();
  });

  test("toContainEqual checks deep equality in arrays", () => {
    expectFn([{ id: "a" }, { id: "b" }]).toContainEqual({ id: "a" });
    expect(() => expectFn([{ id: "a" }]).toContainEqual({ id: "b" })).toThrow();
  });

  test("toHaveLength checks numeric length", () => {
    expectFn([1, 2, 3]).toHaveLength(3);
    expectFn("abcd").toHaveLength(4);
    expect(() => expectFn([1]).toHaveLength(2)).toThrow();
    expect(() => expectFn(42 as unknown).toHaveLength(0)).toThrow();
  });

  test("toBeGreaterThanOrEqual checks numeric ordering", () => {
    expectFn(5).toBeGreaterThanOrEqual(5);
    expectFn(6).toBeGreaterThanOrEqual(5);
    expect(() => expectFn(4).toBeGreaterThanOrEqual(5)).toThrow();
    expect(() =>
      expectFn("five" as unknown).toBeGreaterThanOrEqual(1),
    ).toThrow();
  });

  test("toBeGreaterThan checks numeric ordering", () => {
    expectFn(6).toBeGreaterThan(5);
    expect(() => expectFn(5).toBeGreaterThan(5)).toThrow();
    expect(() => expectFn("five" as unknown).toBeGreaterThan(1)).toThrow();
  });

  test("toThrow with predicate variants", () => {
    expectFn(() => {
      throw new Error("boom");
    }).toThrow();
    expectFn(() => {
      throw new Error("boom");
    }).toThrow("boom");
    expectFn(() => {
      throw new Error("boom");
    }).toThrow(/bo/);
    expectFn(() => {
      throw new Error("boom");
    }).toThrow((error) => error.message.startsWith("boo"));
    expect(() => expectFn(() => undefined).toThrow()).toThrow();
    expect(() =>
      expectFn(() => {
        throw new Error("boom");
      }).toThrow("baz"),
    ).toThrow();
  });
});

describe("createExpectApi — rejection matcher", () => {
  const expectFn = createExpectApi();

  function makeError(errorCode: string, message = "rejected"): Error {
    const err = new Error(message);
    (err as Error & { errorCode?: string }).errorCode = errorCode;
    return err;
  }

  test("toRejectWith passes when errorCode matches", async () => {
    await expectFn(async () => {
      throw makeError("CARD_NOT_IN_HAND");
    }).toRejectWith({ errorCode: "CARD_NOT_IN_HAND" });
  });

  test("toRejectWith fails when the function resolves", async () => {
    await expect(
      expectFn(async () => undefined).toRejectWith({}),
    ).rejects.toBeInstanceOf(ScenarioAssertionError);
  });

  test("toRejectWith fails when errorCode mismatches", async () => {
    await expect(
      expectFn(async () => {
        throw makeError("OTHER");
      }).toRejectWith({ errorCode: "EXPECTED" }),
    ).rejects.toBeInstanceOf(ScenarioAssertionError);
  });

  test("toRejectWith appends the last diagnostic rejection", async () => {
    const expectWithDiagnostics = createExpectApi({
      lastDiagnosticRejection: () => ({
        type: "submitRejected",
        submissionId: "sub-1",
        errorCode: "OTHER",
        ruleId: "enough-gold",
        message: "Need gold.",
      }),
    });

    await expect(
      expectWithDiagnostics(async () => {
        throw makeError("OTHER");
      }).toRejectWith({ errorCode: "EXPECTED" }),
    ).rejects.toThrow(/last rejection: errorCode=OTHER ruleId=enough-gold/);
  });

  test("toRejectWith supports regex messages", async () => {
    await expectFn(async () => {
      throw makeError("X", "boom happened");
    }).toRejectWith({ message: /boom/ });
  });

  test("toRejectWith accepts a structured clone-probe rejection", async () => {
    await expectFn({
      kind: "rejected",
      errorCode: "NOT_YOUR_TURN",
      message: "Wait for your turn.",
    }).toRejectWith({
      errorCode: "NOT_YOUR_TURN",
      message: /your turn/,
    });
    expect(() =>
      expectFn({ kind: "accepted" }).toRejectWith({
        errorCode: "NOT_YOUR_TURN",
      }),
    ).toThrow(/was accepted/);
  });
});

describe("createExpectApi — descriptor matchers", () => {
  const expectFn = createExpectApi();

  test("toHaveInteraction finds a descriptor by interactionId", () => {
    const descriptors = [
      makeDescriptor({ interactionId: "placeThingCard" }),
      makeDescriptor({ interactionId: "judgeCard" }),
    ];
    expectFn(descriptors).toHaveInteraction("placeThingCard");
    expect(() => expectFn(descriptors).toHaveInteraction("unknown")).toThrow();
  });

  test("toHaveInteraction supports partial descriptor matching", () => {
    const descriptors = [
      makeDescriptor({
        interactionId: "placeThingCard",
        availability: { status: "available" },
      }),
    ];
    expectFn(descriptors).toHaveInteraction("placeThingCard", {
      availability: { status: "available" },
    });
    expect(() =>
      expectFn(descriptors).toHaveInteraction("placeThingCard", {
        availability: { status: "notYourTurn", reason: "NOT_YOUR_TURN" },
      }),
    ).toThrow();
  });

  test("not.toHaveInteraction passes when missing", () => {
    const descriptors = [makeDescriptor({ interactionId: "placeThingCard" })];
    expectFn(descriptors).not.toHaveInteraction("missing");
    expect(() =>
      expectFn(descriptors).not.toHaveInteraction("placeThingCard"),
    ).toThrow();
  });

  test("toBeGatedBy asserts unavailable descriptor with a reason", () => {
    const descriptor = makeDescriptor({
      interactionId: "placeThingCard",
      availability: { status: "notYourTurn", reason: "NOT_YOUR_TURN" },
    });
    expectFn(descriptor).toBeGatedBy("NOT_YOUR_TURN");
    expect(() => expectFn(descriptor).toBeGatedBy("OTHER")).toThrow();
  });

  test("toBeGatedBy on array requires interactionId option", () => {
    const descriptors = [
      makeDescriptor({
        interactionId: "placeThingCard",
        availability: { status: "notYourTurn", reason: "NOT_YOUR_TURN" },
      }),
    ];
    expectFn(descriptors).toBeGatedBy("NOT_YOUR_TURN", {
      interactionId: "placeThingCard",
    });
    expect(() => expectFn(descriptors).toBeGatedBy("NOT_YOUR_TURN")).toThrow();
  });

  test("toBeAvailable embeds explanation details in failure output", () => {
    const descriptor = makeDescriptor({
      interactionId: "buildCamp",
      availability: { status: "blocked", reason: "Need wood." },
    });
    expect(() =>
      expectFn(descriptor).toBeAvailable({
        interactionId: "buildCamp",
        phase: "playerTurn",
        step: null,
        availability: "blocked",
        actor: { required: ["player-1"], playerIsActor: true },
        rules: [
          {
            ruleId: "can-afford-camp",
            outcome: "failed",
            errorCode: "INSUFFICIENT_RESOURCES",
            message: "Need wood.",
          },
        ],
        inputs: [{ key: "vertexId", kind: "board-vertex", eligibleCount: 3 }],
      }),
    ).toThrow(
      /rule can-afford-camp failed \(INSUFFICIENT_RESOURCES\): Need wood\./,
    );
  });

  test("toBeActiveFor asserts descriptor targets a player and is available", () => {
    const descriptor = makeDescriptor({
      interactionId: "placeThingCard",
      availability: { status: "available" },
      context: { to: "player-1" },
    });
    expectFn(descriptor).toBeActiveFor("player-1");
    expect(() => expectFn(descriptor).toBeActiveFor("player-2")).toThrow();

    const unavailable = makeDescriptor({
      interactionId: "placeThingCard",
      availability: { status: "notYourTurn", reason: "NOT_YOUR_TURN" },
      context: { to: "player-1" },
    });
    expect(() => expectFn(unavailable).toBeActiveFor("player-1")).toThrow();
  });

  test("toBeActiveFor on array finds by interactionId", () => {
    const descriptors = [
      makeDescriptor({
        interactionId: "placeThingCard",
        availability: { status: "available" },
        context: { to: "player-1" },
      }),
    ];
    expectFn(descriptors).toBeActiveFor("player-1", {
      interactionId: "placeThingCard",
    });
    expect(() => expectFn(descriptors).toBeActiveFor("player-1")).toThrow();
  });
});

describe("createExpectApi — snapshot matcher", () => {
  test("toMatchSnapshot delegates to the configured handler", () => {
    const calls: Array<{ name: string | undefined; actual: unknown }> = [];
    const expectFn = createExpectApi({
      matchSnapshot: (name, actual) => {
        calls.push({ name, actual });
      },
    });
    expectFn({ a: 1 }).toMatchSnapshot();
    expectFn({ a: 2 }).toMatchSnapshot("seat-1.projection");
    expect(calls).toEqual([
      { name: undefined, actual: { a: 1 } },
      { name: "seat-1.projection", actual: { a: 2 } },
    ]);
  });

  test("toMatchSnapshot throws when no handler is configured", () => {
    const expectFn = createExpectApi();
    expect(() => expectFn({ a: 1 }).toMatchSnapshot()).toThrow();
  });
});
