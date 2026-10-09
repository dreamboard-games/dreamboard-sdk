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

  function selectionInteraction(
    options: Parameters<typeof many>[1] = {
      min: 1,
      distinct: true,
    },
  ) {
    return {
      reduce: () => undefined,
      inputs: {
        cards: many(
          formInput.choice({
            defaultValue: "card-01",
            choices: Array.from({ length: 36 }, (_, index) => ({
              value: `card-${String(index + 1).padStart(2, "0")}`,
              label: `Card ${index + 1}`,
            })),
          }),
          options,
        ),
      },
    };
  }

  test("finds a selected card in a full deck without materializing every group", () => {
    expect(
      hasAnyCollectorInputAssignment({
        interaction: selectionInteraction(),
        domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        initialValues: { cards: "card-36" },
        acceptsAssignment: ({ cards }) =>
          Array.isArray(cards) && cards.includes("card-36"),
      }),
    ).toEqual({ status: "yes" });
  });

  test("rejects a missing selected card without traversing the full deck power set", () => {
    expect(
      hasAnyCollectorInputAssignment({
        interaction: selectionInteraction(),
        domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        initialValues: { cards: "missing-card" },
      }),
    ).toEqual({ status: "no", inputKey: "cards" });
  });

  test("validates a complete full-deck selection directly and preserves its order", () => {
    const cards = Array.from(
      { length: 36 },
      (_, index) => `card-${String(36 - index).padStart(2, "0")}`,
    );
    const options = {
      interaction: selectionInteraction(),
      domainState,
      definitions: inputDefinitions,
      playerId: "player-1",
      initialValues: { cards },
    };
    expect(hasAnyCollectorInputAssignment(options)).toEqual({ status: "yes" });
    expect(
      enumerateCollectorInputAssignments({ ...options, maxEvaluations: 2 }),
    ).toEqual({ status: "enumerated", assignments: [{ cards }], evaluated: 2 });
    expect(
      hasAnyCollectorInputAssignment({
        ...options,
        acceptsAssignment: () => false,
      }),
    ).toEqual({ status: "no", inputKey: "cards" });
  });

  test.each([
    { cards: [], selection: { min: 1, distinct: true } },
    { cards: ["card-01", "card-01"], selection: { min: 1, distinct: true } },
    { cards: ["card-01", "missing-card"], selection: { min: 1 } },
    { cards: ["card-01"], selection: { count: 2 } },
    { cards: ["card-01", "card-02", "card-03"], selection: { min: 1, max: 2 } },
    { cards: [42], selection: { min: 1 } },
  ])(
    "rejects invalid fixed selections: $cards with $selection",
    ({ cards, selection }) => {
      expect(
        hasAnyCollectorInputAssignment({
          interaction: selectionInteraction(selection),
          domainState,
          definitions: inputDefinitions,
          playerId: "player-1",
          initialValues: { cards },
        }),
      ).toEqual({ status: "no", inputKey: "cards" });
    },
  );

  test("accepts repeated fixed values when the selection permits them", () => {
    expect(
      hasAnyCollectorInputAssignment({
        interaction: selectionInteraction({ min: 2 }),
        domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        initialValues: { cards: ["card-01", "card-01"] },
      }),
    ).toEqual({ status: "yes" });
  });

  test("rejects fixed values excluded by current collector eligibility", () => {
    const interaction = {
      reduce: () => undefined,
      inputs: {
        cards: many(
          cardInput({
            target: cardTarget
              .zones(["hand"] as const, inputDefinitions)
              .where({
                id: "playable-card",
                errorCode: "CARD_BLOCKED",
                test: ({ targetId }) => targetId === "card-a",
              })
              .build(),
          }),
          { min: 1, distinct: true },
        ),
      },
    };
    const options = {
      interaction,
      domainState,
      definitions: inputDefinitions,
      playerId: "player-1",
    };
    expect(
      hasAnyCollectorInputAssignment({
        ...options,
        initialValues: { cards: ["card-a"] },
      }),
    ).toEqual({ status: "yes" });
    expect(
      hasAnyCollectorInputAssignment({
        ...options,
        initialValues: { cards: ["card-b"] },
      }),
    ).toEqual({ status: "no", inputKey: "cards" });
  });

  test("keeps all matching group witnesses available after the first is rejected", () => {
    expect(
      hasAnyCollectorInputAssignment({
        interaction: selectionInteraction({ count: 2, distinct: true }),
        domainState,
        definitions: inputDefinitions,
        playerId: "player-1",
        initialValues: { cards: "card-36" },
        acceptsAssignment: ({ cards }) =>
          JSON.stringify(cards) === JSON.stringify(["card-02", "card-36"]),
      }),
    ).toEqual({ status: "yes" });
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
        .zones(["hand"] as const, inputDefinitions)
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
