import { createGame as createModel, createReducerBundle } from "../reducer";
import { replayScenario, advanceScenarioReplay } from "./scenario-replay";
import { describe, expect, test } from "vitest";
import { z } from "zod";

import type { RuntimeTableRecord } from "../reducer/model";
import { asPlayerId } from "../reducer/per-player";
import {
  type CandidateVerificationInput,
  materializeScenarioRuntimeCheckpoint,
  runCandidateVerification,
} from "./candidate-verification.js";
import { createScenarioAuthoring } from "./definitions";

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
    resources: Object.fromEntries(ids.map((id) => [id, {}])),
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
    },
    ids: {
      playerId: z.enum(playerIds),
      phaseName: z.enum(phaseNames),
      boardLayout: z.string(),
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
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
    normalSetup: {
      minPlayers: 2,
      maxPlayers: 2,
      createInitialTable: ({ playerIds }: { playerIds: readonly string[] }) =>
        createTable(playerIds),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

function createCandidateGame() {
  const contract = createModel({
    manifest: createManifestContract(),
    phases: { play: z.object({}) },
    state: {
      public: z.object({ score: z.number().int() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });

  return contract.assemble({
    initial: {
      public: () => ({ score: 0 }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    view: () => ({}),
    phases: {
      play: contract.phase("play").define({
        kind: "player",
        initialState: () => ({}),
        interactions: {
          score: contract.phase("play").interaction({
            inputs: {},
            reduce({ state, tx }) {
              tx.patchPublicState({ score: state.publicState.score + 1 });
              return;
            },
          }),
          rejectNow: contract.phase("play").interaction({
            inputs: {},
            reduce({ tx }) {
              return tx.reject("NOPE", "Rejected by candidate fixture.");
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
  test("retains the exact artifact through clone and advance", async () => {
    const production = createReducerBundle(game);
    const calls = { initialize: 0, dispatch: 0, project: 0 };
    const bundle = {
      ...production,
      initialize(input: Parameters<typeof production.initialize>[0]) {
        calls.initialize++;
        return production.initialize(input);
      },
      async dispatch(input: Parameters<typeof production.dispatch>[0]) {
        calls.dispatch++;
        const result = await production.dispatch(input);
        if (result.kind === "accept")
          result.state.domain.publicState.score = 99;
        return result;
      },
      project(input: Parameters<typeof production.project>[0]) {
        calls.project++;
        return production.project(input);
      },
    };
    const replay = await replayScenario({
      game,
      bundle,
      scenario: passingScenario,
      at: { segment: "setup", completed: 0 },
    });
    const cloned = replay.clone();
    cloned.view({ seat: 0 });
    const advanced = await advanceScenarioReplay({
      replay: cloned,
      command: { actor: { seat: 0 }, interactionId: "score", params: {} },
    });
    expect(advanced.kind).toBe("accepted");
    if (advanced.kind !== "accepted") throw new Error("Unexpected rejection");
    expect(advanced.replay.state().publicState.score).toBe(99);
    advanced.replay.view({ seat: 0 });
    expect(calls).toEqual({ initialize: 1, dispatch: 1, project: 2 });
  });

  test("fails a valid-contract artifact with incorrect dispatch despite correct authored source", async () => {
    const production = createReducerBundle(game);
    const bundle = {
      ...production,
      async dispatch(request: Parameters<typeof production.dispatch>[0]) {
        const result = await production.dispatch(request);
        if (result.kind === "accept")
          result.state.domain.publicState.score = 99;
        return result;
      },
    };
    const result = await runCandidateVerification({
      reducer: game,
      bundle,
      scenarios: [passingScenario],
    });
    expect(result.status).toBe("failed");
    expect(result.scenarioSummary.scenarios[0]?.diagnostic?.kind).toBe(
      "assertion",
    );
  });

  test.each(["initialize", "project"] as const)(
    "executes candidate %s instead of rebuilding authored behavior",
    async (operation) => {
      const bundle = {
        ...createReducerBundle(game),
        [operation]: () => {
          throw new Error(`candidate ${operation} executed`);
        },
      };
      const scenario = defineScenario({
        id: "artifact-projection",
        setup: { players: 2, seed: 1 },
        given: [],
        when: [],
        then: ({ view }) => {
          view({ seat: 0 });
        },
      });
      const result = await runCandidateVerification({
        reducer: game,
        bundle,
        scenarios: [scenario],
      });
      expect(result.status).toBe("failed");
      expect(
        result.scenarioSummary.scenarios[0]?.diagnostic?.message,
      ).toContain(`candidate ${operation} executed`);
    },
  );

  test("replays and asserts scenarios through the canonical runtime", async () => {
    const result = await runCandidateVerification({
      reducer: game,
      bundle: createReducerBundle(game),
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
        throw new Error(`assertion failed: ${"x".repeat(3000)}`);
      },
    });
    const result = await runCandidateVerification({
      reducer: game,
      bundle: createReducerBundle(game),
      scenarios: [scenario],
    });

    expect(result.status).toBe("failed");
    expect(result.scenarioSummary.scenarios[0]?.diagnostic).toMatchObject({
      kind: "assertion",
    });
    expect(
      result.scenarioSummary.scenarios[0]?.diagnostic?.message,
    ).toHaveLength(2000);
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
      bundle: createReducerBundle(game),
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
      bundle: createReducerBundle(game),
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
        bundle: createReducerBundle(game),
        scenarios: [passingScenario, twoSteps],
        maxScenarios: 1,
      }),
    ).rejects.toThrow("contains 2 scenarios, exceeding limit 1");
  });

  test("rejects legacy bases and snapshots at both type and runtime boundaries", async () => {
    const assertRemovedTypes = () => {
      const cannotSupplyBases: CandidateVerificationInput<typeof game> = {
        reducer: game,
        bundle: createReducerBundle(game),
        scenarios: [passingScenario],
        // @ts-expect-error candidate verification has no base-state authority.
        bases: {},
      };
      const cannotSupplySnapshot: CandidateVerificationInput<typeof game> = {
        reducer: game,
        bundle: createReducerBundle(game),
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
        bundle: createReducerBundle(game),
        scenarios: [passingScenario],
        bases: {},
      } as never),
    ).rejects.toThrow("unsupported field 'bases'");
    await expect(
      runCandidateVerification({
        reducer: game,
        bundle: createReducerBundle(game),
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
