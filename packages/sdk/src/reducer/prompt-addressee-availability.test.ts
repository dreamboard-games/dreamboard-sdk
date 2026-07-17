// Regression coverage for the bundle's unified actor-authorization:
//
//   "Who may submit this interaction right now?"
//
// The bundle exposes this decision in two places:
//   - `getAvailableInteractions` uses it to project descriptor `availability`
//     so UIs can enable / gray out buttons.
//   - `validateInteractionInput` uses it to accept / reject actual
//     submissions.
//
// These must never drift. The tests below pin the contract:
//
//   1. Interactions without a `to` selector default to "turn's active
//      player" — this is the common path for `buildRoad`, `rollDice`,
//      `endTurn`, etc.
//   2. Interactions with a non-empty `to` selector are addressee-driven
//      (e.g. `respondToTrade` for a recipient). Non-addressees neither see
//      the descriptor nor can they submit the interaction.
//   3. The author's availability predicate still gates addressees — it's
//      an additional filter on top of authorization, not a replacement.
//
// History: before the unification, availability and runtime submission each
// had their own "active player only" gates which were blind to prompt
// addressees. A trade recipient would see the Accept/Reject prompt but every
// submission attempt came back as `NOT_YOUR_TURN`. These tests prevent that
// from regressing.

import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  choiceTarget,
  defineEmptyView,
  createReducerBundle,
  defineGame,
  defineGameContract,
  defineInteraction,
  definePhase,
  defineStepPhase,
  pipe,
  promptInput,
} from "../reducer";
import type { RuntimeTableRecord } from "../reducer/advanced";
import { asPlayerId, perPlayer } from "../reducer/per-player";

function getAvailableInteractions(
  bundle: ReturnType<typeof createReducerBundle>,
  state: Parameters<typeof bundle.projectSeatsDynamic>[0]["state"],
  playerId: string,
) {
  const projection = bundle.projectSeatsDynamic({
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
    resources: perPlayer(ids, () => ({})),
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
      resources: () => perPlayer([], () => ({})),
    },
    setupOptionsById: {},
    setupProfilesById: {},
    tableSchema: z.custom<RuntimeTableRecord>(),
    runtimeSchema: z.any(),
    createGameStateSchema: () => z.any(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario A — addressed prompt (the trade-respond pattern).
//
// `respond` is `kind: "prompt"` with `to: ({state}) => state.publicState.askPlayer`.
// The active player is `player-1`; `askPlayer` is `player-2`. So the
// addressee (player-2) is NOT the active player. This is the exact shape
// that broke before the fix.
// ─────────────────────────────────────────────────────────────────────────

describe("addressee-based prompt authorization", () => {
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
          enter({ state, accept, ops }) {
            // Active player is player-1; the addressee (askPlayer) is player-2.
            // This is the exact configuration that broke before the fix.
            return accept(pipe(state, ops.setActivePlayers(["player-1"])));
          },
          interactions: {
            respond: defineInteraction<typeof contract>()({
              inputs: {
                answer: promptInput({
                  schema: z.enum(["yes", "no"]),
                  target: yesNoTarget,
                }),
              },
              to: ({ state }) => state.publicState.askPlayer,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    return createReducerBundle(game);
  }

  test("descriptor: addressee sees the prompt as available even when they are not active", async () => {
    const bundle = makeBundle();
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    const offerer = getAvailableInteractions(bundle, initial, "player-1");
    // player-1 is active but not addressed — no descriptor.
    expect(offerer).toEqual([]);

    const recipient = getAvailableInteractions(bundle, initial, "player-2");
    expect(recipient).toHaveLength(1);
    expect(recipient[0].interactionId).toBe("respond");
    expect(recipient[0].kind).toBe("prompt");
    expect(recipient[0].availability).toEqual({ status: "available" });
    expect(recipient[0].inputs).toEqual([
      {
        key: "answer",
        kind: "prompt",
        domain: {
          type: "choice",
          choices: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
      },
    ]);
    expect(recipient[0].context?.options).toEqual([
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ]);
  });

  test("submit: the addressee (non-active) can submit the prompt", async () => {
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

  test("submit: a non-addressee (even the active player) gets prompt-not-owned, NOT NOT_YOUR_TURN", async () => {
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
        // player-1 is the active player but `askPlayer` is player-2,
        // so player-1 is NOT an addressee.
        playerId: "player-1",
        params: { answer: "yes" },
      },
    });
    expect(rejected.valid).toBe(false);
    expect(rejected.errorCode).toBe("prompt-not-owned");
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
        takeTurn: defineStepPhase<typeof contract>()({
          kind: "player",
          steps: ["main", "blocked"],
          state: phaseState,
          actor: ({ state }) => state.publicState.actor,
          interactions: {
            spendGold: {
              steps: ["main"],
              interaction: defineInteraction<typeof contract>()({
                inputs: {},
                cost: () => ({ gold: 2 }),
                reduce({ state, accept }) {
                  return accept(state);
                },
              }),
            },
            blockedOnly: {
              steps: ["blocked"],
              interaction: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ state, accept }) {
                  return accept(state);
                },
              }),
            },
            actorOnlyOverride: {
              steps: ["main"],
              interaction: defineInteraction<typeof contract>()({
                inputs: {},
                actor: () => "player-1",
                visibility: "actorsOnly",
                reduce({ state, accept }) {
                  return accept(state);
                },
              }),
            },
          },
        }),
      },
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });
    return createReducerBundle(game);
  }

  function createResourceTable(): RuntimeTableRecord {
    const ids = [asPlayerId("player-1"), asPlayerId("player-2")];
    return {
      ...createTable(["player-1", "player-2"]),
      resources: perPlayer(ids, (id) => ({ gold: id === "player-2" ? 1 : 9 })),
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
        status: "insufficientResources",
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
    ).toMatchObject({
      availability: {
        status: "notYourTurn",
        reason: "Not your turn",
      },
    });

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

  test("interaction actor with actorsOnly replaces prompt addressee routing", async () => {
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

// ─────────────────────────────────────────────────────────────────────────
// Scenario B — default action-kind interactions (the common path).
//
// `act` is `kind: "action"` without a `to` selector. Authorization
// defaults to "active player only"; we verify both the descriptor
// projection and the submit path.
// ─────────────────────────────────────────────────────────────────────────

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
        takeTurn: defineStepPhase<typeof contract>()({
          kind: "player",
          steps: ["main", "roll"],
          state: z.object({}),
          enter({ state, accept, ops }) {
            return accept(pipe(state, ops.setActivePlayers(["player-1"])));
          },
          interactions: {
            act: {
              steps: ["main", "roll"],
              interaction: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ state, accept }) {
                  return accept(state);
                },
              }),
            },
            rollOnly: {
              steps: ["roll"],
              interaction: defineInteraction<typeof contract>()({
                inputs: {},
                reduce({ state, accept }) {
                  return accept(state);
                },
              }),
            },
          },
        }),
      },
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    return createReducerBundle(game);
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

    const inactive = getAvailableInteractions(bundle, initial, "player-2");
    expect(inactive.find((d) => d.interactionId === "act")).toMatchObject({
      availability: {
        status: "notYourTurn",
        reason: "Not your turn",
      },
    });
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
        reason: "Interaction not allowed in current step",
      },
    });

    const inactive = getAvailableInteractions(bundle, initial, "player-2");
    expect(inactive.find((d) => d.interactionId === "rollOnly")).toMatchObject({
      availability: {
        status: "notYourTurn",
        reason: "Not your turn",
      },
    });

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

// ─────────────────────────────────────────────────────────────────────────
// Scenario C — author `available` predicate still composes.
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// Scenario D — `to` selector that returns an empty set (a "closed" prompt).
//
// This is the shape every "open-for-a-while, then close" prompt has —
// `respondToTrade` after `pendingTrade` clears, `discardCards` when
// nobody has to discard, "select which discard pile to take from" after
// the deck empties, and so on.
//
// Historically the bundle conflated "selector undefined" with "selector
// returned null/empty": both fell back to `mode: "active"`. That leaked
// closed prompts back to the turn's active player (descriptor showed up
// with available status despite there being nothing to respond to) and
// rendered stale "Not your turn" descriptors to every non-active seat.
//
// The contract now is: an `interaction.to` that is DEFINED but resolves
// to an empty set is authoritative — it means "no addressees right now".
// The descriptor is suppressed for every seat, and any stray submission
// is rejected with `prompt-not-owned`.
// ─────────────────────────────────────────────────────────────────────────

describe("closed prompt (`to` resolves to empty set)", () => {
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
        // `pendingRespondents` is empty — the prompt is closed.
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
          enter({ state, accept, ops }) {
            return accept(pipe(state, ops.setActivePlayers(["player-1"])));
          },
          interactions: {
            respond: defineInteraction<typeof contract>()({
              inputs: {},
              to: ({ state }) => state.publicState.pendingRespondents,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    return createReducerBundle(game);
  }

  test("descriptor: the closed prompt is invisible to every seat (no leak to the active player)", async () => {
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

  test("submit: every seat is rejected with prompt-not-owned, not NOT_YOUR_TURN", async () => {
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
      // The author declared a `to` selector — an empty result still
      // means "addressee-driven", just with no current addressees.
      // Rejecting with NOT_YOUR_TURN here would hide the real reason
      // and confuse the UI's "Not your turn" affordance.
      expect(rejected.errorCode).toBe("prompt-not-owned");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario E — action-kind interactions with a `to` selector are also
// addressee-driven. `discardCards` (forced-discard after a 7 is rolled)
// is declared `kind: "action"` and `surface: "blocker"` but has
// `to: ({ state }) => state.phase.discardPending`. The captains who need
// to discard are the addressees; everyone else — including the active
// player — must not see the descriptor. Historically only prompt-kind
// interactions were suppressed for non-addressees, which meant the
// active player saw a `"Discard"` blocker descriptor marked as
// not-your-turn even when they didn't need to
// discard. Hiding it is the only correct answer.
// ─────────────────────────────────────────────────────────────────────────

describe("action-kind interactions with a `to` selector", () => {
  test("descriptor: only addressees see an action-kind interaction with `to`; non-addressees (incl. active player) do not", async () => {
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
          enter({ state, accept, ops }) {
            return accept(pipe(state, ops.setActivePlayers(["player-1"])));
          },
          interactions: {
            discard: defineInteraction<typeof contract>()({
              inputs: {},
              to: ({ state }) => state.publicState.mustDiscard,
              reduce({ state, accept }) {
                return accept(state);
              },
            }),
          },
        }),
      },
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    // Active player is player-1 but the `to` selector names player-2.
    // Before the fix, player-1 got the descriptor with
    // not-your-turn availability — misleading chrome. The
    // descriptor should be suppressed entirely for player-1.
    const activeNonAddressee = getAvailableInteractions(
      bundle,
      initial,
      "player-1",
    );
    expect(activeNonAddressee).toEqual([]);

    const addressee = getAvailableInteractions(bundle, initial, "player-2");
    expect(addressee).toHaveLength(1);
    expect(addressee[0].interactionId).toBe("discard");
    expect(addressee[0].kind).toBe("action");
    expect(addressee[0].availability).toEqual({ status: "available" });
  });
});

describe("author `available` predicate composes with authorization", () => {
  test("addressee's availability still respects the author's `available` predicate", async () => {
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
              to: ({ state }) => state.publicState.askPlayer,
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
      views: {
        shared: defineEmptyView<typeof contract>(),
        player: defineEmptyView<typeof contract>(),
      },
    });

    const bundle = createReducerBundle(game);
    const initial = await bundle.initialize({
      table: createTable(),
      playerIds: ["player-1", "player-2"],
    });

    // Descriptor path.
    const descriptors = getAvailableInteractions(bundle, initial, "player-2");
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].availability.status).toBe("blocked");
    // Crucially NOT "Not your turn" — the addressee IS the actor; it's
    // the predicate that denied.
    expect(descriptors[0].availability.reason).toBe("Interaction unavailable");

    // Submit path.
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
