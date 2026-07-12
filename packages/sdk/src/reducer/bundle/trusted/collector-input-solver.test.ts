import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  defineInputs,
  formInput,
  many,
} from "../../../reducer";
import {
  enumerateCollectorInputAssignments,
  hasAnyCollectorInputAssignment,
} from "./collector-input-solver";

const domainState = {
  table: {},
  flow: { currentPhase: "work" },
};

function dependentFormInteraction(options: { allBlocked?: boolean } = {}) {
  const inputs = defineInputs((input) => {
    const mode = input.add(
      "mode",
      formInput.choice({
        choices: [
          { value: "beta", label: "Beta" },
          { value: "alpha", label: "Alpha" },
        ],
        defaultValue: () => undefined,
      }),
    );
    return {
      mode,
      task: input.add(
        "task",
        formInput.choice({
          dependsOn: [mode],
          choices: ({ values }) =>
            options.allBlocked || values.mode === "alpha"
              ? []
              : [
                  { value: "two", label: "Two" },
                  { value: "one", label: "One" },
                ],
          defaultValue: () => undefined,
        }),
      ),
    };
  });
  return { inputs };
}

describe("trusted collector input solver", () => {
  test("proves dependent finite domains and enumerates canonical assignments", () => {
    const interaction = dependentFormInteraction();

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
      }),
    ).toEqual({ status: "yes" });

    const enumeration = enumerateCollectorInputAssignments({
      interaction: interaction as never,
      domainState: domainState as never,
      playerId: "player-1" as never,
      maxEvaluations: 100,
    });
    expect(enumeration).toMatchObject({ status: "enumerated" });
    if (enumeration.status !== "enumerated") return;
    expect(enumeration.assignments).toEqual([
      { mode: "beta", task: "one" },
      { mode: "beta", task: "two" },
    ]);
  });

  test("returns no only after exhausting dependent collector authority", () => {
    const interaction = dependentFormInteraction({ allBlocked: true });

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
      }),
    ).toMatchObject({ status: "no" });
    expect(
      enumerateCollectorInputAssignments({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
        maxEvaluations: 100,
      }),
    ).toMatchObject({ status: "enumerated", assignments: [] });
  });

  test("filters every complete assignment through trusted acceptance", () => {
    const interaction = dependentFormInteraction();
    const evaluatedForActionability: Readonly<Record<string, unknown>>[] = [];

    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
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
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
        acceptsAssignment: (assignment) => assignment.task === "two",
        maxEvaluations: 100,
      }),
    ).toMatchObject({
      status: "enumerated",
      assignments: [{ mode: "beta", task: "two" }],
    });
    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
        acceptsAssignment: () => false,
      }),
    ).toEqual({ status: "no", inputKey: "mode" });
  });

  test("keeps actionability independent from the enumeration budget", () => {
    const interaction = dependentFormInteraction();

    expect(
      enumerateCollectorInputAssignments({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
        maxEvaluations: 1,
      }),
    ).toMatchObject({ status: "budget", assignments: [], evaluated: 1 });
    expect(
      hasAnyCollectorInputAssignment({
        interaction: interaction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
      }),
    ).toEqual({ status: "yes" });
  });

  test("distinguishes opaque and unbounded domains from proven emptiness", () => {
    const opaqueInteraction = {
      inputs: {},
      paramsSchema: z.object({ answer: z.string() }),
    };
    expect(
      hasAnyCollectorInputAssignment({
        interaction: opaqueInteraction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
      }),
    ).toEqual({ status: "notEnumerable" });

    const unboundedInteraction = {
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
        interaction: unboundedInteraction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
      }),
    ).toEqual({ status: "yes" });
    expect(
      enumerateCollectorInputAssignments({
        interaction: unboundedInteraction as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
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
        interaction: dependentFormInteraction() as never,
        domainState: domainState as never,
        playerId: "player-1" as never,
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
          test: ({ playerId, target }) =>
            target.playerId === playerId && target.spaceId === "space-a",
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
    const interaction = { inputs: { playerSpace, card } };
    const queries = {
      board: {
        get: (boardId: string) => ({
          spaces: boardId.startsWith("workshop-mat:")
            ? ["space-a", "space-b"]
            : [],
        }),
      },
      zone: {
        playerCards: () => ["card-a", "card-b"],
        sharedCards: () => [],
      },
    };
    const enumeration = enumerateCollectorInputAssignments({
      interaction: interaction as never,
      domainState: {
        table: {
          playerOrder: ["player-1", "player-2"],
          hands: { hand: {} },
        },
        flow: { currentPhase: "work" },
      } as never,
      playerId: "player-1" as never,
      queries: queries as never,
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
          boardId: "workshop-mat",
          playerId: "player-1",
          spaceId: "space-a",
        },
      },
    ]);
  });
});
