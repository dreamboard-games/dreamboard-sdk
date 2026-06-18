import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  createReducerBundle,
  defineEffect,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  defineView,
  type ReducerDiagnosticEvent,
} from "../../../reducer";
import type { RuntimeTableRecord } from "../../../reducer/advanced";
import { asPlayerId, perPlayer } from "../../per-player";

function digest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}

function createTable(playerIds = ["player-1", "player-2"]): RuntimeTableRecord {
  const ids = playerIds.map((id) => asPlayerId(id));
  return {
    playerOrder: [...playerIds],
    zones: {
      shared: {},
      perPlayer: {},
      visibility: {},
    },
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
    dice: {
      "die-1": {
        id: "die-1",
        dieTypeId: "d6",
        dieName: "Test die",
        sides: 6,
        value: null,
        properties: {},
      },
    },
  };
}

function createManifestContract() {
  const phaseNames = ["play", "done"] as const;
  const playerIds = ["player-1", "player-2"] as const;
  const dieIds = ["die-1"] as const;

  return {
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
      dieTypeIds: ["d6"] as const,
      dieIds,
      boardBaseIds: [] as const,
      boardIds: [] as const,
      boardContainerIds: [] as const,
      tileIds: [] as const,
      tileTypeIds: [] as const,
      edgeIds: [] as const,
      vertexIds: [] as const,
      portIds: [] as const,
      portTypeIds: [] as const,
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
      dieId: z.enum(dieIds),
      boardId: z.string(),
      boardBaseId: z.string(),
      boardContainerId: z.string(),
      tileId: z.string(),
      tileTypeId: z.string(),
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
    setupOptionsById: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

function createCharacterizationGame() {
  const contract = defineGameContract({
    manifest: createManifestContract(),
    phases: {
      play: z.object({ visits: z.number().int() }),
      done: z.object({ visits: z.number().int() }),
    },
    state: {
      public: z.object({
        score: z.number().int(),
        recordedRoll: z.number().nullable(),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });

  const rollDieEffect = defineEffect<typeof contract>()({
    type: "rollDie",
    id: "rollDie",
  });

  return defineGame({
    contract,
    initial: {
      public: () => ({ score: 0, recordedRoll: null }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    phases: {
      play: definePhase<typeof contract>()({
        kind: "player",
        state: z.object({ visits: z.number().int() }),
        initialState: () => ({ visits: 1 }),
        effects: { rollDieEffect },
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
              return reject("NOPE", "Rejected by golden fixture.");
            },
          }),
          finish: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ state, accept, fx }) {
              return accept(state, { instructions: [fx.transition("done")] });
            },
          }),
          rollTwice: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ state, accept, fx }) {
              return accept(state, {
                instructions: [
                  fx.effect(rollDieEffect, { dieId: "die-1" }),
                  fx.effect(rollDieEffect, { dieId: "die-1" }),
                ],
              });
            },
          }),
        },
      }),
      done: definePhase<typeof contract>()({
        kind: "player",
        state: z.object({ visits: z.number().int() }),
        initialState: () => ({ visits: 10 }),
      }),
    },
    views: {
      player: defineView<typeof contract>()({
        project({ state, playerId }) {
          return {
            playerId,
            phase: state.flow.currentPhase,
            score: state.publicState.score,
            visits: state.phase.visits,
          };
        },
      }),
    },
  });
}

describe("phase 4 trusted-bundle characterization", () => {
  test("dispatch accept/reject outcomes stay golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 7,
    });

    const accepted = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "score",
        params: {},
      },
    });
    const rejected = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rejectNow",
        params: {},
      },
    });

    expect({
      accepted:
        accepted.kind === "accept"
          ? {
              kind: accepted.kind,
              traceKinds: accepted.trace.map((entry) => entry.kind),
              stateDigest: digest(accepted.state.domain),
            }
          : accepted,
      rejected,
    }).toMatchSnapshot();
  });

  test("lifecycle transition and phase reset stay golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const result = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "finish",
        params: {},
      },
    });

    expect(
      result.kind === "accept"
        ? {
            phase: result.state.domain.flow.currentPhase,
            phaseState: { visits: result.state.domain.phase.visits },
            lastTransition: result.state.runtime.lastTransition,
            traceKinds: result.trace.map((entry) => entry.kind),
          }
        : result,
    ).toMatchSnapshot();
  });

  test("seat projection digest stays golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const projection = bundle.projectSeatsDynamic({
      state: initial,
      playerIds: ["player-1", "player-2"],
    });

    expect({
      digest: digest(projection),
      seats: projection.seats,
    }).toMatchSnapshot();
  });

  test("rng effect traces and state digest stay golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

    const result = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollTwice",
        params: {},
      },
    });

    expect(
      result.kind === "accept"
        ? {
            traceKinds: result.trace.map((entry) => entry.kind),
            rngTrace: result.state.runtime.rng.trace,
            stateDigest: digest(result.state.domain),
          }
        : result,
    ).toMatchSnapshot();
  });

  test("dispatch emits summarized diagnostics without leaking state", async () => {
    const events: ReducerDiagnosticEvent[] = [];
    const bundle = createReducerBundle(createCharacterizationGame(), {
      diagnostics: {
        event(event) {
          events.push(event);
        },
      },
    });
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

    const accepted = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollTwice",
        params: {},
      },
    });
    const rejected = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rejectNow",
        params: {},
      },
    });

    expect(accepted.kind).toBe("accept");
    expect(rejected.kind).toBe("reject");
    expect(events).toEqual([
      {
        type: "submitReceived",
        submissionId: "sub-1",
        playerId: "player-1",
        interactionId: "rollTwice",
        phase: "play",
      },
      {
        type: "submitAccepted",
        submissionId: "sub-1",
        trace: [
          {
            kind: "acceptedClientInput",
            playerId: "player-1",
            interactionId: "rollTwice",
          },
          { kind: "appliedInstruction", instruction: "engine.rollDie" },
          expect.objectContaining({
            kind: "rngConsumption",
            operation: "rollDie",
          }),
          { kind: "appliedInstruction", instruction: "engine.rollDie" },
          expect.objectContaining({
            kind: "rngConsumption",
            operation: "rollDie",
          }),
        ],
      },
      {
        type: "submitReceived",
        submissionId: "sub-2",
        playerId: "player-1",
        interactionId: "rejectNow",
        phase: "play",
      },
      {
        type: "submitRejected",
        submissionId: "sub-2",
        errorCode: "NOPE",
        message: "Rejected by golden fixture.",
      },
    ]);
    expect(JSON.stringify(events)).not.toContain("publicState");
    expect(JSON.stringify(events)).not.toContain("hiddenState");
    expect(JSON.stringify(events)).not.toContain("privateState");
  });

  test("diagnostics sink failures are disarmed without changing dispatch", async () => {
    const events: ReducerDiagnosticEvent[] = [];
    const bundle = createReducerBundle(createCharacterizationGame(), {
      diagnostics: {
        event(event) {
          events.push(event);
          if (event.type === "submitReceived") {
            throw new Error("sink exploded");
          }
        },
      },
    });
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const result = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "score",
        params: {},
      },
    });

    expect(result.kind).toBe("accept");
    expect(events.map((event) => event.type)).toEqual([
      "submitReceived",
      "internalError",
    ]);
  });

  test("phase transitions emit diagnostics events", async () => {
    const events: ReducerDiagnosticEvent[] = [];
    const bundle = createReducerBundle(createCharacterizationGame(), {
      diagnostics: {
        event(event) {
          events.push(event);
        },
      },
    });
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "finish",
        params: {},
      },
    });

    expect(events).toContainEqual({
      type: "phaseTransition",
      from: "play",
      to: "done",
      reason: "effect",
    });
  });
});
