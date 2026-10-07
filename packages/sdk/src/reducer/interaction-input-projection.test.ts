import { asPlayerId } from "./per-player";
import { inputDefinitions } from "./input-test-fixtures";
import { createInputTestState } from "./input-test-fixtures";
import type { CollectorState, InputCollector } from "./model";
import { InteractionSteps } from "./authoring/steps";
import { evaluateStepPrefix } from "./bundle/trusted/step-prefix";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  formInput,
} from "./inputs";
import { collectInteractionInputs } from "./bundle/trusted/collector-domains";

describe("interaction input projection", () => {
  test("rejects domainless form collectors instead of emitting opaque inputs", () => {
    const interaction = {
      reduce: () => undefined,
      inputs: {
        // This shape is no longer constructible through public formInput
        // helpers, but projection still owns the runtime invariant.
        payload: {
          kind: "form" as const,
          schema: z.object({ value: z.string() }),
        },
      },
    };

    expect(() =>
      collectInteractionInputs(
        interaction,
        createInputTestState(),
        "player-1",
        { definitions: inputDefinitions },
      ),
    ).toThrow("has no renderable domain");
  });

  test("projected default form inputs are explicit renderable domains", () => {
    const interaction = {
      reduce: () => undefined,
      inputs: {
        mode: formInput.choice({
          choices: [{ value: "fast", label: "Fast" }],
          defaultValue: "fast",
        }),
      },
    };

    expect(
      collectInteractionInputs(
        interaction,
        createInputTestState(),
        "player-1",
        { definitions: inputDefinitions },
      ),
    ).toMatchObject([
      {
        key: "mode",
        domain: { type: "choice" },
        defaultValue: "fast",
      },
    ]);
  });

  test("choice defaults must be explicit projected choices, including null", () => {
    const nullableChoice = formInput.choice({
      choices: [
        { value: null, label: "No bonus" },
        { value: "bonus", label: "Bonus" },
      ],
      defaultValue: null,
    });

    expect(
      collectInteractionInputs(
        { inputs: { bonus: nullableChoice }, reduce: () => undefined },
        createInputTestState(),
        "player-1",
        { definitions: inputDefinitions },
      ),
    ).toMatchObject([
      {
        key: "bonus",
        domain: { type: "choice" },
        defaultValue: null,
      },
    ]);

    expect(() =>
      formInput.choice({
        choices: [{ value: "bonus", label: "Bonus" }],
        defaultValue: null,
      }),
    ).toThrow("defaultValue null must be one of its choices");
  });

  test("projected choice list inputs preserve an empty list default", () => {
    const interaction = {
      reduce: () => undefined,
      inputs: {
        selectedCardIds: formInput.choiceList({
          choices: [{ value: "card-a", label: "Card A" }],
          defaultValue: [],
        }),
      },
    };

    expect(
      collectInteractionInputs(
        interaction,
        createInputTestState(),
        "player-1",
        { definitions: inputDefinitions },
      ),
    ).toMatchObject([
      {
        key: "selectedCardIds",
        domain: { type: "choiceList" },
        defaultValue: [],
      },
    ]);
  });

  test("card and board targets project renderable domains", () => {
    const cardRule = cardTarget
      .zones<typeof stepState, "card-a" | "card-b">(["hand"], inputDefinitions)
      .where({
        id: "only-first",
        errorCode: "wrong-card",
        test: ({ targetId }) => targetId === "card-a",
      })
      .build();
    const boardRule = boardTarget
      .space<typeof stepState, "s1" | "s2">("main-board")
      .where({
        id: "only-space-a",
        errorCode: "wrong-space",
        test: ({ targetId }) => targetId === "s1",
      })
      .build();
    const inputs = {
      cardId: cardInput({ target: cardRule }),
      spaceId: boardInput.space({ target: boardRule }),
    };

    expect(
      collectInteractionInputs(
        { inputs, reduce: () => undefined },
        createInputTestState(),
        "player-1",
        { definitions: inputDefinitions },
      ),
    ).toMatchObject([
      {
        key: "cardId",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          eligibleTargets: ["card-a"],
        },
      },
      {
        key: "spaceId",
        domain: {
          type: "boardTarget",
          valueKind: "board-id",
          projection: "resolved",
          targetKind: "space",
          boardId: "main-board",
          eligibleTargets: ["s1"],
        },
      },
    ]);
  });
});

const stepState = createInputTestState();
const select = (values: readonly string[], defaultValue?: string) =>
  formInput.choice({
    choices: () => values.map((value) => ({ value, label: value })),
    defaultValue: () => defaultValue,
  });
function projectCurrent(
  steps: InteractionSteps<
    CollectorState,
    Record<string, InputCollector>,
    typeof inputDefinitions
  >,
  values: unknown[],
) {
  const evaluated = evaluateStepPrefix(
    steps,
    stepState,
    asPlayerId("player-1"),
    values,
    inputDefinitions,
  );
  const inputs = evaluated.current
    ? { [evaluated.current.key]: evaluated.current.collector }
    : {};
  return collectInteractionInputs(
    { inputs, reduce: () => undefined },
    stepState,
    "player-1",
    { definitions: inputDefinitions },
  );
}
describe("committed current input projection", () => {
  test("projects only the current domain, never future branch choices", () => {
    let futureCalls = 0;
    const steps = new InteractionSteps<
      CollectorState,
      Record<never, never>,
      typeof inputDefinitions
    >()
      .input("mode", select(["a", "b"]))
      .input("answer", ({ selected }) => {
        futureCalls++;
        return select([selected.mode + "-only"]);
      });
    expect(projectCurrent(steps, [])[0]?.key).toBe("mode");
    expect(futureCalls).toBe(0);
    expect(projectCurrent(steps, ["b"])).toMatchObject([
      { key: "answer", domain: { choices: [{ value: "b-only" }] } },
    ]);
  });
  test("defaults remain suggestions and do not advance committed progress", () => {
    const steps = new InteractionSteps<
      CollectorState,
      Record<never, never>,
      typeof inputDefinitions
    >()
      .input("mode", select(["a"], "a"))
      .input("answer", select(["b"]));
    expect(projectCurrent(steps, [])).toMatchObject([
      { key: "mode", defaultValue: "a" },
    ]);
    expect(
      evaluateStepPrefix(
        steps,
        stepState,
        asPlayerId("player-1"),
        [],
        inputDefinitions,
      ).values,
    ).toEqual([]);
  });
  test("undefined defaults keep the current value unfinished", () => {
    const steps = new InteractionSteps<
      CollectorState,
      Record<never, never>,
      typeof inputDefinitions
    >().input("mode", select(["a"]));
    expect(projectCurrent(steps, [])[0]).not.toHaveProperty("defaultValue");
  });
  for (const kind of ["card", "board-space"] as const) {
    test(`projects only the selected ${kind} target domain`, () => {
      const steps = new InteractionSteps<
        CollectorState,
        Record<never, never>,
        typeof inputDefinitions
      >()
        .input("mode", select(["a", "b"]))
        .input(
          "target",
          ({
            selected,
          }): InputCollector<
            z.ZodString,
            typeof stepState,
            "card" | "board-space"
          > =>
            kind === "card"
              ? {
                  kind: "card",
                  schema: z.string(),
                  meta: { targetKind: "card", zoneId: "hand" },
                  domain: () => ({
                    type: "cardTarget",
                    projection: "resolved",
                    targetKind: "card",
                    zoneIds: ["hand"],
                    eligibleTargets: [selected.mode],
                  }),
                }
              : {
                  kind: "board-space",
                  schema: z.string(),
                  meta: { targetKind: "space", boardId: "main" },
                  domain: () => ({
                    type: "boardTarget",
                    valueKind: "board-id",
                    projection: "resolved",
                    targetKind: "space",
                    boardId: "main",
                    eligibleTargets: [selected.mode],
                  }),
                },
        );
      expect(projectCurrent(steps, ["b"])).toMatchObject([
        {
          key: "target",
          domain: { projection: "resolved", eligibleTargets: ["b"] },
        },
      ]);
    });
  }
  test("empty next domains remain explicit and do not erase a valid selection", () => {
    const steps = new InteractionSteps<
      CollectorState,
      Record<never, never>,
      typeof inputDefinitions
    >()
      .input("mode", select(["a"]))
      .input("answer", select([]));
    expect(projectCurrent(steps, ["a"])).toMatchObject([
      { key: "answer", domain: { choices: [] } },
    ]);
    expect(
      evaluateStepPrefix(
        steps,
        stepState,
        asPlayerId("player-1"),
        ["a"],
        inputDefinitions,
      ).values,
    ).toEqual(["a"]);
  });
  test("large preceding domains never enumerate future branch combinations", () => {
    let calls = 0;
    const steps = new InteractionSteps<
      CollectorState,
      Record<never, never>,
      typeof inputDefinitions
    >()
      .input("mode", select(Array.from({ length: 1000 }, (_, i) => String(i))))
      .input("target", ({ selected }) => {
        calls++;
        return select([selected.mode]);
      });
    projectCurrent(steps, []);
    expect(calls).toBe(0);
    expect(projectCurrent(steps, ["999"])).toMatchObject([
      { key: "target", domain: { choices: [{ value: "999" }] } },
    ]);
    expect(calls).toBe(1);
  });
});
