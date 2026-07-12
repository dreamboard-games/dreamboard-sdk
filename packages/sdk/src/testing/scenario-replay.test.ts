import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  asPlayerId,
  defineEmptyView,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  definePlayerView,
  formInput,
  perPlayer,
  rngInput,
} from "../reducer";
import {
  createManifestStringLiteralSchema,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import {
  assertScenario,
  createScenarioAuthoring,
  probeScenarioCommand,
  replayScenario,
  ScenarioReplayError,
  type ScenarioCommandOf,
  type ScenarioReplay,
} from "./index";

function createTable(playerIds: readonly string[]): RuntimeTableRecord {
  const brandedPlayerIds = playerIds.map(asPlayerId);
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
      byId: {},
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
  const phaseNames = ["play", "finish"] as const;
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
    phases: { play: z.object({}), finish: z.object({}) },
    errors: { COUNT_TOO_LARGE: "The count cannot exceed five." },
  });
  const phaseState = z.object({});
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
        actor: ({ q }) => q.player.order()[0] ?? null,
        interactions: {
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
        },
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
