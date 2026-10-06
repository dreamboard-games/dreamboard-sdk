import { perPlayerInstanceId } from "../../../shared/domain/per-player-instance.js";
import { isBoardSpaceTarget } from "../../../shared/board-target.js";
import { inputDefinitions } from "../../input-test-fixtures";
import { describe, expect, test } from "vitest";
import { InteractionSteps } from "../../authoring/steps";
import { formInput, boardInput, boardTarget, rngInput } from "../../inputs";
import { many } from "../../../reducer";
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
      evaluateStepPrefix(steps, state, "player-1", ["a", "a"], inputDefinitions)
        .values,
    ).toEqual(["a", "a"]);
    expect(
      evaluateStepPrefix(
        steps,
        { ...state, allowed: false },
        "player-1",
        ["a", "a"],
        inputDefinitions,
      ).values,
    ).toEqual(["a"]);
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        ["bad", "a"],
        inputDefinitions,
      ).values,
    ).toEqual([]);
    const emptyNext = evaluateStepPrefix(
      steps,
      { ...state, allowed: false },
      "player-1",
      ["a"],
      inputDefinitions,
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
      evaluateStepPrefix(optional, state, "player-1", [null], inputDefinitions)
        .complete,
    ).toBe(true);
    expect(
      evaluateStepPrefix(
        optional,
        state,
        "player-1",
        [undefined],
        inputDefinitions,
      ).complete,
    ).toBe(false);
    const steps = new InteractionSteps<typeof state>().input(
      "cards",
      many(choice(["a", "b", "c"]), { min: 2, max: 2, distinct: true }),
    );
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        [["a", "b"]],
        inputDefinitions,
      ).complete,
    ).toBe(true);
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        [["a", "a"]],
        inputDefinitions,
      ).values,
    ).toEqual([]);
    expect(
      evaluateStepPrefix(steps, state, "player-1", [["a"]], inputDefinitions)
        .values,
    ).toEqual([]);
  });

  test("accepts complete player-board targets and rejects scalar, seat, and board forgeries", () => {
    const target = boardTarget
      .playerSpace<typeof state, "home", "slot">("home")
      .build();
    const collector = boardInput.playerSpace({ target });
    // A target authority scoped to the submitting player's own board.
    const scoped = {
      ...collector,
      eligibleTargets: () => [
        {
          boardId: perPlayerInstanceId("board", "home", "player-1"),
          spaceId: "slot",
        },
      ],
      domain: () => ({
        type: "boardTarget" as const,
        projection: "resolved" as const,
        targetKind: "space" as const,
        boardBaseId: "home",
        valueKind: "board-space" as const,
        eligibleTargets: [
          {
            boardId: perPlayerInstanceId("board", "home", "player-1"),
            spaceId: "slot",
          },
        ],
      }),
      validateTarget: (
        _state: unknown,
        playerId: string,
        _q: unknown,
        value: unknown,
      ) => {
        return isBoardSpaceTarget(value) &&
          value.boardId === perPlayerInstanceId("board", "home", playerId)
          ? null
          : { errorCode: "WRONG_SEAT" };
      },
    };
    const steps = new InteractionSteps<typeof state>().input("space", scoped);
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        [
          {
            boardId: perPlayerInstanceId("board", "home", "player-1"),
            spaceId: "slot",
          },
        ],
        inputDefinitions,
      ).selected,
    ).toEqual({
      space: {
        boardId: perPlayerInstanceId("board", "home", "player-1"),
        spaceId: "slot",
      },
    });
    expect(
      evaluateStepPrefix(steps, state, "player-1", ["slot"], inputDefinitions)
        .complete,
    ).toBe(false);
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        [
          {
            boardId: perPlayerInstanceId("board", "home", "player-2"),
            spaceId: "slot",
          },
        ],
        inputDefinitions,
      ).complete,
    ).toBe(false);
    expect(
      evaluateStepPrefix(
        steps,
        state,
        "player-1",
        [
          {
            boardId: perPlayerInstanceId("board", "other", "player-1"),
            spaceId: "slot",
          },
        ],
        inputDefinitions,
      ).complete,
    ).toBe(false);
  });

  test("rejects duplicate names and RNG collectors even when types are bypassed", () => {
    const steps = new InteractionSteps<typeof state>().input(
      "value",
      choice(["a"]),
    );
    expect(() => {
      // @ts-expect-error Deliberately duplicate an authored key to verify runtime rejection.
      steps.input("value", choice(["b"]));
    }).toThrow("Duplicate");
    const rng = rngInput.d6();
    expect(() => {
      // @ts-expect-error RNG collectors are forbidden in user-authored steps.
      new InteractionSteps().input("roll", rng);
    }).toThrow("RNG");
    const dynamic = new InteractionSteps<typeof state>().input(
      "roll",
      // @ts-expect-error A dynamic collector must also reject RNG at runtime.
      () => rng,
    );
    expect(() =>
      evaluateStepPrefix(dynamic, state, "player-1", [], inputDefinitions),
    ).toThrow("RNG");
  });
});
