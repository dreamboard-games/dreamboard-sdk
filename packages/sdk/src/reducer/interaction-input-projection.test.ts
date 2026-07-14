import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  defineInputs,
  formInput,
} from "../reducer";
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
    ).toThrow("without a default-renderable domain or target metadata");
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

  test("materializes dependent finite choice domains", () => {
    const inputs = defineInputs((input) => {
      const spaceId = input.add(
        "spaceId",
        formInput.choice({
          choices: [
            { value: "hex-a", label: "Hex A" },
            { value: "hex-b", label: "Hex B" },
          ],
          defaultValue: () => undefined,
        }),
      );
      return {
        spaceId,
        targetPlayerId: input.add(
          "targetPlayerId",
          formInput.choice({
            dependsOn: [spaceId],
            choices: ({ values }) =>
              values.spaceId === "hex-a"
                ? [{ value: "player-1", label: "Player 1" }]
                : [{ value: "player-2", label: "Player 2" }],
            defaultValue: ({ choices }) => choices[0]?.value,
          }),
        ),
      };
    });
    const interaction = { inputs };

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
      { key: "spaceId", domain: { type: "choice" } },
      {
        key: "targetPlayerId",
        domain: {
          type: "choice",
          dependencies: {
            mode: "eager",
            dependentCases: [
              {
                when: { spaceId: "hex-a" },
                domain: {
                  type: "choice",
                  choices: [{ value: "player-1", label: "Player 1" }],
                },
              },
              {
                when: { spaceId: "hex-b" },
                domain: {
                  type: "choice",
                  choices: [{ value: "player-2", label: "Player 2" }],
                },
              },
            ],
          },
        },
      },
    ]);
  });

  test("warns when a dependent choice selector has a concrete default", () => {
    const warning = mock(() => {});
    const inputs = defineInputs((input) => {
      const workerId = input.add(
        "workerId",
        formInput.choice({
          choices: [
            { value: "apprentice", label: "Apprentice" },
            { value: "master", label: "Master" },
          ],
          defaultValue: "apprentice",
        }),
      );
      const target = boardTarget
        .space<
          {
            table: { playerOrder: string[] };
            flow: { currentPhase: string };
          },
          "space-a" | "space-b"
        >("action-board")
        .build();
      return {
        workerId,
        spaceId: input.add(
          "spaceId",
          boardInput.space({ target, dependsOn: [workerId] }),
        ),
      };
    });

    collectInteractionInputs(
      { inputs } as never,
      {
        table: { playerOrder: ["player-1"] },
        flow: { currentPhase: "play" },
      } as never,
      "player-1" as never,
      {
        diagnostics: { event: warning },
        queries: {
          board: { get: () => ({ spaces: ["space-a", "space-b"] }) },
        } as never,
      },
    );

    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0]?.[0]).toMatchObject({
      type: "authoringWarning",
      code: "dependent-choice-concrete-default",
    });
    expect(warning.mock.calls[0]?.[0]?.message).toContain(
      'Form choice input "workerId" feeds another collector',
    );
  });

  test("does not warn when a dependent choice selector defaults to undefined", () => {
    const originalWarn = console.warn;
    const warn = mock(() => {});
    console.warn = warn;
    try {
      const inputs = defineInputs((input) => {
        const workerId = input.add(
          "workerId",
          formInput.choice({
            choices: [
              { value: "apprentice", label: "Apprentice" },
              { value: "master", label: "Master" },
            ],
            defaultValue: () => undefined,
          }),
        );
        const target = boardTarget
          .space<
            {
              table: { playerOrder: string[] };
              flow: { currentPhase: string };
            },
            "space-a" | "space-b"
          >("action-board")
          .build();
        return {
          workerId,
          spaceId: input.add(
            "spaceId",
            boardInput.space({ target, dependsOn: [workerId] }),
          ),
        };
      });

      collectInteractionInputs(
        { inputs } as never,
        {
          table: { playerOrder: ["player-1"] },
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
        {
          queries: {
            board: { get: () => ({ spaces: ["space-a", "space-b"] }) },
          } as never,
        },
      );
    } finally {
      console.warn = originalWarn;
    }

    expect(warn).not.toHaveBeenCalled();
  });

  test("card and board targets project renderable domains without dependsOn", () => {
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
            board: { get: () => ({ spaces: ["space-a", "space-b"] }) },
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

  test("materializes dependent board target domains", () => {
    const inputs = defineInputs((input) => {
      const workerId = input.add(
        "workerId",
        formInput.choice({
          choices: [
            { value: "apprentice", label: "Apprentice" },
            { value: "master", label: "Master" },
          ],
          defaultValue: () => undefined,
        }),
      );
      const target = boardTarget
        .space<
          { table: { playerOrder: string[] }; flow: { currentPhase: string } },
          "space-a" | "space-b"
        >("action-board")
        .where({
          id: "worker-space",
          errorCode: "wrong-worker",
          test: ({ targetId, values }) =>
            values?.workerId === "master"
              ? targetId === "space-b"
              : targetId === "space-a",
        })
        .build();
      return {
        workerId,
        spaceId: input.add(
          "spaceId",
          boardInput.space({ target, dependsOn: [workerId] }),
        ),
      };
    });

    expect(
      collectInteractionInputs(
        { inputs } as never,
        {
          table: { playerOrder: ["player-1"] },
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
        {
          queries: {
            board: { get: () => ({ spaces: ["space-a", "space-b"] }) },
          } as never,
        },
      ),
    ).toMatchObject([
      { key: "workerId", domain: { type: "choice" } },
      {
        key: "spaceId",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "space",
          boardId: "action-board",
          dependencies: {
            mode: "eager",
            dependentCases: [
              {
                when: { workerId: "apprentice" },
                domain: { eligibleTargets: ["space-a"] },
              },
              {
                when: { workerId: "master" },
                domain: { eligibleTargets: ["space-b"] },
              },
            ],
          },
        },
      },
    ]);
  });

  test("materializes dependent card target domains", () => {
    const inputs = defineInputs((input) => {
      const mode = input.add(
        "mode",
        formInput.choice({
          choices: [
            { value: "order", label: "Order" },
            { value: "apprentice", label: "Apprentice" },
          ],
          defaultValue: () => undefined,
        }),
      );
      const target = cardTarget
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
          "order-1" | "apprentice-1"
        >(["hand"])
        .where({
          id: "card-mode",
          errorCode: "wrong-card",
          test: ({ targetId, values }) =>
            values?.mode === "order"
              ? targetId === "order-1"
              : targetId === "apprentice-1",
        })
        .build();
      return {
        mode,
        cardId: input.add("cardId", cardInput({ target, dependsOn: [mode] })),
      };
    });

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
            zone: { playerCards: () => ["order-1", "apprentice-1"] },
          } as never,
        },
      ),
    ).toMatchObject([
      { key: "mode", domain: { type: "choice" } },
      {
        key: "cardId",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          dependencies: {
            mode: "eager",
            dependentCases: [
              {
                when: { mode: "order" },
                domain: { eligibleTargets: ["order-1"] },
              },
              {
                when: { mode: "apprentice" },
                domain: { eligibleTargets: ["apprentice-1"] },
              },
            ],
          },
        },
      },
    ]);
  });

  test("keeps target dependencies finite when ordinary eligible targets are omitted", () => {
    const inputs = defineInputs((input) => {
      const target = boardTarget
        .space<
          { table: { playerOrder: string[] }; flow: { currentPhase: string } },
          "space-a" | "space-b"
        >("action-board")
        .build();
      const spaceId = input.add("spaceId", boardInput.space({ target }));
      return {
        spaceId,
        playerId: input.add(
          "playerId",
          formInput.choice<string, never, readonly [typeof spaceId]>({
            dependsOn: [spaceId],
            choices: ({ values }) =>
              values.spaceId === "space-a"
                ? [{ value: "player-1", label: "Player 1" }]
                : [{ value: "player-2", label: "Player 2" }],
            defaultValue: ({ choices }) => choices[0]?.value,
          }),
        ),
      };
    });

    expect(
      collectInteractionInputs(
        { inputs } as never,
        {
          table: { playerOrder: ["player-1"] },
          flow: { currentPhase: "play" },
        } as never,
        "player-1" as never,
        {
          includeEligibleTargets: false,
          queries: {
            board: { get: () => ({ spaces: ["space-a", "space-b"] }) },
          } as never,
        },
      ),
    ).toMatchObject([
      {
        key: "spaceId",
        domain: {
          type: "boardTarget",
          projection: "resolved",
          eligibleTargets: ["space-a", "space-b"],
        },
      },
      {
        key: "playerId",
        domain: {
          type: "choice",
          dependencies: {
            mode: "eager",
            dependentCases: [
              { when: { spaceId: "space-a" } },
              { when: { spaceId: "space-b" } },
            ],
          },
        },
      },
    ]);
  });

  test("projects high-cardinality dependent target domains lazily", () => {
    const choices = Array.from({ length: 65 }, (_, index) => ({
      value: `mode-${index}`,
      label: `Mode ${index}`,
    }));
    const inputs = defineInputs((input) => {
      const mode = input.add(
        "mode",
        formInput.choice({
          choices,
          defaultValue: () => undefined,
        }),
      );
      const target = cardTarget
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
          "card-1"
        >(["hand"])
        .build();
      return {
        mode,
        cardId: input.add("cardId", cardInput({ target, dependsOn: [mode] })),
      };
    });

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
            zone: { playerCards: () => ["card-1"] },
          } as never,
        },
      ),
    ).toMatchObject([
      { key: "mode", domain: { type: "choice" } },
      {
        key: "cardId",
        domain: {
          type: "cardTarget",
          projection: "lazy",
          targetKind: "card",
          zoneIds: ["hand"],
          dependencies: {
            mode: "lazy",
            dependsOn: ["mode"],
            resolver: { inputKey: "cardId" },
          },
        },
      },
    ]);
  });
});
