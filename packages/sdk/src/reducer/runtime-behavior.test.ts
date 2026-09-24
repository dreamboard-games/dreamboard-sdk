import { createTable } from "./lifecycle-test-fixtures";
import * as ReducerWireZod from "../shared/runtime-schema";
import { canonicalizePluginRuntimeJson } from "../shared/protocol/digest.js";
import { SeatProjectionBundleSchema } from "../shared/protocol/schema.js";

import { createReducerTestingRuntime } from "../testing/reducer-runtime.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  createGame,
  createReducerBundle,
  memoize,
  gameEvent,
} from "../reducer";
import { rngInput } from "./inputs";
import { type InputCollector, type RuntimeTableRecord } from "../reducer/model";

import {
  getCloneRuntimeTableCallCount,
  resetCloneRuntimeTableCallCount,
} from "./table/clone";

function createManifestContract() {
  const phaseNames = ["takeTurn"] as const;
  const playerIds = ["player-1", "player-2"] as const;
  const dieIds = ["die-1"] as const;

  return {
    literals: {
      playerIds,
      phaseNames,
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
      zones: () => ({
        shared: {},
        perPlayer: {},
        visibility: {},
      }),
      decks: () => ({}),
      hands: () => ({}),
      handVisibility: () => ({}),
      ownerOfCard: () => ({}),
      visibility: () => ({}),
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

function expectProjectionTiming(timing: {
  resolveAvailableInteractionsMs: number;
  resolveViewMs: number;
  resolveZoneHandlesMs: number;
  descriptorHashMs: number;
}) {
  for (const value of Object.values(timing)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value >= 0).toBe(true);
  }
}

describe("direct reducer lifecycle and seeded operations", () => {
  test("accepted mixed random helpers and transaction operations publish one contiguous RNG stream through entry", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          values: z.array(z.number()),
          finished: z.boolean(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({ values: [], finished: false }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          enter({ tx }) {
            if (tx.state.publicState.finished)
              tx.patchPublicState({
                values: [...tx.state.publicState.values, tx.roll("die-1")],
              });
          },
          interactions: {
            mix: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ tx, random }) {
                const first = random.integer({
                  minInclusive: 10,
                  maxInclusive: 20,
                });
                const second = tx.roll("die-1");
                const selected = random.subset({
                  from: [1, 2, 3] as const,
                  count: 2,
                });
                tx.shuffle({ zoneId: "draw" });
                tx.patchPublicState({
                  values: [first, second, ...selected],
                  finished: true,
                });
                return tx.transition("takeTurn");
              },
            }),
          },
        }),
      },
    });
    const makeTable = () => {
      const table = createTable();
      const ids = ["a", "b", "c"];
      table.decks.draw = [...ids];
      table.zones.shared.draw = [...ids];
      for (const [position, id] of ids.entries()) {
        table.cards[id] = {
          id,
          cardSetId: "main",
          cardType: "card",
          properties: {},
        };
        table.componentLocations[id] = {
          type: "InDeck",
          deckId: "draw",
          position,
          playedBy: null,
        };
        table.ownerOfCard[id] = null;
      }
      return table;
    };
    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: makeTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;
    const before = structuredClone(initial);
    const input = {
      kind: "interaction" as const,
      playerId: "player-1",
      interactionId: "mix",
      params: {},
    };
    const accepted = await bundle.dispatch({ state: initial, input });
    const freshBundle = createReducerTestingRuntime(game);
    const fresh = (
      await freshBundle.initialize({
        table: makeTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;
    expect(accepted).toEqual(
      await freshBundle.dispatch({ state: fresh, input }),
    );
    if (accepted.kind !== "accept")
      throw new Error("Expected mixed operations to accept");
    expect(initial).toEqual(before);
    expect(accepted.state.runtime.rng.draws?.map((draw) => draw.index)).toEqual(
      [0, 1, 2, 3, 4, 5, 6],
    );
    expect(accepted.state.runtime.rng.cursor).toBe(7);
    expect(
      accepted.trace
        .filter((entry) => entry.kind === "rngConsumption")
        .map((entry) => [entry.drawIndex, entry.operation]),
    ).toEqual([
      [0, "random.integer"],
      [1, "rollDie"],
      [2, "randomSubset"],
      [3, "randomSubset"],
      [4, "shuffleSharedZone"],
      [5, "shuffleSharedZone"],
      [6, "rollDie"],
    ]);
    expect(accepted.trace.at(-2)).toEqual({
      kind: "phaseEntered",
      from: "takeTurn",
      to: "takeTurn",
    });
    expect(accepted.state.domain.publicState.values).toHaveLength(5);
  });

  test.each(["phase", "roll", "dispatch"] as const)(
    "initialize preserves %s terminal outcomes and events",
    async (mode) => {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({ complete: z.boolean() }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });
      const outcome = {
        reason: { code: "INITIAL_STATE_COMPLETE" },
        standings: [
          { playerId: "player-1", rank: 1, result: "draw" as const },
          { playerId: "player-2", rank: 1, result: "draw" as const },
        ],
      };
      const entered = gameEvent.systemAction({
        procedureId: "entered",
        title: "Entered phase",
      });
      const completed = gameEvent.systemAction({
        procedureId: "completed",
        title: "Completed initialization",
      });
      const game = contract.assemble({
        initial: {
          public: () => ({ complete: false }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            enter({ tx }) {
              if (mode === "dispatch" && !tx.state.publicState.complete) return;
              tx.emit(entered);
              if (mode === "roll") {
                tx.roll("die-1");
                tx.emit(completed);
              }
              return tx.endGame(outcome);
            },
            interactions: {
              complete: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ tx }) {
                  tx.patchPublicState({ complete: true });
                  return tx.transition("takeTurn");
                },
              }),
            },
          }),
        },
        view: () => ({}),
      });
      const bundle = createReducerBundle(game);
      const initialized = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });
      const result =
        mode === "dispatch"
          ? await bundle.dispatch({
              state: initialized.state,
              input: {
                kind: "interaction",
                playerId: "player-1",
                interactionId: "complete",
                params: {},
              },
            })
          : initialized;
      if ("kind" in result && result.kind === "reject")
        throw new Error("Expected completion");
      expect(result.terminal).toEqual(outcome);
      expect(result.events).toEqual(
        mode === "roll" ? [entered, completed] : [entered],
      );
      expect(result.state.domain.flow.currentPhase).toBe("takeTurn");
      if (mode === "roll") expect(result.state.runtime.rng.cursor).toBe(1);
    },
  );

  test("runner operations replay the same state independently of warm caches", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({ count: z.number().int() }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = contract.assemble({
      initial: {
        public: () => ({ count: 0 }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            advance: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ state, tx }) {
                tx.patchPublicState({
                  count: state.publicState.count + 1,
                });
                return;
              },
            }),
          },
        }),
      },
      view: contract.view(({ state }) => {
        return { count: state.publicState.count };
      }),
    });
    const warm = createReducerBundle(game);
    expect(Object.keys(warm).sort()).toEqual([
      "boardStatic",
      "dispatch",
      "initialize",
      "project",
      "reducerContractVersion",
    ]);
    expect(warm.reducerContractVersion).toBe("0.6.0");
    const playerIds = ["player-1", "player-2"];
    const { state: initial } = await warm.initialize({
      table: createTable(),
      playerIds,
      rngSeed: 123,
    });
    const snapshot = structuredClone(initial);
    const input = {
      kind: "interaction" as const,
      playerId: "player-1",
      interactionId: "advance",
      params: {},
    };
    const advanced = await warm.dispatch({ state: initial, input });
    expect(advanced.kind).toBe("accept");
    if (advanced.kind !== "accept")
      throw new Error("Expected accepted fixture move");
    warm.project({ state: advanced.state, playerIds });
    // Restore an older authoritative state after advancing and warming projections.
    const replayed = await warm.dispatch({
      state: structuredClone(snapshot),
      input,
    });
    const fresh = createReducerBundle(game);
    expect(replayed).toEqual(
      await fresh.dispatch({ state: structuredClone(snapshot), input }),
    );
    const { timing: warmTiming, ...warmProjection } = warm.project({
      state: snapshot,
      playerIds,
    });
    const { timing: freshTiming, ...freshProjection } = fresh.project({
      state: structuredClone(snapshot),
      playerIds,
    });
    expect(warmProjection).toEqual(freshProjection);
    const wireProjection = canonicalizePluginRuntimeJson(warmProjection);
    expect(
      ReducerWireZod.SeatProjectionBundleSchema.parse(wireProjection),
    ).toEqual(wireProjection);
    expect(SeatProjectionBundleSchema.parse(wireProjection)).toEqual(
      wireProjection,
    );
    expect(wireProjection).toMatchObject({});
    expect(warmTiming).toBeDefined();
    expect(freshTiming).toBeDefined();
    expect(warmProjection).not.toHaveProperty("version");
    expect(warmProjection).not.toHaveProperty("actionSetVersion");
    expect(warmProjection).not.toHaveProperty("perspectivePlayerId");
    expect(initial).toEqual(snapshot);
  });

  test("reduce and dispatch materialize reducer-authored game events", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          count: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({ count: 0 }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            advance: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ state, tx }) {
                tx.patchPublicState({
                  count: state.publicState.count + 1,
                });
                tx.emit(
                  gameEvent.systemAction({
                    procedureId: "count-advance",
                    title: "The count advanced",
                    details: [
                      {
                        label: "Count",
                        value: state.publicState.count + 1,
                      },
                    ],
                  }),
                );
                return;
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;
    const input = {
      kind: "interaction" as const,
      playerId: "player-1",
      interactionId: "advance",
      params: {},
    };

    const reduced = await bundle.reduce({ state: initial, input });
    expect(reduced).toMatchObject({
      kind: "accept",
      events: [
        {
          kind: "systemAction",
          procedureId: "count-advance",
          title: "The count advanced",
          details: [{ label: "Count", value: 1 }],
        },
      ],
    });

    const dispatched = await bundle.dispatch({ state: initial, input });
    expect(dispatched).toMatchObject({
      kind: "accept",
      events: [
        {
          kind: "systemAction",
          procedureId: "count-advance",
          title: "The count advanced",
          details: [{ label: "Count", value: 1 }],
        },
      ],
    });
  });

  test("bundle project returns a plain view synchronously", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          counter: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({
          secret: z.string(),
        }),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({
          secret: "eel",
        }),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract
          .phase("takeTurn")
          .define({ kind: "player", initialState: () => ({}) }),
      },
      view: contract.view(({ state }) => {
        return {
          counter: state.publicState.counter,
          secret: state.hiddenState.secret,
        };
      }),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    const projection = bundle.project({
      state: session,
      playerIds: ["player-1"],
    });
    const view = projection.seats["player-1"]?.view;

    expect(view).toEqual({
      counter: 3,
      secret: "eel",
    });
    expect(
      typeof (
        view as {
          then?: unknown;
        }
      ).then,
    ).toBe("undefined");
    expectProjectionTiming(projection.timing);
    expect(
      Object.prototype.propertyIsEnumerable.call(projection, "timing"),
    ).toBe(false);
    expect(JSON.stringify(projection)).not.toContain("descriptorHashMs");
  });

  test("project actionsOnly projects interaction refs and timing", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          counter: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            advance: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce: () => {},
            }),
          },
        }),
      },
      view: contract.view(({ state }) => ({
        counter: state.publicState.counter,
      })),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    const projection = bundle.project({
      state: session,
      playerIds: ["player-1"],
      projectionMode: "actionsOnly",
    });
    const seat = projection.seats["player-1"];
    const refs = seat?.availableInteractionRefs;

    expect(seat).toBeDefined();
    expect("sharedView" in projection).toBe(false);
    expect("view" in seat!).toBe(false);
    expect("zones" in seat!).toBe(false);
    expect(Array.isArray(refs)).toBe(true);
    expect((refs as string[]).length).toBe(1);
    expect(projection.interactionsByRef[(refs as string[])[0]!]).toMatchObject({
      interactionId: "advance",
    });
    expectProjectionTiming(projection.timing);
    expect(projection.timing.resolveViewMs).toBe(0);
    expect(projection.timing.resolveZoneHandlesMs).toBe(0);
  });
  test("project evaluates only requested seats and never promotes private data to shared", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          counter: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const viewedPlayers: string[] = [];
    const game = contract.assemble({
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract
          .phase("takeTurn")
          .define({ kind: "player", initialState: () => ({}) }),
      },
      view: contract.view(({ playerId, state }) => {
        viewedPlayers.push(playerId);
        return {
          playerId,
          secret: `private:${playerId}`,
          counter: state.publicState.counter,
        };
      }),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    const projection = bundle.project({
      state: session,
      playerIds: ["player-1", "player-2"],
    });
    expect(viewedPlayers).toEqual(["player-1", "player-2"]);
    expect(projection).not.toHaveProperty("sharedView");
    expect(projection.seats["player-1"]?.view).toEqual({
      playerId: "player-1",
      counter: 3,
      secret: "private:player-1",
    });
    expect(projection.seats["player-2"]?.view).toEqual({
      playerId: "player-2",
      counter: 3,
      secret: "private:player-2",
    });
    const spectator = bundle.project({ state: session, playerIds: [] });
    expect(spectator).not.toHaveProperty("sharedView");
    expect(spectator.seats).toEqual({});
    expect(viewedPlayers).toEqual(["player-1", "player-2"]);
    const seat = bundle.project({ state: session, playerIds: ["player-2"] });
    expect(Object.keys(seat.seats)).toEqual(["player-2"]);
    expect(JSON.stringify(seat)).not.toContain("private:player-1");
  });

  test("project full projection resolves descriptors and views", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          counter: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    let availableCalls = 0;

    const game = contract.assemble({
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            inspect: contract.phase("takeTurn").interaction({
              inputs: {},
              rules: [
                {
                  id: "count-availability-calls",
                  errorCode: "not-available",
                  available: () => {
                    availableCalls++;
                    return true;
                  },
                },
              ],
              reduce: () => {},
            }),
          },
        }),
      },
      view: contract.view(({ state, playerId }) => {
        return {
          playerId,
          counter: state.publicState.counter,
        };
      }),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    const projection = bundle.project({
      state: session,
      playerIds: ["player-1"],
    });

    expect(projection.seats["player-1"]?.view).toEqual({
      playerId: "player-1",
      counter: 3,
    });
    expect(availableCalls).toBe(1);
  });

  test("ordinary memoized functions share immutable inputs across seats and descriptors", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          counter: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    let computeCount = 0;
    let availabilityCalls = 0;
    const expensiveTotal = memoize((state: { counter: number }) => {
      computeCount++;
      return state.counter;
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            inspect: contract.phase("takeTurn").interaction({
              inputs: {},
              rules: [
                {
                  id: "positive-total",
                  errorCode: "EMPTY_TOTAL",
                  available: ({ state }) => {
                    availabilityCalls++;
                    return expensiveTotal(state.publicState) > 0;
                  },
                },
              ],
              reduce: () => {},
            }),
          },
        }),
      },
      view: contract.view(({ state }) => {
        return { total: expensiveTotal(state.publicState) };
      }),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    bundle.project({
      state: session,
      playerIds: ["player-1", "player-2"],
    });

    expect(computeCount).toBe(1);
    expect(availabilityCalls).toBeGreaterThan(0);
  });

  test("project skips target eligibility for unavailable descriptors", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    let eligibleTargetCalls = 0;
    const targetInput: InputCollector<z.ZodString, never, "board-edge"> = {
      kind: "board-edge",
      schema: z.string(),
      eligibleTargets: () => {
        eligibleTargetCalls++;
        return ["edge-1"];
      },
      validateTarget: () => null,
      domain: () => {
        eligibleTargetCalls++;
        return {
          type: "boardTarget",
          projection: "resolved",
          targetKind: "edge",
          boardId: "board",
          eligibleTargets: ["edge-1"],
        };
      },
      meta: {
        targetKind: "edge",
        boardId: "board",
      },
    };

    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          interactions: {
            blockedTarget: contract.phase("takeTurn").interaction({
              inputs: {
                edgeId: targetInput,
              },
              rules: [
                {
                  id: "blocked",
                  errorCode: "blocked",
                  message: "Interaction is blocked by its rule.",
                  available: () => false,
                },
              ],
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });

    const bundle = createReducerTestingRuntime(game);
    const session = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;
    const projection = bundle.project({
      state: session,
      playerIds: ["player-1"],
    });
    const descriptor = (
      projection.seats["player-1"]?.availableInteractionRefs ?? []
    )
      .map((ref) => projection.interactionsByRef[ref])
      .find((interaction) => interaction.interactionId === "blockedTarget");

    expect(eligibleTargetCalls).toBe(0);
    expect(descriptor?.availability).toMatchObject({
      status: "blocked",
      reason: "Interaction is blocked by its rule.",
    });
    expect(descriptor?.inputs).toEqual([]);
  });

  test("bundle dispatch rejects unsupported actions with the new discriminator", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          pingCount: z.number().int(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          pingCount: 0,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract
          .phase("takeTurn")
          .define({ kind: "player", initialState: () => ({}) }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 23,
      })
    ).state;

    const rejected = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "unknownAction",
        params: {},
      },
    });

    expect(rejected).toMatchObject({
      kind: "reject",
      errorCode: "unsupported-action",
    });
    expect((rejected as Record<string, unknown>).type).toBeUndefined();
  });

  test("reduce and dispatch enforce action availability and reducer validation", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          lockedRan: z.boolean(),
          invalidRan: z.boolean(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          lockedRan: false,
          invalidRan: false,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            locked: contract.phase("takeTurn").interaction({
              inputs: {},
              rules: [
                {
                  id: "locked",
                  errorCode: "action-unavailable",
                  message: "Interaction 'locked' is currently unavailable.",
                  available: () => false,
                },
              ],
              reduce({ tx }) {
                tx.patchPublicState({ lockedRan: true });
                return;
              },
            }),
            invalid: contract.phase("takeTurn").interaction({
              inputs: {},
              rules: [
                {
                  id: "invalid-move",
                  errorCode: "invalid-move",
                  message: "Nope.",
                  validate: () => false,
                },
              ],
              reduce({ tx }) {
                tx.patchPublicState({ invalidRan: true });
                return;
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
      })
    ).state;

    expect(
      await bundle.validateInput({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "locked",
          params: {},
        },
      }),
    ).toEqual({
      valid: false,
      errorCode: "action-unavailable",
      message: "Interaction 'locked' is currently unavailable.",
    });

    expect(
      await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "locked",
          params: {},
        },
      }),
    ).toMatchObject({
      kind: "reject",
      errorCode: "action-unavailable",
    });

    expect(
      await bundle.dispatch({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "invalid",
          params: {},
        },
      }),
    ).toMatchObject({
      kind: "reject",
      errorCode: "invalid-move",
      message: "Nope.",
    });
  });

  test("tx.roll consumes seeded RNG and returns the authoritative die value", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          recordedValue: z.number().nullable(),
          recordedReason: z.string().nullable(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({
          recordedValue: null,
          recordedReason: null,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            rollVisibleDie: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ tx }) {
                const value = tx.roll("die-1");
                tx.patchPublicState({
                  recordedValue: value,
                  recordedReason: "action",
                });
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initialA = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;
    const initialB = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;

    const resultA = await bundle.dispatch({
      state: initialA,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollVisibleDie",
        params: {},
      },
    });
    const resultB = await bundle.dispatch({
      state: initialB,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollVisibleDie",
        params: {},
      },
    });

    expect(resultA.kind).toBe("accept");
    expect(resultB.kind).toBe("accept");
    if (resultA.kind !== "accept" || resultB.kind !== "accept") {
      throw new Error("Expected rollVisibleDie to be accepted.");
    }

    const diceA = (
      resultA.state.domain.table as {
        dice?: Record<string, { value: number | null }>;
      }
    ).dice;
    const diceB = (
      resultB.state.domain.table as {
        dice?: Record<string, { value: number | null }>;
      }
    ).dice;
    const firstRoll = diceA?.["die-1"]?.value;
    expect([1, 2, 3, 4, 5, 6]).toContain(firstRoll);
    expect(diceA?.["die-1"]?.value).toBe(diceB?.["die-1"]?.value);
    expect(resultA.state.runtime?.rng?.cursor).toBe(1);
    expect(resultA.state.runtime?.rng?.trace).toHaveLength(1);

    expect(resultA.state.domain.publicState).toEqual({
      recordedValue: firstRoll ?? null,
      recordedReason: "action",
    });
  });

  test("reduce completes a direct roll without pending wire work", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            rollSilently: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ tx }) {
                tx.roll("die-1");
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;

    const reduced = await bundle.reduce({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollSilently",
        params: {},
      },
    });

    if (reduced.kind !== "accept") {
      throw new Error("Expected rollSilently to be accepted.");
    }
    expect(reduced).not.toHaveProperty("effects");
    expect(reduced).not.toHaveProperty("continuations");
    const dispatched = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollSilently",
        params: {},
      },
    });
    if (dispatched.kind !== "accept") {
      throw new Error("Expected rollSilently dispatch to be accepted.");
    }
    const dispatchedDice = (
      dispatched.state.domain.table as {
        dice?: Record<string, { value: number | null }>;
      }
    ).dice;
    expect(dispatchedDice?.["die-1"]?.value).toBeGreaterThan(0);
    expect(dispatched.state).toEqual(reduced.state);
    expect(
      dispatched.trace.some(
        (entry) =>
          entry.kind === "rngConsumption" && entry.operation === "rollDie",
      ),
    ).toBe(true);
  });

  test("dispatch resolves multiple direct rolls with one table clone", async () => {
    const contract = createGame({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const game = contract.assemble({
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: contract.phase("takeTurn").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            rollTwice: contract.phase("takeTurn").interaction({
              inputs: {},
              reduce({ tx }) {
                tx.roll("die-1");
                tx.roll("die-1");
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerTestingRuntime(game);
    const initial = (
      await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      })
    ).state;

    resetCloneRuntimeTableCallCount();
    const dispatched = await bundle.dispatch({
      state: initial,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "rollTwice",
        params: {},
      },
    });

    expect(dispatched.kind).toBe("accept");
    if (dispatched.kind !== "accept") {
      throw new Error("Expected rollTwice dispatch to be accepted.");
    }
    expect(getCloneRuntimeTableCallCount()).toBe(1);
    expect(dispatched.state.runtime?.rng?.cursor).toBe(2);
    expect(
      dispatched.trace.filter(
        (entry) =>
          entry.kind === "rngConsumption" && entry.operation === "rollDie",
      ),
    ).toHaveLength(2);
  });

  // Regression: presentation3/catan surfaced this via `POST .../inputs` with
  //   { interactionId: "rollDice", params: {} }
  // returning `invalid-action-params: params.dice: expected object, received
  // undefined`. The contract for `rngInput.*` is that the engine samples the
  // value at submit time; clients must not supply rng-owned params. These
  // tests pin the contract at the reducer layer so no surface (route,
  // harness, or UI SDK) can regress it.
  describe("rngInput auto-sampling", () => {
    function defineDiceGame(sampleSchema = rngInput.d6(2).schema) {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({
            totalRolled: z.number().int(),
            lastRoll: z.array(z.number().int()),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });

      return contract.assemble({
        initial: {
          public: () => ({ totalRolled: 0, lastRoll: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            interactions: {
              rollDice: contract.phase("takeTurn").interaction({
                inputs: {
                  dice: { ...rngInput.d6(2), schema: sampleSchema },
                },
                reduce({ state, input, tx }) {
                  const values = input.params.dice.values;
                  tx.patchPublicState({
                    totalRolled:
                      state.publicState.totalRolled +
                      values.reduce((sum, v) => sum + v, 0),
                    lastRoll: [...values],
                  });
                  return;
                },
              }),
            },
          }),
        },
      });
    }

    test("validateInput accepts an rngInput interaction with empty client params", async () => {
      const bundle = createReducerTestingRuntime(defineDiceGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      // This is the exact payload shape the web SDK posts: params is `{}`
      // because `rngInput.d6(2)` is engine-sampled and the client has no
      // dice to supply. The pre-fix behaviour rejected this with
      // "invalid-action-params: params.dice: expected object, received
      // undefined".
      const result = await bundle.validateInput({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });

      expect(result).toEqual({ valid: true });
    });

    test("reduce samples rngInput.d6 values, feeds them to the authored reducer, and advances session RNG", async () => {
      const bundle = createReducerTestingRuntime(defineDiceGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      const result = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });

      if (result.kind !== "accept") {
        throw new Error(
          `Expected rollDice to be accepted, got ${JSON.stringify(result)}`,
        );
      }
      const { lastRoll, totalRolled } = result.state.domain.publicState as {
        lastRoll: number[];
        totalRolled: number;
      };
      // `rngInput.d6(2)` must yield exactly two faces, each 1..6, and the
      // authored reducer must observe them under `input.params.dice.values`.
      expect(lastRoll).toHaveLength(2);
      for (const value of lastRoll) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
      expect(totalRolled).toBe(lastRoll.reduce((sum, v) => sum + v, 0));
      // Session RNG must have advanced by exactly `count` ticks so
      // subsequent rolls / shuffles continue the deterministic stream.
      expect(result.state.runtime?.rng?.cursor).toBe(2);
      expect(result.state.runtime?.rng?.trace).toHaveLength(2);
    });

    test("dispatch is deterministic for a fixed rngSeed across sessions", async () => {
      const bundle = createReducerTestingRuntime(defineDiceGame());
      const sessionA = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 1337,
        })
      ).state;
      const sessionB = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 1337,
        })
      ).state;

      const resultA = await bundle.dispatch({
        state: sessionA,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });
      const resultB = await bundle.dispatch({
        state: sessionB,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });

      if (resultA.kind !== "accept" || resultB.kind !== "accept") {
        throw new Error("Expected both dispatches to accept.");
      }
      const rollA = (resultA.state.domain.publicState as { lastRoll: number[] })
        .lastRoll;
      const rollB = (resultB.state.domain.publicState as { lastRoll: number[] })
        .lastRoll;
      expect(rollA).toEqual(rollB);
    });

    test("consecutive reduces consume RNG monotonically and never re-sample the same cursor", async () => {
      const bundle = createReducerTestingRuntime(defineDiceGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 7,
        })
      ).state;

      const first = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });
      if (first.kind !== "accept") {
        throw new Error("Expected first rollDice to accept.");
      }
      const second = await bundle.reduce({
        state: first.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });
      if (second.kind !== "accept") {
        throw new Error("Expected second rollDice to accept.");
      }

      expect(first.state.runtime?.rng?.cursor).toBe(2);
      expect(second.state.runtime?.rng?.cursor).toBe(4);
      const firstTrace = first.state.runtime?.rng?.trace ?? [];
      const secondTrace = second.state.runtime?.rng?.trace ?? [];
      // The second call's trace must extend (not overlap) the first.
      expect(secondTrace.slice(0, firstTrace.length)).toEqual(firstTrace);
      expect(secondTrace).toHaveLength(4);
    });

    test("parses client paramsSchema once before merging authoritative sampled collectors", async () => {
      let clientParses = 0;
      let validationParams: unknown;
      const model = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({ total: z.number(), faces: z.array(z.number()) }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });
      const phase = model.phase("takeTurn");
      const game = model.assemble({
        initial: {
          public: () => ({ total: 0, faces: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: phase.define({
            kind: "player",
            initialState: () => ({}),
            interactions: {
              roll: phase.interaction({
                inputs: {
                  bonus: phase.inputs.form.number({
                    min: 0,
                    max: 10,
                    defaultValue: 0,
                  }),
                  dice: phase.inputs.rng.d6(2),
                },
                paramsSchema: z.object({
                  bonus: z.number().transform((value) => {
                    clientParses++;
                    return value + 1;
                  }),
                }),
                rules: [
                  {
                    id: "client",
                    errorCode: "INVALID",
                    validate({ input }) {
                      validationParams = input.params;
                      return input.params.bonus === 3;
                    },
                  },
                ],
                reduce({ tx, input }) {
                  tx.patchPublicState({
                    total:
                      input.params.bonus +
                      input.params.dice.values.reduce(
                        (sum, face) => sum + face,
                        0,
                      ),
                    faces: input.params.dice.values,
                  });
                },
              }),
            },
          }),
        },
        view: model.view(() => ({})),
      });
      const bundle = createReducerTestingRuntime(game);
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;
      const accepted = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "roll",
          params: { bonus: 2, dice: { values: [99, 99] } },
        },
      });
      expect(accepted.kind).toBe("accept");
      expect(clientParses).toBe(1);
      expect(validationParams).toEqual({ bonus: 3 });
      if (accepted.kind === "accept") {
        const result = accepted.state.domain.publicState;
        expect(result.faces).toHaveLength(2);
        expect(result.faces.every((face) => face >= 1 && face <= 6)).toBe(true);
        expect(result.total).toBe(
          3 + result.faces.reduce((sum, face) => sum + face, 0),
        );
        expect(accepted.state.runtime.rng.cursor).toBe(2);
      }
    });

    test("parses sampled RNG values once and rolls back a rejected sample", async () => {
      let parses = 0;
      const schema = rngInput.d6(2).schema.transform((value) => {
        parses++;
        return { values: value.values.map((face) => face + 10) };
      });
      const game = defineDiceGame(schema);
      const bundle = createReducerTestingRuntime(game);
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;
      const accepted = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: { dice: { values: [99, 99] } },
        },
      });
      expect(accepted.kind).toBe("accept");
      expect(parses).toBe(1);
      if (accepted.kind === "accept")
        expect(
          accepted.state.domain.publicState.lastRoll.every(
            (face) => face >= 11 && face <= 16,
          ),
        ).toBe(true);
      const rejecting = createReducerTestingRuntime(
        defineDiceGame(
          rngInput.d6(2).schema.refine(() => false, "sample rejected"),
        ),
      );
      const before = JSON.stringify(initial);
      expect(
        await rejecting.reduce({
          state: initial,
          input: {
            kind: "interaction",
            playerId: "player-1",
            interactionId: "rollDice",
            params: {},
          },
        }),
      ).toMatchObject({ kind: "reject", errorCode: "invalid-action-params" });
      expect(JSON.stringify(initial)).toBe(before);
    });

    test("client-supplied values for an rngInput are ignored (server is authoritative)", async () => {
      const bundle = createReducerTestingRuntime(defineDiceGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      // A hostile or naive client tries to force the outcome. The engine
      // must overwrite this with the deterministic sample.
      const forced = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: { dice: { values: [6, 6] } },
        },
      });
      const authentic = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rollDice",
          params: {},
        },
      });
      if (forced.kind !== "accept" || authentic.kind !== "accept") {
        throw new Error("Expected both rollDice calls to accept.");
      }
      const forcedRoll = (
        forced.state.domain.publicState as { lastRoll: number[] }
      ).lastRoll;
      const authenticRoll = (
        authentic.state.domain.publicState as { lastRoll: number[] }
      ).lastRoll;
      expect(forcedRoll).toEqual(authenticRoll);
    });
  });

  describe("random.integer mutation helper", () => {
    function defineIntegerGame() {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({
            results: z.array(z.number().int()),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });

      return contract.assemble({
        initial: {
          public: () => ({ results: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            enter({ state, random, tx }) {
              const result = random.integer({
                minInclusive: 1,
                maxInclusive: 6,
              });
              tx.patchPublicState({
                results: [...state.publicState.results, result],
              });
              return;
            },
            interactions: {
              drawAndReenter: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ state, tx, random }) {
                  const result = random.integer({
                    minInclusive: 10,
                    maxInclusive: 12,
                  });
                  tx.patchPublicState({
                    results: [...state.publicState.results, result],
                  });
                  return tx.transition("takeTurn");
                },
              }),
            },
          }),
        },
      });
    }

    test("records initialization, dispatch, and lifecycle draws with structured trace identity", async () => {
      const diagnosticEvents: Array<{
        type: string;
        trace?: readonly unknown[];
      }> = [];
      const bundle = createReducerTestingRuntime(defineIntegerGame(), {
        diagnostics: {
          event(event) {
            diagnosticEvents.push(event);
          },
        },
      });
      const initialized = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      expect(initialized.runtime.rng.draws).toEqual([
        {
          index: 0,
          cursorBefore: 0,
          cursorAfter: 1,
          operation: {
            kind: "integer",
            parameters: { minInclusive: 1, maxInclusive: 6 },
          },
        },
      ]);

      const dispatched = await bundle.dispatch({
        state: initialized,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "drawAndReenter",
          params: {},
        },
      });
      if (dispatched.kind !== "accept") {
        throw new Error("Expected drawAndReenter to accept.");
      }

      expect(dispatched.state.runtime.rng.draws).toEqual([
        initialized.runtime.rng.draws[0],
        {
          index: 1,
          cursorBefore: 1,
          cursorAfter: 2,
          operation: {
            kind: "integer",
            parameters: { minInclusive: 10, maxInclusive: 12 },
          },
        },
        {
          index: 2,
          cursorBefore: 2,
          cursorAfter: 3,
          operation: {
            kind: "integer",
            parameters: { minInclusive: 1, maxInclusive: 6 },
          },
        },
      ]);
      expect(
        dispatched.trace.filter((entry) => entry.kind === "rngConsumption"),
      ).toEqual([
        expect.objectContaining({
          version: 2,
          operation: "random.integer",
          drawIndex: 1,
        }),
        expect.objectContaining({
          version: 2,
          operation: "random.integer",
          drawIndex: 2,
        }),
      ]);

      const acceptedDiagnostic = diagnosticEvents.find(
        (event) => event.type === "submitAccepted",
      );
      expect(acceptedDiagnostic?.trace).toEqual([
        expect.objectContaining({ kind: "acceptedClientInput" }),
        expect.objectContaining({
          kind: "rngConsumption",
          version: 2,
          drawIndex: 1,
        }),
        expect.objectContaining({
          kind: "phaseEntered",
          from: "takeTurn",
          to: "takeTurn",
        }),
        expect.objectContaining({
          kind: "rngConsumption",
          version: 2,
          drawIndex: 2,
        }),
      ]);
      const diagnosticJson = JSON.stringify(acceptedDiagnostic);
      expect(diagnosticJson).not.toContain("traceEntry");
      expect(diagnosticJson).not.toContain("value=");
    });

    test("rejects invalid inclusive integer ranges before consuming RNG", async () => {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({}),
          private: z.object({}),
          hidden: z.object({}),
        },
      });
      const game = contract.assemble({
        initial: {
          public: () => ({}),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            interactions: {
              invalid: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ random }) {
                  random.integer({ minInclusive: 7, maxInclusive: 6 });
                  return;
                },
              }),
            },
          }),
        },
      });
      const bundle = createReducerTestingRuntime(game);
      const initialized = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      await expect(
        bundle.dispatch({
          state: initialized,
          input: {
            kind: "interaction",
            playerId: "player-1",
            interactionId: "invalid",
            params: {},
          },
        }),
      ).rejects.toThrow(
        "random.integer minInclusive must be less than or equal to maxInclusive",
      );
      expect(initialized.runtime.rng.cursor).toBe(0);
      expect(initialized.runtime.rng.draws).toEqual([]);
    });
  });

  describe("random.subset mutation helper", () => {
    function defineSubsetGame() {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({
            drawn: z.array(z.string()),
          }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });

      return contract.assemble({
        initial: {
          public: () => ({ drawn: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            interactions: {
              drawTwo: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ tx, random }) {
                  const drawn = random.subset({
                    from: ["alpha", "bravo", "charlie", "delta"] as const,
                    count: 2,
                  });
                  tx.patchPublicState({ drawn: [...drawn] });
                },
              }),
              rejectAfterDraw: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ tx, random }) {
                  random.subset({
                    from: ["alpha", "bravo", "charlie", "delta"] as const,
                    count: 2,
                  });
                  tx.addResources({
                    playerId: "player-1",
                    amounts: { coins: 9 },
                  });
                  tx.patchPublicState({ drawn: ["discarded"] });
                  tx.emit(
                    gameEvent.systemAction({
                      procedureId: "discarded",
                      title: "Discarded",
                    }),
                  );
                  tx.roll("die-1");
                  return tx.reject("NOPE", "Rejected after sampling.");
                },
              }),
              drawTooMany: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce({ random }) {
                  random.subset({
                    from: ["alpha"] as const,
                    count: 2,
                  });
                  return;
                },
              }),
            },
          }),
        },
      });
    }

    test("draws deterministic typed subsets and advances the runtime cursor", async () => {
      const bundle = createReducerTestingRuntime(defineSubsetGame());
      const sessionA = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;
      const sessionB = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 42,
        })
      ).state;

      const resultA = await bundle.reduce({
        state: sessionA,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "drawTwo",
          params: {},
        },
      });
      const resultB = await bundle.reduce({
        state: sessionB,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "drawTwo",
          params: {},
        },
      });

      if (resultA.kind !== "accept" || resultB.kind !== "accept") {
        throw new Error("Expected both drawTwo calls to accept.");
      }
      expect(resultA.state.domain.publicState).toEqual(
        resultB.state.domain.publicState,
      );
      expect(
        (resultA.state.domain.publicState as { drawn: string[] }).drawn,
      ).toHaveLength(2);
      expect(resultA.state.runtime?.rng?.cursor).toBe(3);
      expect(resultA.state.runtime?.rng?.trace).toHaveLength(3);
    });

    test("rejects all draft mutations, queued output, and RNG consumption together", async () => {
      const bundle = createReducerTestingRuntime(defineSubsetGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 7,
        })
      ).state;

      const initialBefore = structuredClone(initial);
      const controlSession = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 7,
        })
      ).state;
      const rejected = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "rejectAfterDraw",
          params: {},
        },
      });
      expect(rejected.kind).toBe("reject");
      expect(initial.runtime?.rng?.cursor).toBe(0);
      expect(initial).toEqual(initialBefore);
      expect(rejected).not.toHaveProperty("events");
      expect(rejected).not.toHaveProperty("instructions");

      const accepted = await bundle.reduce({
        state: initial,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "drawTwo",
          params: {},
        },
      });
      if (accepted.kind !== "accept") {
        throw new Error("Expected drawTwo to accept after rejected sample.");
      }
      expect(accepted.state.runtime?.rng?.cursor).toBe(3);
      const control = await bundle.reduce({
        state: controlSession,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "drawTwo",
          params: {},
        },
      });
      expect(accepted).toEqual(control);
    });

    test("throws a clear SDK error when count exceeds the source length", async () => {
      const bundle = createReducerTestingRuntime(defineSubsetGame());
      const initial = (
        await bundle.initialize({
          table: createTable(),
          playerIds: ["player-1", "player-2"],
          rngSeed: 7,
        })
      ).state;

      await expect(
        bundle.reduce({
          state: initial,
          input: {
            kind: "interaction",
            playerId: "player-1",
            interactionId: "drawTooMany",
            params: {},
          },
        }),
      ).rejects.toThrow("random.subset count 2 exceeds source length 1");
    });
  });
});

describe("implicit transaction acceptance", () => {
  test.each(["enter", "reduce"] as const)(
    "%s preserves events and immediate seeded mutations",
    async (mode) => {
      const contract = createGame({
        manifest: createManifestContract(),
        phases: { takeTurn: z.object({}) },
        state: {
          public: z.object({ complete: z.boolean() }),
          private: z.object({}),
          hidden: z.object({}),
        },
      });
      const queued = gameEvent.systemAction({
        procedureId: "queued",
        title: "Queued",
      });
      const completed = gameEvent.systemAction({
        procedureId: "completed",
        title: "Completed",
      });
      const queue = (
        tx: import("./transaction").ReducerTransaction<
          import("./model").GameStateOf<typeof contract.contract>
        >,
      ) => {
        tx.emit(queued);
        tx.roll("die-1");
        tx.roll("die-1");
        tx.patchPublicState({ complete: true });
        tx.emit(completed);
      };
      const game = contract.assemble({
        initial: {
          public: () => ({ complete: false }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: contract.phase("takeTurn").define({
            kind: "player",
            initialState: () => ({}),
            actor: () => "player-1",
            enter(args) {
              for (const key of ["accept", "edit", "reject", "endGame", "fx"])
                expect(args).not.toHaveProperty(key);
              expect(args.runtime).toHaveProperty("pending");
              if (mode === "enter") queue(args.tx);
            },
            interactions: {
              complete: contract.phase("takeTurn").interaction({
                inputs: {},
                reduce(args) {
                  for (const key of [
                    "accept",
                    "edit",
                    "reject",
                    "endGame",
                    "fx",
                  ])
                    expect(args).not.toHaveProperty(key);
                  queue(args.tx);
                },
              }),
            },
          }),
        },
        view: contract.view((args) => {
          for (const key of ["accept", "edit", "reject", "endGame", "fx", "tx"])
            expect(args).not.toHaveProperty(key);
          expect(args.runtime).toHaveProperty("pending");
          return {};
        }),
      });
      const bundle = createReducerBundle(game);
      const initialized = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });
      const result =
        mode === "enter"
          ? initialized
          : await bundle.dispatch({
              state: initialized.state,
              input: {
                kind: "interaction",
                playerId: "player-1",
                interactionId: "complete",
                params: {},
              },
            });
      if ("kind" in result && result.kind === "reject")
        throw new Error("Expected acceptance");
      expect(result.events).toEqual([queued, completed]);
      expect(result.state.domain.publicState.complete).toBe(true);
      expect(result.state.runtime.rng.cursor).toBe(2);
      bundle.project({ state: result.state, playerIds: ["player-1"] });
    },
  );
});
