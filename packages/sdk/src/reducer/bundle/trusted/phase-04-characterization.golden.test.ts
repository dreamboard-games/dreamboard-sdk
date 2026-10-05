import {
  testReferenceBasis,
  testGameplayBasis,
} from "../../../shared/__fixtures__/reference-basis.js";
import { createGame as createModel } from "../../../reducer";

import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createReducerBundle,
  type ReducerDiagnosticEvent,
} from "../../../reducer";
import type { RuntimeTableRecord } from "../../../reducer/model";
import { asPlayerId } from "../../per-player";

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

function createTable(playerIds = ["player-1", "player-2"]) {
  const ids = playerIds.map((id) => asPlayerId(id));
  return {
    tiles: {},
    playerOrder: [...playerIds],
    zones: {},
    cards: {},
    pieces: {},
    componentLocations: { "die-1": { type: "Detached" } },
    ownerOfCard: {},
    visibility: {},
    resources: Object.fromEntries(ids.map((id) => [id, {}])),
    boards: {},
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
  } satisfies RuntimeTableRecord;
}

function createCharacterizationGame() {
  const contract = createModel({
    manifest: {
      players: { minPlayers: 2, maxPlayers: 2 },
      cardSets: [],
      dieTypes: [{ id: "d6", name: "Test die", sides: 6 }],
      dieSeeds: [{ id: "die-1", typeId: "d6", home: { type: "detached" } }],
    },
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

  return contract.assemble({
    initial: {
      public: () => ({ score: 0, recordedRoll: null }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    phases: {
      play: contract.phase("play").define({
        kind: "player",
        initialState: () => ({ visits: 1 }),
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
              return tx.reject("NOPE", "Rejected by golden fixture.");
            },
          }),
          finish: contract.phase("play").interaction({
            inputs: {},
            reduce({ tx }) {
              return tx.transition("done");
            },
          }),
          rollTwice: contract.phase("play").interaction({
            inputs: {},
            reduce({ tx }) {
              tx.roll("die-1");
              tx.roll("die-1");
            },
          }),
        },
      }),
      done: contract
        .phase("done")
        .define({ kind: "player", initialState: () => ({ visits: 10 }) }),
    },
    view: contract.view(({ state, playerId }) => {
      return {
        playerId,
        phase: state.flow.currentPhase,
        score: state.publicState.score,
        visits: state.phase.visits,
      };
    }),
  });
}

describe("phase 4 trusted-bundle characterization", () => {
  test("dispatch accept/reject outcomes stay golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 7,
    });

    const accepted = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "score",
        params: {},
      },
    });
    const rejected = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rejectNow",
        params: {},
      },
    });

    if (accepted.kind === "accept") {
      expect(accepted.state.domain.publicState).toEqual({
        score: 1,
        recordedRoll: null,
      });
      expect(accepted.state.domain).toMatchObject({ table: { zones: {} } });
      expect(accepted.state.domain).toMatchObject({
        table: { componentLocations: { "die-1": { type: "Detached" } } },
      });
    }
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
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const result = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
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
            phaseState: z
              .object({ visits: z.number().int() })
              .parse(result.state.domain.phase),
            lastTransition: result.state.runtime.lastTransition,
            traceKinds: result.trace.map((entry) => entry.kind),
          }
        : result,
    ).toMatchSnapshot();
  });

  test("seat projection digest stays golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const projection = bundle.project({
      referenceBasis: testReferenceBasis,
      state: initial,
      playerIds: ["player-1", "player-2"],
    });

    expect({
      digest: digest(projection),
      schedulerFlow: projection.schedulerFlow,
      seats: projection.seats,
    }).toMatchSnapshot();
  });

  test("seeded roll traces and state digest stay golden", async () => {
    const bundle = createReducerBundle(createCharacterizationGame());
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

    const result = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollTwice",
        params: {},
      },
    });

    if (result.kind === "accept") {
      expect(result.state.domain.publicState).toEqual({
        score: 0,
        recordedRoll: null,
      });
      expect(result.state.domain).toMatchObject({
        table: { dice: { "die-1": { value: 5 } } },
      });
      expect(result.state.domain).toMatchObject({
        table: { componentLocations: { "die-1": { type: "Detached" } } },
      });
    }
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
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

    const accepted = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollTwice",
        params: {},
      },
    });
    const rejected = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
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
          expect.objectContaining({
            kind: "rngConsumption",
            operation: "rollDie",
          }),
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
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const result = await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
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
    const { state: initial } = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    await bundle.dispatch({
      referenceBasis: testReferenceBasis,
      state: initial,
      input: {
        basis: testGameplayBasis("player-1"),
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
