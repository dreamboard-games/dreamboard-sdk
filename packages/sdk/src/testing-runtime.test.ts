import { describe, expect, test } from "vitest";
import path from "node:path";
import { z } from "zod";
import { materializeWorkspace } from "./authoring/materialize-workspace.js";
import {
  defineEmptyView,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
} from "./reducer";
import type { RuntimeTableRecord } from "./reducer/advanced";
import { asPlayerId, perPlayer } from "./reducer/per-player";
import {
  type CandidateVerificationInput,
  materializeScenarioRuntimeCheckpoint,
  runCandidateVerification,
} from "./testing-runtime.js";
import { compileScenarioReplay } from "./testing-compiler.js";
import { createScenarioAuthoring } from "./testing/definitions";

function createTable(playerIds: readonly string[]): RuntimeTableRecord {
  const ids = playerIds.map(asPlayerId);
  return {
    playerOrder: [...playerIds],
    zones: { shared: {}, perPlayer: {}, visibility: {} },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {},
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: perPlayer(ids, () => ({})),
    boards: { byId: {}, hex: {}, network: {}, square: {}, track: {} },
    dice: {},
  };
}

function createManifestContract() {
  const phaseNames = ["play"] as const;
  const playerIds = ["player-1", "player-2"] as const;
  return {
    literals: {
      playerIds,
      phaseNames,
      boardLayouts: [] as const,
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
      boardTemplateIds: [] as const,
      boardTypeIds: [] as const,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      relationTypeIds: [] as const,
      edgeIds: [] as const,
      edgeTypeIds: [] as const,
      vertexIds: [] as const,
      vertexTypeIds: [] as const,
      spaceIds: [] as const,
      spaceTypeIds: [] as const,
      handVisibilityById: {} as const,
      zoneVisibilityById: {} as const,
      cardSetIdByCardId: {},
      cardTypeByCardId: {},
      cardSetIdsBySharedZoneId: {},
      cardSetIdsByPlayerZoneId: {},
      setupChoiceIdsByOptionId: {},
    },
    ids: {
      playerId: z.enum(playerIds),
      phaseName: z.enum(phaseNames),
      boardLayout: z.string(),
      setupOptionId: z.string(),
      setupProfileId: z.string(),
      cardSetId: z.string(),
      cardType: z.string(),
      cardId: z.string(),
      deckId: z.string(),
      handId: z.string(),
      sharedZoneId: z.string(),
      playerZoneId: z.string(),
      zoneId: z.string(),
      resourceId: z.string(),
      dieId: z.string(),
      dieTypeId: z.string(),
      boardId: z.string(),
      boardTypeId: z.string(),
      boardBaseId: z.string(),
      boardContainerId: z.string(),
      relationTypeId: z.string(),
      edgeId: z.string(),
      edgeTypeId: z.string(),
      vertexId: z.string(),
      vertexTypeId: z.string(),
      portId: z.string(),
      portTypeId: z.string(),
      spaceId: z.string(),
      spaceTypeId: z.string(),
      pieceId: z.string(),
      pieceTypeId: z.string(),
    },
    defaults: {
      zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
      decks: () => ({}),
      hands: () => ({}),
      handVisibility: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => perPlayer([], () => ({})),
    },
    normalSetup: {
      minPlayers: 2,
      maxPlayers: 2,
      createInitialTable: ({ playerIds }: { playerIds: readonly string[] }) =>
        createTable(playerIds),
    },
    setupOptionsById: {},
    setupChoiceIdsByOptionId: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

function createCandidateGame() {
  const contract = defineGameContract({
    manifest: createManifestContract(),
    phases: { play: z.object({}) },
    state: {
      public: z.object({ score: z.number().int() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });

  return defineGame({
    contract,
    initial: {
      public: () => ({ score: 0 }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    views: {
      shared: defineEmptyView<typeof contract>(),
      player: defineEmptyView<typeof contract>(),
    },
    phases: {
      play: definePhase<typeof contract>()({
        kind: "player",
        state: z.object({}),
        initialState: () => ({}),
        interactions: {
          score: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ state, accept }) {
              return accept({
                ...state,
                publicState: {
                  ...state.publicState,
                  score: state.publicState.score + 1,
                },
              });
            },
          }),
          rejectNow: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ reject }) {
              return reject("NOPE", "Rejected by candidate fixture.");
            },
          }),
        },
      }),
    },
  });
}

const game = createCandidateGame();
const { defineScenario } = createScenarioAuthoring(game);

const passingScenario = defineScenario({
  id: "score-once",
  setup: { players: 2, seed: 7 },
  given: [],
  when: [
    {
      actor: { seat: 0 },
      interactionId: "score",
      params: {},
    },
  ],
  then: ({ expect: expectScenario, state }) => {
    expectScenario(state()).toMatchObject({ publicState: { score: 1 } });
  },
});

describe("runCandidateVerification", () => {
  test("replays and asserts scenarios through the canonical runtime", async () => {
    const result = await runCandidateVerification({
      reducer: game,
      scenarios: { [passingScenario.id]: passingScenario },
    });

    expect(result).toEqual({
      status: "passed",
      scenarioSummary: {
        total: 1,
        passed: 1,
        failed: 0,
        scenarios: [{ id: "score-once", status: "passed" }],
      },
    });
  });

  test("returns bounded assertion diagnostics", async () => {
    const scenario = defineScenario({
      id: "assertion-fails",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [],
      then: () => {
        throw new Error(`assertion failed: ${"x".repeat(3_000)}`);
      },
    });
    const result = await runCandidateVerification({
      reducer: game,
      scenarios: [scenario],
    });

    expect(result.status).toBe("failed");
    expect(result.scenarioSummary.scenarios[0]?.diagnostic).toMatchObject({
      kind: "assertion",
    });
    expect(
      result.scenarioSummary.scenarios[0]?.diagnostic?.message,
    ).toHaveLength(2_000);
  });

  test("preserves machine-readable replay rejection details", async () => {
    const scenario = defineScenario({
      id: "replay-rejects",
      setup: { players: 2, seed: 0 },
      given: [],
      when: [
        {
          actor: { seat: 0 },
          interactionId: "rejectNow",
          params: {},
        },
      ],
      then: () => {
        throw new Error("assertion must not run after a replay rejection");
      },
    });
    const result = await runCandidateVerification({
      reducer: game,
      scenarios: [scenario],
    });

    expect(result.scenarioSummary.scenarios[0]).toMatchObject({
      id: "replay-rejects",
      status: "failed",
      diagnostic: {
        kind: "replay",
        scenarioId: "replay-rejects",
        segment: "when",
        index: 0,
        interactionId: "rejectNow",
        errorCode: "NOPE",
        reducerMessage: "Rejected by candidate fixture.",
      },
    });
  });

  test("enforces scenario and replay-step limits", async () => {
    const twoSteps = defineScenario({
      id: "two-steps",
      setup: { players: 2, seed: 0 },
      given: [{ actor: { seat: 0 }, interactionId: "score", params: {} }],
      when: [{ actor: { seat: 0 }, interactionId: "score", params: {} }],
      then: () => undefined,
    });
    const limited = await runCandidateVerification({
      reducer: game,
      scenarios: [twoSteps],
      maxStepsPerScenario: 1,
    });
    expect(limited.scenarioSummary.scenarios[0]?.diagnostic).toEqual({
      kind: "limit",
      message:
        "Scenario contains 2 replay steps, exceeding maxStepsPerScenario limit 1.",
      actualSteps: 2,
      maxStepsPerScenario: 1,
    });

    await expect(
      runCandidateVerification({
        reducer: game,
        scenarios: [passingScenario, twoSteps],
        maxScenarios: 1,
      }),
    ).rejects.toThrow("contains 2 scenarios, exceeding limit 1");
  });

  test("rejects legacy bases and snapshots at both type and runtime boundaries", async () => {
    const assertRemovedTypes = () => {
      const cannotSupplyBases: CandidateVerificationInput<typeof game> = {
        reducer: game,
        scenarios: [passingScenario],
        // @ts-expect-error candidate verification has no base-state authority.
        bases: {},
      };
      const cannotSupplySnapshot: CandidateVerificationInput<typeof game> = {
        reducer: game,
        scenarios: [passingScenario],
        // @ts-expect-error candidate verification cannot hydrate snapshots.
        snapshot: {},
      };
      expect([cannotSupplyBases, cannotSupplySnapshot]).toBeDefined();
    };
    expect(typeof assertRemovedTypes).toBe("function");

    await expect(
      runCandidateVerification({
        reducer: game,
        scenarios: [passingScenario],
        bases: {},
      } as never),
    ).rejects.toThrow("unsupported field 'bases'");
    await expect(
      runCandidateVerification({
        reducer: game,
        scenarios: [passingScenario],
        snapshot: {},
      } as never),
    ).rejects.toThrow("unsupported field 'snapshot'");
  });

  test("materializes a trusted runtime snapshot at an authored checkpoint", async () => {
    const scenario = defineScenario({
      id: "materialized-checkpoint",
      setup: { players: 2, seed: 19 },
      given: [{ actor: { seat: 0 }, interactionId: "score", params: {} }],
      when: [{ actor: { seat: 0 }, interactionId: "score", params: {} }],
      then: () => undefined,
    });

    const materialized = await materializeScenarioRuntimeCheckpoint({
      game,
      scenario,
      at: { segment: "given", completed: 1 },
    });

    expect(materialized.checkpoint).toEqual({
      segment: "given",
      completed: 1,
    });
    expect(materialized.checkpointDigest).toMatch(/^sha256:/);
    expect(materialized.playerIds).toEqual(["player-1", "player-2"]);
    expect(materialized.state.domain.publicState).toEqual({ score: 1 });
    expect(materialized.state.runtime.rng.seed).toBe(19);
  });
});

describe("compileScenarioReplay", () => {
  test("compiles one source-bound trusted DTO without assertion or projection payloads", async () => {
    const scenarioPath = path.resolve(
      import.meta.dirname,
      "../../..",
      "examples",
      "reference-games",
      "roll-and-write-scorecard",
      "test/scenarios/complete-game.scenario.ts",
    );
    const projectRoot = path.resolve(path.dirname(scenarioPath), "../..");
    await materializeWorkspace({
      projectRoot,
      manifestPath: "manifest.ts",
    });
    const [setup, repeated, developed, firstWorkspace, secondWorkspace] =
      await Promise.all([
        compileScenarioReplay({
          scenarioPath,
          at: { segment: "setup", completed: 0 },
        }),
        compileScenarioReplay({
          scenarioPath,
          at: { segment: "setup", completed: 0 },
        }),
        compileScenarioReplay({
          scenarioPath,
          at: "developed",
        }),
        materializeWorkspace({ projectRoot, manifestPath: "manifest.ts" }),
        materializeWorkspace({ projectRoot, manifestPath: "manifest.ts" }),
      ]);

    expect(setup.schemaVersion).toBe(1);
    expect(firstWorkspace.digest).toBe(secondWorkspace.digest);
    expect(setup.scenario.path).toBe(
      "test/scenarios/complete-game.scenario.ts",
    );
    expect(setup.scenario.sourceDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(repeated.scenario.sourceDigest).toBe(setup.scenario.sourceDigest);
    expect(developed.scenario.sourceDigest).toBe(setup.scenario.sourceDigest);
    expect(setup.checkpoint).toEqual({ segment: "setup", completed: 0 });
    expect(developed.checkpoint).toEqual({
      segment: "given",
      completed: 21,
    });
    expect(developed.expected.checkpointDigest).not.toBe(
      setup.expected.checkpointDigest,
    );
    expect(developed.expected.publicProjectionDigest).not.toBe(
      setup.expected.publicProjectionDigest,
    );
    expect(setup.definition.given).toHaveLength(21);
    expect(setup.definition.when).toHaveLength(3);
    expect(Object.hasOwn(setup.definition, "then")).toBe(false);
    const serialized = JSON.stringify(setup);
    expect(serialized).not.toContain("publicState");
    expect(serialized).not.toContain("privateState");
    expect(serialized).not.toContain("player-1");
  }, 30_000);
});
