import { defineGameDefinition as defineGame } from "./authoring/game";
import { createReducerTestingBundle } from "./bundle/ingress-bundle";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  choiceTarget,
  defineGameContract,
  defineInteraction,
  formInput,
  definePhase,
} from "../reducer/internal";
import { RuntimeTableRecord } from "../reducer/advanced";
import { asPlayerId } from "../reducer/per-player";
function getAvailableInteractions(
  bundle: ReturnType<typeof createReducerTestingBundle>,
  state: Parameters<typeof bundle.project>[0]["state"],
  playerId: string,
) {
  const projection = bundle.project({
    state,
    playerIds: [playerId],
  });
  return (projection.seats[playerId]?.availableInteractionRefs ?? [])
    .map((ref) => projection.interactionsByRef[ref])
    .filter(Boolean);
}
function createTable(playerIds = ["player-1", "player-2"]): RuntimeTableRecord {
  const ids = playerIds.map((id) => asPlayerId(id));
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
function createManifestContract() {
  const phaseNames = ["takeTurn"] as const;
  const playerIds = ["player-1", "player-2"] as const;
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
      dieTypeIds: [] as const,
      dieIds: [] as const,
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
      dieId: z.string(),
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
      resources: () => Object.fromEntries([].map((id) => [id, {}])),
    },
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}
describe("recipient-based response authorization", () => {
  function makeBundle() {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          askPlayer: z.enum(["player-1", "player-2"]),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const yesNoTarget = choiceTarget
      .options([
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ] as const)
      .build();
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ askPlayer: "player-2" as const }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          enter({ accept, tx }) {
            return accept(tx.setActivePlayers(["player-1"]));
          },
          interactions: {
            respond: defineInteraction<typeof contract>()({
              inputs: {
                answer: formInput.choice({
                  defaultValue: () => undefined,
                  choices: (context) =>
                    yesNoTarget.options(context).map((option) => ({
                      value: option.id,
                      label: option.label ?? option.id,
                    })),
                }),
              },
              actor: ({ state }) => state.publicState.askPlayer,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    return createReducerTestingBundle(game);
  }
  test("descriptor: recipient sees the response as available even when they are not active", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const offerer = getAvailableInteractions(bundle, initial, "player-1");
    expect(
      bundle.project({ state: initial, playerIds: ["player-1", "player-2"] })
        .schedulerFlow,
    ).toEqual({
      version: 1,
      activePlayerIds: ["player-2"],
      pendingPlayerIds: ["player-2"],
      continuationDependencies: [
        { waiterPlayerId: "player-1", blockerPlayerIds: ["player-2"] },
      ],
    });
    expect(offerer).toEqual([]);
    const recipient = getAvailableInteractions(bundle, initial, "player-2");
    expect(recipient).toHaveLength(1);
    expect(recipient[0].interactionId).toBe("respond");
    expect(recipient[0].kind).toBe("action");
    expect(recipient[0].availability).toEqual({ status: "available" });
    expect(recipient[0].inputs).toEqual([
      {
        key: "answer",
        kind: "form",
        domain: {
          type: "choice",
          choices: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
      },
    ]);
    expect(recipient[0]).not.toHaveProperty("context");
  });
  test("submit: the recipient (non-active) can submit the response", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const accepted = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "respond",
        playerId: "player-2",
        params: { answer: "yes" },
      },
    });
    expect(accepted.valid).toBe(true);
  });
  test("submit: a non-recipient (even the active player) gets NOT_YOUR_TURN", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const rejected = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "respond",
        playerId: "player-1",
        params: { answer: "yes" },
      },
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errorCode).toBe("NOT_YOUR_TURN");
  });
});
describe("phase actor, step, and cost resolution", () => {
  function makeBundle() {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          actor: z.enum(["player-1", "player-2"]),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const phaseState = z.object({});
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ actor: "player-2" as const }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: phaseState,
          actor: ({ state }) => state.publicState.actor,
          interactions: {
            spendGold: defineInteraction<typeof contract>()({
              inputs: {},
              rules: [
                {
                  id: "affordable",
                  errorCode: "INSUFFICIENT_RESOURCES",
                  available: ({ q, input }) =>
                    q.player.canAfford(input.playerId, { gold: 2 }),
                  validate: ({ q, input }) =>
                    q.player.canAfford(input.playerId, { gold: 2 }),
                },
              ],
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
            blockedOnly: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept }) {
                return accept(state);
              },
              rules: [
                {
                  id: "blocked",
                  errorCode: "action-unavailable",
                  message: "Interaction is blocked by its rule.",
                  available: () => false,
                },
              ],
            }),
            actorOnlyOverride: defineInteraction<typeof contract>()({
              inputs: {},
              actor: () => "player-1",
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    return createReducerTestingBundle(game);
  }
  function createResourceTable(): RuntimeTableRecord {
    const ids = [asPlayerId("player-1"), asPlayerId("player-2")];
    return {
      ...createTable(["player-1", "player-2"]),
      resources: Object.fromEntries(
        ids.map((id) => [id, { gold: id === "player-2" ? 1 : 9 }]),
      ),
    };
  }
  test("phase actor defaults drive descriptors and submit authorization", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createResourceTable(),
      playerIds: ["player-1", "player-2"],
    });
    const actorDescriptors = getAvailableInteractions(
      bundle,
      state,
      "player-2",
    );
    expect(
      actorDescriptors.find((d) => d.interactionId === "spendGold"),
    ).toMatchObject({
      availability: {
        status: "blocked",
        reason: "INSUFFICIENT_RESOURCES",
      },
    });
    const nonActorDescriptors = getAvailableInteractions(
      bundle,
      state,
      "player-1",
    );
    expect(
      nonActorDescriptors.find((d) => d.interactionId === "spendGold"),
    ).toBeUndefined();
    const notActor = await bundle.validateInput({
      state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "spendGold",
        params: {},
      },
    });
    expect(notActor).toMatchObject({
      valid: false,
      errorCode: "NOT_YOUR_TURN",
    });
  });
  test("interaction actor overrides its phase actor", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createResourceTable(),
      playerIds: ["player-1", "player-2"],
    });
    const actorDescriptors = getAvailableInteractions(
      bundle,
      state,
      "player-1",
    );
    expect(
      actorDescriptors.find((d) => d.interactionId === "actorOnlyOverride"),
    ).toMatchObject({
      kind: "action",
      availability: { status: "available" },
    });
    const nonActorDescriptors = getAvailableInteractions(
      bundle,
      state,
      "player-2",
    );
    expect(
      nonActorDescriptors.find((d) => d.interactionId === "actorOnlyOverride"),
    ).toBeUndefined();
    const rejected = await bundle.validateInput({
      state,
      input: {
        kind: "interaction",
        playerId: "player-2",
        interactionId: "actorOnlyOverride",
        params: {},
      },
    });
    expect(rejected).toMatchObject({
      valid: false,
      errorCode: "NOT_YOUR_TURN",
    });
  });
  test("cost and step decisions are enforced at submit validation", async () => {
    const bundle = makeBundle();
    const state = await bundle.initialize({
      table: createResourceTable(),
      playerIds: ["player-1", "player-2"],
    });
    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-2",
          interactionId: "spendGold",
          params: {},
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INSUFFICIENT_RESOURCES",
    });
    await expect(
      bundle.validateInput({
        state,
        input: {
          kind: "interaction",
          playerId: "player-2",
          interactionId: "blockedOnly",
          params: {},
        },
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "action-unavailable",
    });
  });
});
describe("default action-kind authorization", () => {
  function makeBundle() {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
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
          enter({ accept, tx }) {
            return accept(tx.setActivePlayers(["player-1"]));
          },
          interactions: {
            act: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
            rollOnly: defineInteraction<typeof contract>()({
              inputs: {},
              reduce({ state, accept }) {
                return accept(state);
              },
              rules: [
                {
                  id: "blocked",
                  errorCode: "action-unavailable",
                  message: "Interaction is blocked by its rule.",
                  available: () => false,
                },
              ],
            }),
          },
        }),
      },
      view: () => ({}),
    });
    return createReducerTestingBundle(game);
  }
  test("descriptor: active player sees available status; non-active sees notYourTurn availability", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const active = getAvailableInteractions(bundle, initial, "player-1");
    expect(active.find((d) => d.interactionId === "act")).toMatchObject({
      availability: { status: "available" },
    });
    expect(
      bundle.project({ state: initial, playerIds: ["player-1"] }).schedulerFlow,
    ).toEqual({
      version: 1,
      activePlayerIds: ["player-1"],
      pendingPlayerIds: [],
      continuationDependencies: [],
    });
    const inactive = getAvailableInteractions(bundle, initial, "player-2");
    expect(inactive.find((d) => d.interactionId === "act")).toBeUndefined();
  });
  test("descriptor and submit: authorization reason wins over step mismatch for non-active player", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const active = getAvailableInteractions(bundle, initial, "player-1");
    expect(active.find((d) => d.interactionId === "rollOnly")).toMatchObject({
      availability: {
        status: "blocked",
        reason: "Interaction is blocked by its rule.",
      },
    });
    const inactive = getAvailableInteractions(bundle, initial, "player-2");
    expect(
      inactive.find((d) => d.interactionId === "rollOnly"),
    ).toBeUndefined();
    const rejected = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "rollOnly",
        playerId: "player-2",
        params: {},
      },
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errorCode).toBe("NOT_YOUR_TURN");
  });
  test("submit: non-active player is rejected with NOT_YOUR_TURN", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const rejected = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "act",
        playerId: "player-2",
        params: {},
      },
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errorCode).toBe("NOT_YOUR_TURN");
  });
  test("submit: active player is accepted", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const accepted = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "act",
        playerId: "player-1",
        params: {},
      },
    });
    expect(accepted.valid).toBe(true);
  });
});
describe("closed response (`actor` resolves to empty set)", () => {
  function makeBundle() {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          pendingRespondents: z.array(z.enum(["player-1", "player-2"])),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ pendingRespondents: [] }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          enter({ accept, tx }) {
            return accept(tx.setActivePlayers(["player-1"]));
          },
          interactions: {
            respond: defineInteraction<typeof contract>()({
              inputs: {},
              actor: ({ state }) => state.publicState.pendingRespondents,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    return createReducerTestingBundle(game);
  }
  test("descriptor: the closed response is invisible to every seat (no leak to the active player)", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    for (const playerId of ["player-1", "player-2"] as const) {
      const descriptors = getAvailableInteractions(bundle, initial, playerId);
      expect(descriptors).toEqual([]);
    }
  });
  test("submit: every seat is rejected with NOT_YOUR_TURN", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    for (const playerId of ["player-1", "player-2"] as const) {
      const rejected = await bundle.validateInput({
        state: initial,
        input: {
          kind: "interaction",
          interactionId: "respond",
          playerId,
          params: {},
        },
      });
      expect(rejected.valid).toBe(false);
      expect(rejected.errorCode).toBe("NOT_YOUR_TURN");
    }
  });
});
describe("action-kind interactions with a `actor` selector", () => {
  test("descriptor: only recipients see an action-kind interaction with `actor`; non-recipients (incl. active player) do not", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          mustDiscard: z.array(z.enum(["player-1", "player-2"])),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ mustDiscard: ["player-2"] as const }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "takeTurn",
      phases: {
        takeTurn: definePhase<typeof contract>()({
          kind: "player",
          state: z.object({}),
          initialState: () => ({}),
          enter({ accept, tx }) {
            return accept(tx.setActivePlayers(["player-1"]));
          },
          interactions: {
            discard: defineInteraction<typeof contract>()({
              inputs: {},
              actor: ({ state }) => state.publicState.mustDiscard,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const activeNonAddressee = getAvailableInteractions(
      bundle,
      initial,
      "player-1",
    );
    expect(activeNonAddressee).toEqual([]);
    const recipient = getAvailableInteractions(bundle, initial, "player-2");
    expect(recipient).toHaveLength(1);
    expect(recipient[0].interactionId).toBe("discard");
    expect(recipient[0].kind).toBe("action");
    expect(recipient[0].availability).toEqual({ status: "available" });
  });
});
describe("author `available` predicate composes with authorization", () => {
  test("recipient's availability still respects the author's `available` predicate", async () => {
    const contract = defineGameContract({
      manifest: createManifestContract(),
      phases: { takeTurn: z.object({}) },
      state: {
        public: z.object({
          askPlayer: z.enum(["player-1", "player-2"]),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const game = defineGame({
      contract,
      initial: {
        public: () => ({ askPlayer: "player-2" as const }),
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
            gatedRespond: defineInteraction<typeof contract>()({
              inputs: {},
              actor: ({ state }) => state.publicState.askPlayer,
              rules: [
                {
                  id: "gated-respond-unavailable",
                  errorCode: "action-unavailable",
                  message: "Interaction unavailable",
                  available: () => false,
                },
              ],
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });
    const descriptors = getAvailableInteractions(bundle, initial, "player-2");
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].availability.status).toBe("blocked");
    expect(descriptors[0].availability.reason).toBe("Interaction unavailable");
    const rejected = await bundle.validateInput({
      state: initial,
      input: {
        kind: "interaction",
        interactionId: "gatedRespond",
        playerId: "player-2",
        params: {},
      },
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errorCode).toBe("action-unavailable");
  });
});
