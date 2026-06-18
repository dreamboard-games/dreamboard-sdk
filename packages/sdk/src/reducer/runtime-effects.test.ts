import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  createReducerBundle,
  defineDerived,
  defineEffect,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  defineStepPhase,
  defineView,
  gameEvent,
  pipe,
  rngInput,
} from "../reducer";
import {
  type InputCollector,
  type RuntimeTableRecord,
} from "../reducer/advanced";
import { asPlayerId, perPlayer } from "../reducer/per-player";
import {
  getCloneRuntimeTableCallCount,
  resetCloneRuntimeTableCallCount,
} from "./table/clone";

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
    boards: {
      byId: {},
      hex: {},
      network: {},
      square: {},
      track: {},
    },
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
  const phaseNames = ["takeTurn"] as const;
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
      resources: () => perPlayer([], () => ({})),
    },
    setupOptionsById: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

describe("runtime-owned reducer effects", () => {
  test("reduce and dispatch materialize reducer-authored game events", async () => {
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
      initial: {
        public: () => ({ count: 0 }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          interactions: {
            advance: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept, ops }) {
                return accept(
                  pipe(
                    state,
                    ops.patchPublicState({
                      count: state.publicState.count + 1,
                    }),
                  ),
                  {
                    events: [
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
                    ],
                  },
                );
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
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

  test("bundle projectSeatsDynamic returns a plain view synchronously", async () => {
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
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
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
        }),
      },
      views: {
        player: defineView<typeof contract>()({
          project({ state }) {
            return {
              counter: state.publicState.counter,
              secret: state.hiddenState.secret,
            };
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const session = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const projection = bundle.projectSeatsDynamic({
      state: session,
      playerIds: ["player-1"],
    });
    const view = projection.seats["player-1"]?.view;

    expect(view).toEqual({
      counter: 3,
      secret: "eel",
    });
    expect(typeof (view as { then?: unknown }).then).toBe("undefined");
  });

  test("projectSeatViewDynamic returns a single view without descriptor work", async () => {
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          interactions: {
            inspect: defineInteraction<typeof contract>()({
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
              reduce: ({ state, accept }) => accept(state),
            }),
          },
        }),
      },
      views: {
        player: defineView<typeof contract>()({
          project({ state, playerId }) {
            return {
              playerId,
              counter: state.publicState.counter,
            };
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const session = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const view = bundle.projectSeatViewDynamic({
      state: session,
      playerId: "player-1",
    });

    expect(view).toEqual({ playerId: "player-1", counter: 3 });
    expect(availableCalls).toBe(0);
  });

  test("projectSeatsDynamic shares derived values across seats and descriptors", async () => {
    const contract = defineGameContract({
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
    const expensiveTotal = defineDerived<typeof contract>()({
      name: "expensiveTotal",
      compute: ({ state }) => {
        computeCount++;
        return state.publicState.counter;
      },
    });

    const game = defineGame({
      contract,
      initial: {
        public: () => ({
          counter: 3,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          interactions: {
            inspect: defineInteraction<typeof contract>()({
              inputs: {},
              cost: ({ derived }) => ({ gold: derived(expensiveTotal) }),
              reduce: ({ state, accept }) => accept(state),
            }),
          },
        }),
      },
      views: {
        player: defineView<typeof contract>()({
          project({ derived }) {
            return { total: derived(expensiveTotal) };
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const session = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    bundle.projectSeatsDynamic({
      state: session,
      playerIds: ["player-1", "player-2"],
    });

    expect(computeCount).toBe(1);
  });

  test("projectSeatsDynamic skips target eligibility for unavailable descriptors", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
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

    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: defineStepPhase<typeof contract>()({
          kind: "player",
          steps: ["main", "blocked"],
          state: phaseState,
          interactions: {
            blockedTarget: {
              steps: ["blocked"],
              interaction: defineInteraction<
                typeof contract,
                typeof phaseState
              >()({
                inputs: {
                  edgeId: targetInput,
                },
                reduce: ({ state, accept }) => accept(state),
              }),
            },
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const session = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const projection = bundle.projectSeatsDynamic({
      state: session,
      playerIds: ["player-1"],
    });
    const descriptor = (
      projection.seats["player-1"]?.availableInteractionRefs ?? []
    )
      .map((ref) => projection.interactionsByRef[ref])
      .find((interaction) => interaction.interactionId === "blockedTarget");
    const noDependencies: string[] = [];

    expect(eligibleTargetCalls).toBe(0);
    expect(descriptor?.availability).toMatchObject({
      status: "blocked",
      reason: "Interaction not allowed in current step",
    });
    expect(descriptor?.inputs).toEqual([
      {
        key: "edgeId",
        kind: "board-edge",
        domain: {
          type: "boardTarget",
          projection: "lazy",
          targetKind: "edge",
          boardId: "board",
          dependencies: {
            mode: "lazy",
            dependsOn: noDependencies,
            resolver: { inputKey: "edgeId" },
          },
        },
      },
    ]);
  });

  test("bundle dispatch rejects unsupported actions with the new discriminator", async () => {
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
      initial: {
        public: () => ({
          pingCount: 0,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 23,
    });

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
    const contract = defineGameContract({
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

    const game = defineGame({
      contract,
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
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          interactions: {
            locked: defineInteraction<typeof contract>()({
              inputs: {},
              rules: [
                {
                  id: "locked",
                  errorCode: "action-unavailable",
                  message: "Interaction 'locked' is currently unavailable.",
                  available: () => false,
                },
              ],
              reduce({ state, accept }) {
                return accept({
                  ...state,
                  publicState: {
                    ...state.publicState,
                    lockedRan: true,
                  },
                });
              },
            }),
            invalid: defineInteraction<typeof contract>()({
              inputs: {},
              rules: [
                {
                  id: "invalid-move",
                  errorCode: "invalid-move",
                  message: "Nope.",
                  validate: () => false,
                },
              ],
              reduce({ state, accept }) {
                return accept({
                  ...state,
                  publicState: {
                    ...state.publicState,
                    invalidRan: true,
                  },
                });
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

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

  test("fx.effect with a rollDie effect consumes seeded RNG, updates the die value, and routes a typed continuation", async () => {
    const contract = defineGameContract({
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

    const rollDieEffect = defineEffect<typeof contract>()({
      type: "rollDie",
      id: "rollDieEffect",
      context: z.object({
        reason: z.string(),
      }),
      reduce({ state, input, accept }) {
        return accept({
          ...state,
          publicState: {
            recordedValue: input.response.value,
            recordedReason: input.data.reason,
          },
        });
      },
    });

    const game = defineGame({
      contract,
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
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          effects: {
            rollDieEffect,
          },
          interactions: {
            rollVisibleDie: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept, fx }) {
                return accept(state, {
                  instructions: [
                    fx.effect(rollDieEffect, {
                      dieId: "die-1",
                      context: { reason: "action" },
                    }),
                  ],
                });
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initialA = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });
    const initialB = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

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

  test("fx.effect with a fire-and-forget rollDie effect (no reduce) emits an effect without a `resume` key", async () => {
    // This is the exact shape `presentation3/catan` hits: an author registers
    // a `rollDie` effect purely to schedule the runtime-side die animation and
    // omits `reduce` because the authoritative value is supplied via the
    // player action params instead of a reducer continuation. Previously the
    // SDK attached `resume: undefined` to the wire effect, which the runtime
    // bridge converted to JSON `null`, breaking Kotlin
    // deserialization of `Effect.RollDie` (whose `resume` was non-nullable).
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const fireAndForgetRollEffect = defineEffect<typeof contract>()({
      type: "rollDie",
      id: "fireAndForgetRoll",
    });

    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          effects: {
            fireAndForgetRollEffect,
          },
          interactions: {
            rollSilently: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept, fx }) {
                return accept(state, {
                  instructions: [
                    fx.effect(fireAndForgetRollEffect, { dieId: "die-1" }),
                  ],
                });
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

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
    expect(reduced.effects).toHaveLength(1);
    const effect = reduced.effects[0] as Record<string, unknown>;
    expect(effect.type).toBe("rollDie");
    expect(effect.dieId).toBe("die-1");
    expect(effect.effectId).toBeDefined();
    // Wire contract: the effect payload must NEVER carry a `resume` field.
    // Continuations live in the sibling `continuations` map, keyed by
    // effectId. A fire-and-forget effect simply has no entry in that map.
    expect("resume" in effect).toBe(false);
    expect("__continuation" in effect).toBe(false);
    const serialized = JSON.parse(JSON.stringify(effect)) as Record<
      string,
      unknown
    >;
    expect("resume" in serialized).toBe(false);
    expect("__continuation" in serialized).toBe(false);
    // No continuation should have been recorded for the fire-and-forget
    // variant.
    const effectId = effect.effectId as string;
    expect(reduced.continuations[effectId]).toBeUndefined();

    // End-to-end dispatch should still update the die value even without a
    // continuation wired up, confirming the runtime treats a missing
    // `resume` as fire-and-forget.
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
    expect(
      dispatched.trace.some(
        (entry) =>
          entry.kind === "appliedEffect" &&
          entry.effect.type === "rollDie" &&
          !("resume" in entry.effect),
      ),
    ).toBe(true);
  });

  test("dispatch resolves multiple engine instructions with one table clone", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
    });

    const fireAndForgetRollEffect = defineEffect<typeof contract>()({
      type: "rollDie",
      id: "fireAndForgetRoll",
    });

    const game = defineGame({
      contract,
      initial: {
        public: () => ({}),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          effects: {
            fireAndForgetRollEffect,
          },
          interactions: {
            rollTwice: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept, fx }) {
                return accept(state, {
                  instructions: [
                    fx.effect(fireAndForgetRollEffect, { dieId: "die-1" }),
                    fx.effect(fireAndForgetRollEffect, { dieId: "die-1" }),
                  ],
                });
              },
            }),
          },
        }),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
      rngSeed: 42,
    });

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
          entry.kind === "appliedEffect" && entry.effect.type === "rollDie",
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
    function defineDiceGame() {
      const contract = defineGameContract({
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

      return defineGame({
        contract,
        initial: {
          public: () => ({ totalRolled: 0, lastRoll: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: definePhase<typeof contract>()({
            kind: "player",
            state: z.object({}),
            initialState: () => ({}),
            interactions: {
              rollDice: defineInteraction<typeof contract>()({
                inputs: {
                  dice: rngInput.d6(2),
                },
                reduce({ state, input, accept }) {
                  const values = input.params.dice.values;
                  return accept({
                    ...state,
                    publicState: {
                      totalRolled:
                        state.publicState.totalRolled +
                        values.reduce((sum, v) => sum + v, 0),
                      lastRoll: [...values],
                    },
                  });
                },
              }),
            },
          }),
        },
      });
    }

    test("validateInput accepts an rngInput interaction with empty client params", async () => {
      const bundle = createReducerBundle(defineDiceGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });

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
      const bundle = createReducerBundle(defineDiceGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });

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
      const bundle = createReducerBundle(defineDiceGame());
      const sessionA = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 1337,
      });
      const sessionB = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 1337,
      });

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
      const bundle = createReducerBundle(defineDiceGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 7,
      });

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

    test("client-supplied values for an rngInput are ignored (server is authoritative)", async () => {
      const bundle = createReducerBundle(defineDiceGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });

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

  describe("random.subset mutation helper", () => {
    function defineSubsetGame() {
      const contract = defineGameContract({
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

      return defineGame({
        contract,
        initial: {
          public: () => ({ drawn: [] }),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "takeTurn",
        phases: {
          takeTurn: definePhase<typeof contract>()({
            kind: "player",
            state: z.object({}),
            initialState: () => ({}),
            interactions: {
              drawTwo: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ state, accept, random }) {
                  const drawn = random.subset({
                    from: ["alpha", "bravo", "charlie", "delta"] as const,
                    count: 2,
                  });
                  return accept({
                    ...state,
                    publicState: { drawn: [...drawn] },
                  });
                },
              }),
              rejectAfterDraw: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ reject, random }) {
                  random.subset({
                    from: ["alpha", "bravo", "charlie", "delta"] as const,
                    count: 2,
                  });
                  return reject("NOPE", "Rejected after sampling.");
                },
              }),
              drawTooMany: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ state, accept, random }) {
                  random.subset({
                    from: ["alpha"] as const,
                    count: 2,
                  });
                  return accept(state);
                },
              }),
            },
          }),
        },
      });
    }

    test("draws deterministic typed subsets and advances the runtime cursor", async () => {
      const bundle = createReducerBundle(defineSubsetGame());
      const sessionA = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });
      const sessionB = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });

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

    test("does not persist random.subset cursor advancement when reducer rejects", async () => {
      const bundle = createReducerBundle(defineSubsetGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 7,
      });

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
    });

    test("throws a clear SDK error when count exceeds the source length", async () => {
      const bundle = createReducerBundle(defineSubsetGame());
      const initial = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 7,
      });

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
