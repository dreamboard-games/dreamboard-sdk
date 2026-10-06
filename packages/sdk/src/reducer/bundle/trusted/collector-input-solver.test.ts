import { perPlayerInstanceId } from "../../../shared/domain/per-player-instance.js";
import {
  createInputTestState,
  inputDefinitions,
} from "../../input-test-fixtures";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  formInput,
} from "../../inputs";
import { many } from "../../../reducer";
import {
  enumerateCollectorInputAssignments,
  hasAnyCollectorInputAssignment,
} from "./collector-input-solver";

const domainState = createInputTestState();

function finiteFormInteraction(options: { allBlocked?: boolean } = {}) {
  return {
    reduce: () => undefined,
    inputs: {
      mode: formInput.choice({
        choices: [{ value: "beta", label: "Beta" }],
        defaultValue: () => undefined,
      }),
      task: formInput.choice({
        choices: () =>
          options.allBlocked
            ? []
            : [
                { value: "two", label: "Two" },
                { value: "one", label: "One" },
              ],
        defaultValue: () => undefined,
      }),
    },
  };
}

describe("trusted collector input solver", () => {
  test("proves independent finite domains and enumerates canonical assignments", () => {
    const interaction = finiteFormInteraction();

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
      }),
    ).toEqual({ status: "yes" });

    const enumeration = enumerateCollectorInputAssignments({
      interaction: interaction,
      domainState: domainState,
      definitions: inputDefinitions,
      playerId: "player-1",
      maxEvaluations: 100,
    });
    expect(enumeration).toMatchObject({ status: "enumerated" });
    if (enumeration.status !== "enumerated") return;
    expect(enumeration.assignments).toEqual([
      { mode: "beta", task: "one" },
      { mode: "beta", task: "two" },
    ]);
  });

  test("returns no only after exhausting collector authority", () => {
    const interaction = finiteFormInteraction({ allBlocked: true });

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
      }),
    ).toMatchObject({ status: "no" });
    expect(
      enumerateCollectorInputAssignments({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        maxEvaluations: 100,
      }),
    ).toMatchObject({ status: "enumerated", assignments: [] });
  });

  test("filters every complete assignment through trusted acceptance", () => {
    const interaction = finiteFormInteraction();
    const evaluatedForActionability: Readonly<Record<string, unknown>>[] = [];

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        acceptsAssignment: (assignment) => {
          evaluatedForActionability.push(assignment);
          return assignment.task === "two";
        },
      }),
    ).toEqual({ status: "yes" });
    expect(evaluatedForActionability).toEqual([
      { mode: "beta", task: "one" },
      { mode: "beta", task: "two" },
    ]);

    expect(
      enumerateCollectorInputAssignments({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        acceptsAssignment: (assignment) => assignment.task === "two",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      status: "enumerated",
      assignments: [{ mode: "beta", task: "two" }],
    });
    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        acceptsAssignment: () => false,
      }),
    ).toEqual({ status: "no", inputKey: "mode" });
  });

  test("keeps actionability independent from the enumeration budget", () => {
    const interaction = finiteFormInteraction();

    expect(
      enumerateCollectorInputAssignments({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        maxEvaluations: 1,
      }),
    ).toMatchObject({ status: "budget", assignments: [], evaluated: 1 });
    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
      }),
    ).toEqual({ status: "yes" });
  });

  test("distinguishes opaque and unbounded domains from proven emptiness", () => {
    const opaqueInteraction = {
      reduce: () => undefined,
      inputs: {},
      paramsSchema: z.object({ answer: z.string() }),
    };
    expect(
      hasAnyCollectorInputAssignment({
        interaction: opaqueInteraction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
      }),
    ).toEqual({ status: "notEnumerable" });

    const unboundedInteraction = {
      reduce: () => undefined,
      inputs: {
        tags: many(
          formInput.choice({
            choices: [{ value: "tag", label: "Tag" }],
            defaultValue: "tag",
          }),
          { min: 0 },
        ),
      },
    };
    expect(
      hasAnyCollectorInputAssignment({
        interaction: unboundedInteraction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
      }),
    ).toEqual({ status: "yes" });
    expect(
      enumerateCollectorInputAssignments({
        interaction: unboundedInteraction,
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      status: "notEnumerable",
      assignments: [],
      inputKey: "tags",
    });
  });

  test("rejects invalid evaluation budgets before touching collector state", () => {
    expect(() =>
      enumerateCollectorInputAssignments({
        interaction: finiteFormInteraction(),
        domainState: domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        maxEvaluations: 0,
      }),
    ).toThrow("maxEvaluations must be a positive safe integer");
  });

  test("enumerates submit-ready board and card values from collector authority", () => {
    const playerSpace = boardInput.playerSpace({
      target: boardTarget
        .playerSpace("workshop-mat")
        .where({
          id: "own-open-space",
          errorCode: "SPACE_BLOCKED",
          test: ({ playerId, targetId: target, q }) =>
            q.board(target.boardId).state.playerId === playerId &&
            target.spaceId === "s1",
        })
        .build(),
    });
    const card = cardInput({
      target: cardTarget
        .zones(["hand"] as const)
        .where({
          id: "playable-card",
          errorCode: "CARD_BLOCKED",
          test: ({ targetId }) => targetId === "card-a",
        })
        .build(),
    });
    const interaction = {
      inputs: { playerSpace, card },
      reduce: () => undefined,
    };
    const enumeration = enumerateCollectorInputAssignments({
      interaction: interaction,
      domainState,
      definitions: inputDefinitions,
      playerId: "player-1",
      acceptsAssignment: (assignment) =>
        playerSpace.schema.safeParse(assignment.playerSpace).success &&
        card.schema.safeParse(assignment.card).success,
      maxEvaluations: 100,
    });

    expect(enumeration).toMatchObject({ status: "enumerated" });
    if (enumeration.status !== "enumerated") return;
    expect(enumeration.assignments).toEqual([
      {
        card: "card-a",
        playerSpace: {
          boardId: perPlayerInstanceId("board", "workshop-mat", "player-1"),
          spaceId: "s1",
        },
      },
    ]);
  });
});
