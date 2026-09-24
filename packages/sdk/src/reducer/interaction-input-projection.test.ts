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
      inputs: {
        // This shape is no longer constructible through public formInput
        // helpers, but projection still owns the runtime invariant.
        payload: {
          kind: "form",
          schema: z.object({ value: z.string() }),
        },
      },
    };

    expect(() =>
      collectInteractionInputs(
        interaction as never,
        {
          table: {},
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
      ),
    ).toThrow("has no renderable domain");
  });

  test("projected default form inputs are explicit renderable domains", () => {
    const interaction = {
      inputs: {
        mode: formInput.choice({
          choices: [{ value: "fast", label: "Fast" }],
          defaultValue: "fast",
        }),
      },
    };

    expect(
      collectInteractionInputs(
        interaction as never,
        {
          table: {},
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
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
        { inputs: { bonus: nullableChoice } } as never,
        {
          table: {},
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
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
      inputs: {
        selectedCardIds: formInput.choiceList({
          choices: [{ value: "card-a", label: "Card A" }],
          defaultValue: [],
        }),
      },
    };

    expect(
      collectInteractionInputs(
        interaction as never,
        {
          table: {},
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
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
      .zones<
        {
          table: {
            playerOrder: string[];
            hands: Record<string, unknown>;
            zones: {
              perPlayer: Record<string, unknown>;
              shared: Record<string, unknown>;
            };
          };
          flow: { currentPhase: string };
        },
        "card-1" | "card-2"
      >(["hand"])
      .where({
        id: "only-first",
        errorCode: "wrong-card",
        test: ({ targetId }) => targetId === "card-1",
      })
      .build();
    const boardRule = boardTarget
      .space<
        { table: { playerOrder: string[] }; flow: { currentPhase: string } },
        "space-a" | "space-b"
      >("main-board")
      .where({
        id: "only-space-a",
        errorCode: "wrong-space",
        test: ({ targetId }) => targetId === "space-a",
      })
      .build();
    const inputs = {
      cardId: cardInput({ target: cardRule }),
      spaceId: boardInput.space({ target: boardRule }),
    };

    expect(
      collectInteractionInputs(
        { inputs } as never,
        {
          table: {
            playerOrder: ["player-1"],
            hands: { hand: {} },
            zones: { perPlayer: {}, shared: {} },
          },
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
        {
          queries: {
            zone: { playerCards: () => ["card-1", "card-2"] },
            board: () => ({
              state: { layout: "generic", spaces: ["space-a", "space-b"] },
            }),
          } as never,
        },
      ),
    ).toMatchObject([
      {
        key: "cardId",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          eligibleTargets: ["card-1"],
        },
      },
      {
        key: "spaceId",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "space",
          boardId: "main-board",
          eligibleTargets: ["space-a"],
        },
      },
    ]);
  });
});

const stepState = { table: {}, flow: { currentPhase: "play" } };
const select = (values: readonly string[], defaultValue?: string) =>
  formInput.choice({
    choices: () => values.map((value) => ({ value, label: value })),
    defaultValue: () => defaultValue,
  });
function projectCurrent(
  steps: InteractionSteps<
    typeof stepState,
    Record<string, import("./model").InputCollector>
  >,
  values: unknown[],
) {
  const evaluated = evaluateStepPrefix(steps, stepState, "player-1", values);
  const inputs = evaluated.current
    ? { [evaluated.current.key]: evaluated.current.collector }
    : {};
  return collectInteractionInputs({ inputs } as never, stepState, "player-1");
}
describe("committed current input projection", () => {
  test("projects only the current domain, never future branch choices", () => {
    let futureCalls = 0;
    const steps = new InteractionSteps<typeof stepState>()
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
    const steps = new InteractionSteps<typeof stepState>()
      .input("mode", select(["a"], "a"))
      .input("answer", select(["b"]));
    expect(projectCurrent(steps, [])).toMatchObject([
      { key: "mode", defaultValue: "a" },
    ]);
    expect(evaluateStepPrefix(steps, stepState, "player-1", []).values).toEqual(
      [],
    );
  });
  test("undefined defaults keep the current value unfinished", () => {
    const steps = new InteractionSteps<typeof stepState>().input(
      "mode",
      select(["a"]),
    );
    expect(projectCurrent(steps, [])[0]).not.toHaveProperty("defaultValue");
  });
  for (const kind of ["card", "board-space"] as const) {
    test(`projects only the selected ${kind} target domain`, () => {
      const steps = new InteractionSteps<typeof stepState>()
        .input("mode", select(["a", "b"]))
        .input(
          "target",
          ({ selected }) =>
            ({
              kind,
              schema: z.string(),
              meta:
                kind === "card"
                  ? { targetKind: "card", zoneId: "hand" }
                  : { targetKind: "space", boardId: "main" },
              domain: () =>
                kind === "card"
                  ? {
                      type: "cardTarget",
                      projection: "resolved",
                      targetKind: "card",
                      zoneIds: ["hand"],
                      eligibleTargets: [selected.mode],
                    }
                  : {
                      type: "boardTarget",
                      projection: "resolved",
                      targetKind: "space",
                      boardId: "main",
                      eligibleTargets: [selected.mode],
                    },
            }) as never,
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
    const steps = new InteractionSteps<typeof stepState>()
      .input("mode", select(["a"]))
      .input("answer", select([]));
    expect(projectCurrent(steps, ["a"])).toMatchObject([
      { key: "answer", domain: { choices: [] } },
    ]);
    expect(
      evaluateStepPrefix(steps, stepState, "player-1", ["a"]).values,
    ).toEqual(["a"]);
  });
  test("large preceding domains never enumerate future branch combinations", () => {
    let calls = 0;
    const steps = new InteractionSteps<typeof stepState>()
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
