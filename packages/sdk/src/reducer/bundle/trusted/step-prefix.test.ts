import { describe, expect, test } from "vitest";
import { z } from "zod";
import { InteractionSteps } from "../../authoring/steps";
import { formInput, many, boardInput, boardTarget } from "../../internal";
import { createTable } from "../../lifecycle-test-fixtures";
import { evaluateStepPrefix } from "./step-prefix";

const state = {
  table: createTable(),
  flow: { currentPhase: "play" },
  allowed: true,
};
const choice = (values: readonly (string | null)[]) =>
  formInput.choice({
    choices: () => values.map((value) => ({ value, label: String(value) })),
    defaultValue: () => undefined,
  });

describe("ordered committed prefix evaluation", () => {
  test("retains a valid prefix and truncates only the first invalid suffix", () => {
    const steps = new InteractionSteps<typeof state>()
      .input("first", choice(["a", "b"]))
      .input("second", ({ selected, state }) =>
        choice(state.allowed ? [selected.first] : []),
      )
      .input("last", choice([null]));
    expect(
      evaluateStepPrefix(steps, state, "player-1", ["a", "a"]).values,
    ).toEqual(["a", "a"]);
    expect(
      evaluateStepPrefix(steps, { ...state, allowed: false }, "player-1", [
        "a",
        "a",
      ]).values,
    ).toEqual(["a"]);
    expect(
      evaluateStepPrefix(steps, state, "player-1", ["bad", "a"]).values,
    ).toEqual([]);
    const emptyNext = evaluateStepPrefix(
      steps,
      { ...state, allowed: false },
      "player-1",
      ["a"],
    );
    expect(emptyNext.issue).toBeUndefined();
    expect(emptyNext.current?.key).toBe("second");
  });

  test("explicit null is committed, undefined is not, and many selections are atomic", () => {
    const optional = new InteractionSteps<typeof state>().input(
      "none",
      choice([null]),
    );
    expect(
      evaluateStepPrefix(optional, state, "player-1", [null]).complete,
    ).toBe(true);
    expect(
      evaluateStepPrefix(optional, state, "player-1", [undefined]).complete,
    ).toBe(false);
    const steps = new InteractionSteps<typeof state>().input(
      "cards",
      many(choice(["a", "b", "c"]), { min: 2, max: 2, distinct: true }),
    );
    expect(
      evaluateStepPrefix(steps, state, "player-1", [["a", "b"]]).complete,
    ).toBe(true);
    expect(
      evaluateStepPrefix(steps, state, "player-1", [["a", "a"]]).values,
    ).toEqual([]);
    expect(
      evaluateStepPrefix(steps, state, "player-1", [["a"]]).values,
    ).toEqual([]);
  });

  test("normalizes per-player board wire strings and rejects another seat or board", () => {
    const target = boardTarget
      .playerSpace<typeof state, "home", "slot">("home")
      .build();
    const collector = boardInput.playerSpace({ target });
    // A target authority scoped to the submitting player's own board.
    const scoped = {
      ...collector,
      eligibleTargets: () => [
        { boardId: "home", playerId: "player-1", spaceId: "slot" },
      ],
      domain: () => ({
        type: "boardTarget" as const,
        projection: "resolved" as const,
        targetKind: "space" as const,
        boardId: "home",
        valueKind: "player-board-space" as const,
        eligibleTargets: ["slot"],
      }),
      validateTarget: (
        _state: unknown,
        playerId: string,
        _q: unknown,
        value: unknown,
      ) => {
        const target = value as { playerId: string };
        return target.playerId === playerId
          ? null
          : { errorCode: "WRONG_SEAT" };
      },
    };
    const steps = new InteractionSteps<typeof state>().input("space", scoped);
    expect(
      evaluateStepPrefix(steps, state, "player-1", ["slot"]).selected,
    ).toEqual({
      space: { boardId: "home", playerId: "player-1", spaceId: "slot" },
    });
    expect(
      evaluateStepPrefix(steps, state, "player-1", [
        { boardId: "home", playerId: "player-2", spaceId: "slot" },
      ]).complete,
    ).toBe(false);
    expect(
      evaluateStepPrefix(steps, state, "player-1", [
        { boardId: "other", playerId: "player-1", spaceId: "slot" },
      ]).complete,
    ).toBe(false);
  });

  test("rejects duplicate names and RNG collectors even when types are bypassed", () => {
    const steps = new InteractionSteps<typeof state>().input(
      "value",
      choice(["a"]),
    );
    expect(() => steps.input("value" as never, choice(["b"]))).toThrow(
      "Duplicate",
    );
    const rng = {
      kind: "rng",
      schema: z.number(),
      meta: { rng: "d6", count: 1 },
    };
    expect(() => new InteractionSteps().input("roll", rng as never)).toThrow(
      "RNG",
    );
    const dynamic = new InteractionSteps<typeof state>().input(
      "roll",
      (() => rng) as never,
    );
    expect(() => evaluateStepPrefix(dynamic, state, "player-1", [])).toThrow(
      "RNG",
    );
  });
});
