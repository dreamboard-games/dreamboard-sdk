import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  asPlayerId,
  boardInput,
  boardTarget,
  defineEmptyView,
  defineGame,
  defineGameContract,
  defineInputs,
  defineInteraction,
  definePhase,
  definePlayerView,
  formInput,
  perPlayer,
  pipe,
  rngInput,
} from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import {
  assertScenario,
  createScenarioAuthoring,
  exploreScenario,
  inspectScenario,
  probeScenarioCommand,
  replayScenario,
  ScenarioAssertionError,
  ScenarioReplayError,
  type ScenarioCommandOf,
  type ScenarioReplay,
} from "./index";

function createTable(playerIds: readonly string[]): RuntimeTableRecord {
  const brandedPlayerIds = playerIds.map(asPlayerId);
  const personalBoards = Object.fromEntries(
    brandedPlayerIds.map((playerId) => {
      const id = `survey-grid:${playerId}`;
      return [
        id,
        {
          id,
          baseId: "survey-grid",
          layout: "generic" as const,
          scope: "perPlayer" as const,
          playerId,
          fields: {},
          spaces: {
            "cell-a": { id: "cell-a", fields: {} },
            "cell-b": { id: "cell-b", fields: {} },
          },
          relations: [],
          containers: {},
        },
      ];
    }),
  );
  return {
    playerOrder: brandedPlayerIds,
    zones: { shared: {}, perPlayer: {}, visibility: {} },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {},
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: perPlayer(brandedPlayerIds, () => ({})),
    boards: {
      byId: personalBoards,
      hex: {},
      network: {},
      square: {},
      track: {},
    },
    dice: {},
  };
}

function createScenarioGame() {
  const playerIds = ["player-1", "player-2"] as const;
  const phaseNames = ["play", "chooseTogether", "finish"] as const;
  const playerIdSchema = createManifestStringLiteralSchema(
    playerIds,
    "playerId",
  );
  const manifest = {
    literals: {
      playerIds,
      phaseNames,
      setupOptionIds: [] as const,
      setupProfileIds: [] as const,
      cardSetIds: [] as const,
      cardTypes: [] as const,
      deckIds: [] as const,
      handIds: [] as const,
      sharedZoneIds: [] as const,
      playerZoneIds: [] as const,
      zoneIds: [] as const,
      cardIds: [] as const,
      resourceIds: [] as const,
      pieceTypeIds: [] as const,
      pieceIds: [] as const,
      dieTypeIds: [] as const,
      dieIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: {},
      zoneVisibilityById: {},
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
    },
    ids: {
      playerId: playerIdSchema,
      phaseName: createManifestStringLiteralSchema(phaseNames, "phaseName"),
      setupOptionId: createManifestStringLiteralSchema(
        [] as const,
        "setupOptionId",
      ),
      setupProfileId: createManifestStringLiteralSchema(
        [] as const,
        "setupProfileId",
      ),
      cardSetId: createManifestStringLiteralSchema([] as const, "cardSetId"),
      cardType: createManifestStringLiteralSchema([] as const, "cardType"),
      cardId: createManifestStringLiteralSchema([] as const, "cardId"),
      deckId: createManifestStringLiteralSchema([] as const, "deckId"),
      handId: createManifestStringLiteralSchema([] as const, "handId"),
      sharedZoneId: createManifestStringLiteralSchema(
        [] as const,
        "sharedZoneId",
      ),
      playerZoneId: createManifestStringLiteralSchema(
        [] as const,
        "playerZoneId",
      ),
      zoneId: createManifestStringLiteralSchema([] as const, "zoneId"),
      resourceId: createManifestStringLiteralSchema([] as const, "resourceId"),
      pieceTypeId: createManifestStringLiteralSchema(
        [] as const,
        "pieceTypeId",
      ),
      pieceId: createManifestStringLiteralSchema([] as const, "pieceId"),
      dieTypeId: createManifestStringLiteralSchema([] as const, "dieTypeId"),
      dieId: createManifestStringLiteralSchema([] as const, "dieId"),
      boardTypeId: createManifestStringLiteralSchema(
        [] as const,
        "boardTypeId",
      ),
      boardBaseId: createManifestStringLiteralSchema(
        [] as const,
        "boardBaseId",
      ),
      boardId: createManifestStringLiteralSchema([] as const, "boardId"),
      boardContainerId: createManifestStringLiteralSchema(
        [] as const,
        "boardContainerId",
      ),
      relationTypeId: createManifestStringLiteralSchema(
        [] as const,
        "relationTypeId",
      ),
      edgeId: createManifestStringLiteralSchema([] as const, "edgeId"),
      edgeTypeId: createManifestStringLiteralSchema([] as const, "edgeTypeId"),
      vertexId: createManifestStringLiteralSchema([] as const, "vertexId"),
      vertexTypeId: createManifestStringLiteralSchema(
        [] as const,
        "vertexTypeId",
      ),
      spaceId: createManifestStringLiteralSchema([] as const, "spaceId"),
      spaceTypeId: createManifestStringLiteralSchema(
        [] as const,
        "spaceTypeId",
      ),
    },
    defaults: {
      zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
      decks: () => ({}),
      hands: () => ({}),
      handVisibility: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: (ids?: readonly string[]) =>
        perPlayer((ids ?? []).map(asPlayerId), () => ({})),
    },
    normalSetup: {
      minPlayers: 2,
      maxPlayers: 2,
      createInitialTable: ({
        playerIds: ids,
      }: {
        playerIds: readonly string[];
      }) => createTable(ids),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  } as const;
  const contract = defineGameContract({
    manifest,
    state: {
      public: z.object({
        count: z.number().int(),
        lastRoll: z.number().int().nullable(),
        target: playerIdSchema.nullable(),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      play: z.object({}),
      chooseTogether: z.object({}),
      finish: z.object({}),
    },
    errors: {
      COUNT_TOO_LARGE: "The count cannot exceed five.",
      RECIPIENT_REQUIRED: "Choose a recipient for targeted mode.",
    },
  });
  const phaseState = z.object({});
  const ownSurveyCell = boardTarget
    .playerSpace("survey-grid")
    .where({
      id: "own-open-cell",
      errorCode: "CELL_NOT_AVAILABLE",
      test: ({ playerId, target }) =>
        target.playerId === playerId && target.spaceId === "cell-a",
    })
    .build();
  return defineGame({
    contract,
    initial: {
      public: () => ({ count: 0, lastRoll: null, target: null }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    phases: {
      play: definePhase<typeof contract>()({
        kind: "player",
        state: phaseState,
        initialState: () => ({}),
        enter: ({ state, accept, ops, q }) =>
          accept(pipe(state, ops.setActivePlayers([q.player.order()[0]!]))),
        actor: ({ q }) => q.player.order()[0] ?? null,
        interactions: {
          dependentTask: defineInteraction<
            typeof contract,
            typeof phaseState
          >()({
            inputs: defineInputs((input) => {
              const mode = input.add(
                "mode",
                formInput.choice({
                  choices: [
                    { value: "alpha", label: "Alpha" },
                    { value: "beta", label: "Beta" },
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
                      values.mode === "beta"
                        ? [
                            { value: "one", label: "One" },
                            { value: "two", label: "Two" },
                          ]
                        : [],
                    defaultValue: () => undefined,
                  }),
                ),
              };
            }),
            reduce: ({ state, accept }) => accept(state),
          }),
          neverLegalTask: defineInteraction<
            typeof contract,
            typeof phaseState
          >()({
            inputs: {
              task: formInput.choice({
                choices: [
                  { value: "one", label: "One" },
                  { value: "two", label: "Two" },
                ],
                defaultValue: () => undefined,
              }),
            },
            rules: [
              {
                id: "reject-every-task",
                errorCode: "TASK_REJECTED",
                validate: () => false,
              },
            ],
            reduce: ({ state, accept }) => accept(state),
          }),
          markCell: defineInteraction<typeof contract, typeof phaseState>()({
            inputs: {
              cell: boardInput.playerSpace({ target: ownSurveyCell }),
            },
            reduce: ({ state, accept }) => accept(state),
          }),
          optionalRecipient: defineInteraction<
            typeof contract,
            typeof phaseState
          >()({
            inputs: defineInputs((input) => {
              const mode = input.add(
                "mode",
                formInput.choice({
                  choices: [
                    { value: "solo", label: "Solo" },
                    { value: "targeted", label: "Targeted" },
                  ],
                  defaultValue: () => undefined,
                }),
              );
              const recipient = formInput.choice({
                dependsOn: [mode],
                choices: ({ values }) =>
                  values.mode === "targeted"
                    ? [{ value: "player-2" as const, label: "Player 2" }]
                    : [],
                defaultValue: ({ choices }) => choices[0]?.value,
              });
              return {
                mode,
                recipient: input.add("recipient", {
                  ...recipient,
                  schema: playerIdSchema.optional(),
                }),
              };
            }),
            paramsSchema: z.object({
              mode: z.enum(["solo", "targeted"]),
              recipient: playerIdSchema.optional(),
            }),
            rules: [
              {
                id: "targeted-recipient",
                errorCode: "RECIPIENT_REQUIRED",
                validate: ({ input }) =>
                  input.params.mode === "solo" || input.params.recipient
                    ? null
                    : { errorCode: "RECIPIENT_REQUIRED" },
              },
            ],
            reduce: ({ state, input, accept }) =>
              accept({
                ...state,
                publicState: {
                  ...state.publicState,
                  target: input.params.recipient ?? null,
                },
              }),
          }),
          increment: defineInteraction<typeof contract, typeof phaseState>()({
            inputs: { amount: formInput.number({ min: 1, max: 5 }) },
            rules: [
              {
                id: "count-limit",
                errorCode: "COUNT_TOO_LARGE",
                validate: ({ state, input }) =>
                  state.publicState.count + input.params.amount <= 5
                    ? null
                    : { errorCode: "COUNT_TOO_LARGE" },
              },
            ],
            reduce: ({ state, input, accept }) =>
              accept({
                ...state,
                publicState: {
                  ...state.publicState,
                  count: state.publicState.count + input.params.amount,
                },
              }),
          }),
          choosePlayer: defineInteraction<typeof contract, typeof phaseState>()(
            {
              inputs: {
                target: formInput.choice<(typeof playerIds)[number]>({
                  choices: playerIds.map((playerId) => ({
                    value: playerId,
                    label: playerId,
                  })),
                  defaultValue: "player-1",
                }),
              },
              paramsSchema: z.object({ target: playerIdSchema }),
              reduce: ({ state, input, accept }) =>
                accept({
                  ...state,
                  publicState: {
                    ...state.publicState,
                    target: input.params.target,
                  },
                }),
            },
          ),
          respond: defineInteraction<typeof contract, typeof phaseState>()({
            to: ({ state }) => state.publicState.target ?? undefined,
            inputs: {
              answer: formInput.choice({
                choices: [
                  { value: "accept", label: "Accept" },
                  { value: "decline", label: "Decline" },
                ],
                defaultValue: "accept",
              }),
            },
            reduce: ({ state, accept }) =>
              accept({
                ...state,
                publicState: { ...state.publicState, target: null },
              }),
          }),
          roll: defineInteraction<typeof contract, typeof phaseState>()({
            inputs: { die: rngInput.d6() },
            reduce: ({ state, input, accept }) =>
              accept({
                ...state,
                publicState: {
                  ...state.publicState,
                  lastRoll: input.params.die.values[0] ?? null,
                },
              }),
          }),
          startGroupChoice: defineInteraction<
            typeof contract,
            typeof phaseState
          >()({
            inputs: {},
            reduce: ({ state, accept, fx }) =>
              accept(state, {
                instructions: [fx.transition("chooseTogether")],
              }),
          }),
        },
      }),
      chooseTogether: definePhase<typeof contract>()({
        kind: "simultaneousPlayer",
        state: phaseState,
        initialState: () => ({}),
        actors: ({ q }) => q.player.order().slice(0, 2),
        submit: {
          inputs: {
            choice: formInput.choice({
              choices: [
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ],
              defaultValue: "left",
            }),
          },
        },
        resolve: ({ state, accept, fx }) =>
          accept(state, { instructions: [fx.transition("play")] }),
      }),
      finish: definePhase<typeof contract>()({
        kind: "player",
        state: phaseState,
        initialState: () => ({}),
        actor: ({ q }) => q.player.order()[0] ?? null,
        interactions: {
          confirm: defineInteraction<typeof contract, typeof phaseState>()({
            inputs: {},
            reduce: ({ state, accept }) => accept(state),
          }),
        },
      }),
    },
    views: {
      shared: defineEmptyView<typeof contract>(),
      player: definePlayerView<typeof contract>()({
        project: ({ state }) => ({ ...state.publicState }),
      }),
    },
  });
}

const game = createScenarioGame();
const { defineScenario } = createScenarioAuthoring(game);

describe("replayScenario", () => {
  test("uses setup, given, and when command-count checkpoints", async () => {
    const scenario = defineScenario({
      id: "ordering",
      setup: { players: 2, seed: 17 },
      given: [
        {
          actor: { seat: 0 },
          interactionId: "increment",
          params: { amount: 1 },
        },
      ],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "increment",
          params: { amount: 2 },
        },
      ],
      then: () => {},
    });

    const setup = await replayScenario({
      game,
      scenario,
      at: { segment: "setup", completed: 0 },
    });
    const givenZero = await replayScenario({
      game,
      scenario,
      at: { segment: "given", completed: 0 },
    });
    const givenOne = await replayScenario({
      game,
      scenario,
      at: { segment: "given", completed: 1 },
    });
    const whenZero = await replayScenario({
      game,
      scenario,
      at: { segment: "when", completed: 0 },
    });
    const full = await replayScenario({ game, scenario });

    expect(setup.view({ seat: 0 })).toMatchObject({ count: 0 });
    expect(givenZero.view({ seat: 0 })).toMatchObject({ count: 0 });
    expect(givenOne.view({ seat: 0 })).toMatchObject({ count: 1 });
    expect(whenZero.view({ seat: 0 })).toMatchObject({ count: 1 });
    expect(full.view({ seat: 0 })).toMatchObject({ count: 3 });
    expect(full.complete).toBe(true);
    expect(full.trace).toHaveLength(2);
    expect(
      full.diagnostics.events.filter(
        (event) => event.type === "submitAccepted",
      ),
    ).toHaveLength(2);
    expect(full.diagnostics.lastDispatch).toBeDefined();
    expect((await replayScenario({ game, scenario })).checkpointDigest).toBe(
      full.checkpointDigest,
    );
  });

  test("resolves semantic player leaves and deterministic RNG", async () => {
    const scenario = defineScenario({
      id: "semantic-player-and-rng",
      setup: { players: 2, seed: 99 },
      given: [
        {
          actor: { seat: 0 },
          interactionId: "choosePlayer",
          params: { target: { seat: 1 } },
        },
      ],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "roll",
          params: {},
        },
      ],
      then: () => {},
    });
    const first = await replayScenario({ game, scenario });
    const second = await replayScenario({ game, scenario });

    expect(first.view({ seat: 0 })).toMatchObject({ target: "player-2" });
    expect(second.checkpointDigest).toBe(first.checkpointDigest);
    expect(first.trace[1]?.trace).toContainEqual(
      expect.objectContaining({ kind: "rngConsumption" }),
    );
  });

  test("reports precise accepted-command rejection location", async () => {
    const scenario = defineScenario({
      id: "wrong-actor",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [
        {
          actor: { seat: 1 },
          interactionId: "increment",
          params: { amount: 1 },
        },
      ],
      then: () => {},
    });

    await expect(replayScenario({ game, scenario })).rejects.toMatchObject({
      name: "ScenarioReplayError",
      scenarioId: "wrong-actor",
      segment: "when",
      index: 0,
      interactionId: "increment",
      errorCode: "NOT_YOUR_TURN",
    } satisfies Partial<ScenarioReplayError>);
  });

  test("dispatches later-phase commands through production rejection semantics", async () => {
    const scenario = defineScenario({
      id: "wrong-phase",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "confirm",
          params: {},
        },
      ],
      then: () => {},
    });

    await expect(replayScenario({ game, scenario })).rejects.toMatchObject({
      name: "ScenarioReplayError",
      scenarioId: "wrong-phase",
      segment: "when",
      index: 0,
      interactionId: "confirm",
      errorCode: "unsupported-action",
    } satisfies Partial<ScenarioReplayError>);
  });

  test("isolates accepted and rejected probes from the source replay", async () => {
    const scenario = defineScenario({
      id: "probe-isolation",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [],
      then: () => {},
    });
    const replay = await replayScenario({ game, scenario });
    const sourceDigest = replay.checkpointDigest;
    const accepted = await assertProbe(replay, {
      actor: { seat: 0 },
      interactionId: "increment",
      params: { amount: 1 },
    });
    const acceptedAgain = await assertProbe(replay, {
      actor: { seat: 0 },
      interactionId: "increment",
      params: { amount: 1 },
    });
    const rejected = await assertProbe(replay, {
      actor: { seat: 1 },
      interactionId: "increment",
      params: { amount: 1 },
    });

    accepted.toBeAccepted();
    expect(accepted.checkpointDigest).toBe(acceptedAgain.checkpointDigest);
    rejected.toRejectWith({ errorCode: "NOT_YOUR_TURN" });
    expect(() => accepted.toRejectWith({ errorCode: "NOT_YOUR_TURN" })).toThrow(
      ScenarioAssertionError,
    );
    expect(() => rejected.toBeAccepted()).toThrow(ScenarioAssertionError);
    expect(() => rejected.toRejectWith({ errorCode: "OTHER" })).toThrow(
      ScenarioAssertionError,
    );
    expect(replay.checkpointDigest).toBe(sourceDigest);
    expect(replay.view({ seat: 0 })).toMatchObject({ count: 0 });
  });

  test("assertScenario runs only for a full replay", async () => {
    let assertions = 0;
    const scenario = defineScenario({
      id: "assertion",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [],
      then: async ({ expect: scenarioExpect, view, probe }) => {
        assertions += 1;
        scenarioExpect(view({ seat: 0 })).toMatchObject({ count: 0 });
        const rejection = await probe({
          actor: { seat: 1 },
          interactionId: "increment",
          params: { amount: 1 },
        });
        await scenarioExpect(rejection).toRejectWith({
          errorCode: "NOT_YOUR_TURN",
        });
      },
    });
    const full = await replayScenario({ game, scenario });
    await assertScenario({ replay: full, assertion: scenario.then });
    expect(assertions).toBe(1);

    const partialScenario = defineScenario({
      ...scenario,
      id: "partial-assertion",
      when: [
        {
          actor: { seat: 0 },
          interactionId: "increment",
          params: { amount: 1 },
        },
      ],
    });
    const partial = await replayScenario({
      game,
      scenario: partialScenario,
      at: { segment: "when", completed: 0 },
    });
    await expect(
      assertScenario({ replay: partial, assertion: partialScenario.then }),
    ).rejects.toThrow(/require a full replay/);
  });

  test("does not wrap a generic exception from authored assertion code", async () => {
    const unexpected = new Error("authored assertion crashed");
    const scenario = defineScenario({
      id: "unexpected-assertion",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [],
      then: () => {
        throw unexpected;
      },
    });
    const replay = await replayScenario({ game, scenario });

    try {
      await assertScenario({ replay, assertion: scenario.then });
      throw new Error("Expected assertion to throw.");
    } catch (error) {
      expect(error).toBe(unexpected);
    }
  });
});

describe("scenario inspection and exploration", () => {
  const scenario = defineScenario({
    id: "diagnostic-authoring-loop",
    setup: { players: 2, seed: 17 },
    given: [],
    when: [],
    then: () => {},
  });
  const identity = {
    id: scenario.id,
    path: "test/scenarios/diagnostic-authoring-loop.scenario.ts",
    sourceDigest: "sha256:fixture",
  } as const;

  test("projects one player or spectator without false ordinary-turn blockers", async () => {
    const player = await inspectScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
    });
    expect(player.node.checkpoint).toEqual({ segment: "given", completed: 0 });
    expect(player.node.flow).toMatchObject({
      phase: "play",
      activeActors: [{ seat: 0, playerId: "player-1" }],
      pendingActors: [],
      continuationWaiters: [],
      blockedBy: [],
    });
    expect(
      player.node.actions.map(({ interactionId }) => interactionId),
    ).toContain("dependentTask");
    expect(
      player.node.actions.map(({ interactionId }) => interactionId),
    ).not.toContain("neverLegalTask");
    expect(
      player.node.interactions.find(
        ({ interactionId }) => interactionId === "neverLegalTask",
      ),
    ).toMatchObject({
      availability: {
        status: "blocked",
        code: "NO_LEGAL_INPUT",
      },
    });
    expect(player.node.publicState).toMatchObject({ count: 0 });

    const inactive = await inspectScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 1 },
    });
    expect(inactive.node.actions).toEqual([]);
    expect(
      inactive.node.interactions.every(
        ({ availability }) => availability.status === "notYourTurn",
      ),
    ).toBe(true);

    const spectator = await inspectScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "spectator" },
    });
    expect(spectator.node.interactions).toEqual([]);
    expect(spectator.node.actions).toEqual([]);
    expect(spectator.node.view).toEqual({});
  });

  test("enumerates accepted dependent non-board commands in canonical order", async () => {
    const explored = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      limit: 50,
      maxEvaluations: 100,
    });
    expect(explored.mode).toBe("transitions");
    if (explored.mode !== "transitions") return;
    const dependent = explored.candidates
      .map(({ command }) => command)
      .filter(({ interactionId }) => interactionId === "dependentTask");
    expect(dependent).toEqual([
      {
        actor: { seat: 0 },
        interactionId: "dependentTask",
        params: { mode: "beta", task: "one" },
      },
      {
        actor: { seat: 0 },
        interactionId: "dependentTask",
        params: { mode: "beta", task: "two" },
      },
    ]);
    expect(
      explored.candidates.some(
        ({ command }) => command.interactionId === "neverLegalTask",
      ),
    ).toBe(false);
    expect(
      explored.candidates.every(({ after }) =>
        after.checkpointDigest.startsWith("sha256:"),
      ),
    ).toBe(true);
  });

  test("returns structured player-board commands that replay unchanged", async () => {
    const explored = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      limit: 50,
      maxEvaluations: 100,
    });
    expect(explored.mode).toBe("transitions");
    if (explored.mode !== "transitions") return;
    const command = explored.candidates.find(
      (candidate) => candidate.command.interactionId === "markCell",
    )?.command;
    expect(command).toEqual({
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-a",
        },
      },
    });
    if (!command) return;

    const replayed = await replayScenario({
      game,
      scenario: defineScenario({
        id: "replay-explored-player-board-command",
        setup: scenario.setup,
        given: [],
        when: [command as never],
        then: () => {},
      }),
    });
    expect(replayed.complete).toBe(true);
    expect(replayed.trace[0]?.command).toEqual(command);
  });

  test("omits an optional dependent input and replays the explored command", async () => {
    const explored = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      limit: 50,
      maxEvaluations: 200,
    });
    expect(explored.mode).toBe("transitions");
    if (explored.mode !== "transitions") return;
    const command = explored.candidates.find(
      ({ command: candidate }) =>
        candidate.interactionId === "optionalRecipient" &&
        candidate.params.mode === "solo",
    )?.command;
    expect(command).toEqual({
      actor: { seat: 0 },
      interactionId: "optionalRecipient",
      params: { mode: "solo" },
    });
    expect(command?.params).not.toHaveProperty("recipient");
    if (!command) return;

    const replayed = await replayScenario({
      game,
      scenario: defineScenario({
        id: "replay-explored-optional-dependent-command",
        setup: scenario.setup,
        given: [],
        when: [command as never],
        then: () => {},
      }),
    });
    expect(replayed.complete).toBe(true);
    expect(replayed.trace[0]?.command).toEqual(command);
  });

  test("derives targeted-response pending actors and continuation blockers", async () => {
    const targetedScenario = defineScenario({
      id: "targeted-response-flow",
      setup: { players: 2, seed: 17 },
      given: [
        {
          actor: { seat: 0 },
          interactionId: "choosePlayer",
          params: { target: { seat: 1 } },
        },
      ],
      when: [],
      then: () => {},
    });
    const inspected = await inspectScenario({
      game,
      scenario: targetedScenario,
      identity: {
        id: targetedScenario.id,
        path: "test/scenarios/targeted-response-flow.scenario.ts",
        sourceDigest: "sha256:targeted-response",
      },
      perspective: { kind: "player", seat: 1 },
      at: { segment: "given", completed: 1 },
    });

    expect(inspected.node.flow).toMatchObject({
      activeActors: [
        { seat: 0, playerId: "player-1" },
        { seat: 1, playerId: "player-2" },
      ],
      pendingActors: [{ seat: 1, playerId: "player-2" }],
      continuationWaiters: [{ seat: 0, playerId: "player-1" }],
      blockedBy: [
        {
          actor: { seat: 0, playerId: "player-1" },
          blockers: [{ seat: 1, playerId: "player-2" }],
          source: "scheduler",
        },
      ],
    });
    expect(
      inspected.node.actions.map(({ interactionId }) => interactionId),
    ).toContain("respond");

    const selfTargetedScenario = defineScenario({
      ...targetedScenario,
      id: "self-targeted-response-flow",
      given: [
        {
          actor: { seat: 0 },
          interactionId: "choosePlayer",
          params: { target: { seat: 0 } },
        },
      ],
    });
    const selfTargeted = await inspectScenario({
      game,
      scenario: selfTargetedScenario,
      identity: {
        id: selfTargetedScenario.id,
        path: "test/scenarios/self-targeted-response-flow.scenario.ts",
        sourceDigest: "sha256:self-targeted-response",
      },
      perspective: { kind: "player", seat: 0 },
      at: { segment: "given", completed: 1 },
    });
    expect(selfTargeted.node.flow.pendingActors).toEqual([
      { seat: 0, playerId: "player-1" },
    ]);
    expect(selfTargeted.node.flow.continuationWaiters).toEqual([]);
    expect(selfTargeted.node.flow.blockedBy).toEqual([]);
  });

  test("derives simultaneous pending actors before and after a sealed commit", async () => {
    const simultaneousScenario = defineScenario({
      id: "simultaneous-flow",
      setup: { players: 2, seed: 17 },
      given: [
        {
          actor: { seat: 0 },
          interactionId: "startGroupChoice",
          params: {},
        },
      ],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "submit",
          params: { choice: "left" },
        },
      ],
      then: () => {},
    });
    const simultaneousIdentity = {
      id: simultaneousScenario.id,
      path: "test/scenarios/simultaneous-flow.scenario.ts",
      sourceDigest: "sha256:simultaneous-flow",
    } as const;

    const beforeCommit = await inspectScenario({
      game,
      scenario: simultaneousScenario,
      identity: simultaneousIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "given", completed: 1 },
    });
    expect(beforeCommit.node.flow).toMatchObject({
      activeActors: [
        { seat: 0, playerId: "player-1" },
        { seat: 1, playerId: "player-2" },
      ],
      pendingActors: [
        { seat: 0, playerId: "player-1" },
        { seat: 1, playerId: "player-2" },
      ],
      continuationWaiters: [],
      blockedBy: [],
    });

    const afterCommit = await inspectScenario({
      game,
      scenario: simultaneousScenario,
      identity: simultaneousIdentity,
      perspective: { kind: "player", seat: 0 },
      at: { segment: "when", completed: 1 },
    });
    expect(afterCommit.node.flow).toMatchObject({
      activeActors: [{ seat: 1, playerId: "player-2" }],
      pendingActors: [{ seat: 1, playerId: "player-2" }],
      continuationWaiters: [{ seat: 0, playerId: "player-1" }],
      blockedBy: [
        {
          actor: { seat: 0, playerId: "player-1" },
          blockers: [{ seat: 1, playerId: "player-2" }],
          source: "scheduler",
        },
      ],
    });
  });

  test("keeps actions budget-independent and paginates with an authority cursor", async () => {
    const budgeted = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      maxEvaluations: 1,
    });
    expect(budgeted.mode).toBe("transitions");
    if (budgeted.mode !== "transitions") return;
    expect(
      budgeted.node.actions.map(({ interactionId }) => interactionId),
    ).toContain("dependentTask");
    expect(budgeted.omissions).toContainEqual(
      expect.objectContaining({
        interactionId: "dependentTask",
        code: "INPUT_DOMAIN_BUDGET",
      }),
    );

    const first = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      limit: 1,
      maxEvaluations: 100,
    });
    expect(first.mode).toBe("transitions");
    if (first.mode !== "transitions") return;
    expect(first.page.nextCursor).toBeTruthy();
    const second = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      limit: 1,
      maxEvaluations: 100,
      cursor: first.page.nextCursor ?? undefined,
    });
    expect(second.mode).toBe("transitions");
    if (second.mode !== "transitions") return;
    expect(second.candidates[0]?.ordinal).toBe(1);
    expect(second.candidates[0]?.command).not.toEqual(
      first.candidates[0]?.command,
    );
  });

  test("replays generic inclusive seed variants without exposing sampled values", async () => {
    const explored = await exploreScenario({
      game,
      scenario,
      identity,
      perspective: { kind: "player", seat: 0 },
      seedRange: { start: 3, end: 4 },
    });
    expect(explored.mode).toBe("seeds");
    if (explored.mode !== "seeds") return;
    expect(
      explored.variants.map(({ seed, status }) => ({ seed, status })),
    ).toEqual([
      { seed: 3, status: "replayed" },
      { seed: 4, status: "replayed" },
    ]);
    expect(JSON.stringify(explored)).not.toContain("traceEntry");
  });
});

async function assertProbe(
  replay: ScenarioReplay<typeof game>,
  command: ScenarioCommandOf<typeof game>,
) {
  return probeScenarioCommand({
    replay,
    command,
  });
}
