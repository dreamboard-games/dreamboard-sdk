import { compileManifest } from "./manifest/compiler";
import { RuntimeJsonSchema } from "../shared/runtime-json";
import { createGame as createModel } from "../reducer";

import { createReducerTestingRuntime } from "../testing/reducer-runtime.js";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { formInput, rngInput } from "./inputs";
import { gameEvent, many } from "../reducer";
import { dealCardsFromDeckToHandInPlace } from "./table/card-mutations";
import { asPlayerId } from "../reducer/per-player";

function hydrateRefs<T>(
  interactionsByRef: Record<string, T> | undefined,
  refs: readonly string[] | undefined,
): T[] {
  if (!interactionsByRef) throw new Error("Expected interaction projection");
  return (refs ?? []).map((ref) => interactionsByRef[ref]).filter(Boolean);
}

const manifest = compileManifest({
  players: { minPlayers: 3, maxPlayers: 3 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: z.object({}),
      cards: (
        [
          "card-1",
          "card-2",
          "card-3",
          "card-4",
          "card-5",
          "card-6",
          "card-7",
        ] as const
      ).map((id) => ({
        id,
        name: id,
        cardType: "test-card",
        count: 1,
        properties: {},
      })),
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      visibility: "hidden",
      allowedCardSetIds: ["cards"],
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["cards"],
    },
  ],
  resources: [{ id: "gold", name: "Gold" }],
} as const);
const createTable = () =>
  manifest.createInitialTable({
    playerIds: ["player-1", "player-2", "player-3"],
  });
function createCardTable() {
  const table = createTable();
  for (const playerId of table.playerOrder) {
    dealCardsFromDeckToHandInPlace(
      table,
      "draw",
      playerId,
      "hand",
      playerId === "player-3" ? 1 : 3,
    );
  }
  return table;
}

function createGame({
  canResubmit = false,
  rejectRight = false,
}: {
  canResubmit?: boolean;
  rejectRight?: boolean;
} = {}) {
  const contract = createModel({
    manifest,
    phases: { choose: z.object({}) },
    state: {
      public: z.object({
        resolved: z.array(
          z.object({ playerId: z.string(), choice: z.string() }),
        ),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  return contract.assemble({
    initial: {
      public: () => ({ resolved: [] }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "choose",
    phases: {
      choose: contract.phase("choose").define({
        kind: "simultaneousPlayer",
        initialState: () => ({}),
        actors: ({ q }) => q.player.order().slice(0, 2),
        canResubmit,
        submit: {
          inputs: {
            ...(rejectRight ? { die: rngInput.d6() } : {}),
            choice: formInput.choice({
              choices: [
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ],
              defaultValue: "left",
            }),
          },
        },
        resolve({ submissions, tx, random }) {
          const resolved = Object.values(submissions).map((submission) => ({
            playerId: submission.playerId,
            choice: String(submission.params.choice),
          }));
          tx.patchPublicState({ resolved });
          if (rejectRight) {
            tx.addResources({
              playerId: asPlayerId("player-1"),
              amounts: {
                gold: random.integer({ minInclusive: 1, maxInclusive: 6 }),
              },
            });
            tx.emit(
              gameEvent.systemAction({
                procedureId: "resolved",
                title: "Resolved",
              }),
            );
            if (resolved.some((entry) => entry.choice === "right"))
              return tx.reject("RETRY");
          }
          return tx.accept();
        },
      }),
    },
    view: () => ({}),
  });
}

function createCardPassGame(options?: {
  commit?: {
    mode: "manual";
  };
}) {
  const contract = createModel({
    manifest,
    phases: { choose: z.object({}) },
    state: {
      public: z.object({
        resolved: z.array(
          z.object({ playerId: z.string(), cardIds: z.array(z.string()) }),
        ),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  return contract.assemble({
    initial: {
      public: () => ({ resolved: [] }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "choose",
    phases: {
      choose: contract.phase("choose").define({
        kind: "simultaneousPlayer",
        initialState: () => ({}),
        actors: ({ q }) => q.player.order().slice(0, 2),
        submit: {
          commit: options?.commit,
          inputs: {
            cardIds: many(
              contract.phase("choose").inputs.card({ from: ["hand"] }),
              {
                count: 3,
                distinct: true,
              },
            ),
          },
        },
        resolve({ submissions, tx }) {
          const resolved = Object.values(submissions).map((submission) => ({
            playerId: submission.playerId,
            cardIds: [...submission.params.cardIds],
          }));
          tx.patchPublicState({ resolved });
          return;
        },
      }),
    },
    view: () => ({}),
  });
}

function submitInput(playerId: string, choice: "left" | "right") {
  return {
    kind: "interaction" as const,
    interactionId: "submit",
    playerId,
    params: { choice },
  };
}

function submitCardsInput(playerId: string, cardIds: readonly string[]) {
  return {
    kind: "interaction" as const,
    interactionId: "submit",
    playerId,
    params: { cardIds: [...cardIds] },
  };
}

describe("simultaneousPlayer phases", () => {
  test("a rejected final actor rolls back its seal, draft, events and RNG while retaining earlier seals", async () => {
    const bundle = createReducerTestingRuntime(
      createGame({ rejectRight: true }),
    );
    const initial = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createTable()),
        playerIds: ["player-1", "player-2", "player-3"],
        rngSeed: 42,
      })
    ).state;
    const submit = (state: typeof initial, playerId: string, choice: string) =>
      bundle.dispatch({
        state,
        input: {
          kind: "interaction",
          playerId,
          interactionId: "submit",
          params: { choice },
        },
      });
    const first = await submit(initial, "player-1", "left");
    if (first.kind !== "accept") throw new Error("Expected first seal");
    const saved = structuredClone(first.state);
    expect(first.state.runtime.rng.cursor).toBeGreaterThan(0);
    expect(first.state.runtime.simultaneous.current).not.toBeNull();
    const rejected = await submit(first.state, "player-2", "right");
    expect(rejected).toEqual({
      kind: "reject",
      errorCode: "RETRY",
      message: undefined,
    });
    expect(first.state).toEqual(saved);
    const accepted = await submit(first.state, "player-2", "left");
    const fresh = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createTable()),
        playerIds: ["player-1", "player-2", "player-3"],
        rngSeed: 42,
      })
    ).state;
    const controlFirst = await submit(fresh, "player-1", "left");
    if (controlFirst.kind !== "accept")
      throw new Error("Expected control seal");
    const control = await submit(controlFirst.state, "player-2", "left");
    expect(accepted).toEqual(control);
    if (accepted.kind !== "accept") throw new Error("Expected resolution");
    expect(accepted.events).toHaveLength(1);
    expect(accepted.state.runtime.simultaneous.current).toBeNull();
    expect(accepted.state.domain.publicState).toEqual({
      resolved: [
        { playerId: "player-1", choice: "left" },
        { playerId: "player-2", choice: "left" },
      ],
    });
    expect(first.state).toEqual(saved);
  });

  test("automatic phases expose no actor or causal scheduler metadata", async () => {
    const contract = createModel({
      manifest,
      phases: { choose: z.object({}) },
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
      initialPhase: "choose",
      phases: {
        choose: contract
          .phase("choose")
          .define({ kind: "auto", initialState: () => ({}) }),
      },
      view: () => ({}),
    });
    const bundle = createReducerTestingRuntime(game);
    const state = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createTable()),
        playerIds: ["player-1", "player-2", "player-3"],
      })
    ).state;

    expect(
      bundle.project({
        state,
        playerIds: ["player-1"],
      }).schedulerFlow,
    ).toEqual({
      version: 1,
      activePlayerIds: [],
      pendingPlayerIds: [],
      continuationDependencies: [],
    });
  });

  test("collects sealed submissions and resolves once all actors are ready", async () => {
    const bundle = createReducerTestingRuntime(createGame());
    const initial = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createTable()),
        playerIds: ["player-1", "player-2", "player-3"],
      })
    ).state;

    const initialProjection = bundle.project({
      state: initial,
      playerIds: ["player-1", "player-2", "player-3"],
    });
    expect(initialProjection.schedulerFlow?.activePlayerIds).toEqual([
      "player-1",
      "player-2",
    ]);
    expect(initialProjection.schedulerFlow).toEqual({
      version: 1,
      activePlayerIds: ["player-1", "player-2"],
      pendingPlayerIds: ["player-1", "player-2"],
      continuationDependencies: [],
    });
    expect(
      hydrateRefs(
        initialProjection.interactionsByRef,
        initialProjection.seats["player-1"]?.availableInteractionRefs,
      ).map((interaction) => interaction.interactionId),
    ).toContain("submit");

    const outsiderValidation = await bundle.validateInput({
      state: initial,
      input: submitInput("player-3", "left"),
    });
    expect(outsiderValidation).toMatchObject({
      valid: false,
      errorCode: "NOT_YOUR_TURN",
    });

    const first = await bundle.dispatch({
      state: initial,
      input: submitInput("player-1", "left"),
    });
    expect(first.kind).toBe("accept");
    if (first.kind !== "accept") return;
    expect(first.state.domain.publicState).toEqual({ resolved: [] });

    const afterFirstProjection = bundle.project({
      state: first.state,
      playerIds: ["player-1", "player-2"],
    });
    expect(afterFirstProjection.schedulerFlow).toEqual({
      version: 1,
      activePlayerIds: ["player-2"],
      pendingPlayerIds: ["player-2"],
      continuationDependencies: [
        {
          waiterPlayerId: "player-1",
          blockerPlayerIds: ["player-2"],
        },
      ],
    });
    expect(JSON.stringify(afterFirstProjection.schedulerFlow)).not.toContain(
      "params",
    );
    expect(
      hydrateRefs(
        afterFirstProjection.interactionsByRef,
        afterFirstProjection.seats["player-1"]?.availableInteractionRefs,
      ).map((interaction) => interaction.interactionId),
    ).not.toContain("submit");
    expect(
      hydrateRefs(
        afterFirstProjection.interactionsByRef,
        afterFirstProjection.seats["player-2"]?.availableInteractionRefs,
      ).map((interaction) => interaction.interactionId),
    ).toContain("submit");

    const duplicate = await bundle.validateInput({
      state: first.state,
      input: submitInput("player-1", "right"),
    });
    expect(duplicate).toMatchObject({
      valid: false,
      errorCode: "ALREADY_SUBMITTED",
    });

    const second = await bundle.dispatch({
      state: first.state,
      input: submitInput("player-2", "right"),
    });
    expect(second.kind).toBe("accept");
    if (second.kind !== "accept") return;
    expect(second.state.domain.publicState).toEqual({
      resolved: [
        { playerId: "player-1", choice: "left" },
        { playerId: "player-2", choice: "right" },
      ],
    });
    expect(second.state.runtime.simultaneous.current).toBeNull();
  });

  test("allows replacement submissions when canResubmit is enabled", async () => {
    const bundle = createReducerTestingRuntime(
      createGame({ canResubmit: true }),
    );
    const initial = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createTable()),
        playerIds: ["player-1", "player-2", "player-3"],
      })
    ).state;

    const first = await bundle.dispatch({
      state: initial,
      input: submitInput("player-1", "left"),
    });
    expect(first.kind).toBe("accept");
    if (first.kind !== "accept") return;

    const replacement = await bundle.dispatch({
      state: first.state,
      input: submitInput("player-1", "right"),
    });
    expect(replacement.kind).toBe("accept");
    if (replacement.kind !== "accept") return;

    const resolved = await bundle.dispatch({
      state: replacement.state,
      input: submitInput("player-2", "left"),
    });
    expect(resolved.kind).toBe("accept");
    if (resolved.kind !== "accept") return;
    expect(resolved.state.domain.publicState).toEqual({
      resolved: [
        { playerId: "player-1", choice: "right" },
        { playerId: "player-2", choice: "left" },
      ],
    });
  });

  test("collects three-card simultaneous submissions with server-authoritative validation", async () => {
    const bundle = createReducerTestingRuntime(createCardPassGame());
    const initial = (
      await bundle.initialize({
        table: RuntimeJsonSchema.parse(createCardTable()),
        playerIds: ["player-1", "player-2", "player-3"],
      })
    ).state;

    const projection = bundle.project({
      state: initial,
      playerIds: ["player-1"],
    });
    const submit = hydrateRefs(
      projection.interactionsByRef,
      projection.seats["player-1"]?.availableInteractionRefs,
    ).find((interaction) => interaction.interactionId === "submit");
    expect(submit?.inputs).toMatchObject([
      {
        key: "cardIds",
        domain: {
          type: "cardTarget",
          projection: "resolved",
          targetKind: "card",
          zoneIds: ["hand"],
          eligibleTargets: ["card-1", "card-2", "card-3"],
          selection: {
            mode: "many",
            min: 3,
            max: 3,
            distinct: true,
          },
        },
      },
    ]);
    expect(submit?.commit).toEqual({ mode: "manual" });

    await expect(
      bundle.validateInput({
        state: initial,
        input: submitCardsInput("player-1", ["card-1", "card-2"]),
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "INVALID_INPUT_COUNT",
    });
    await expect(
      bundle.validateInput({
        state: initial,
        input: submitCardsInput("player-1", ["card-1", "card-1", "card-2"]),
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "DUPLICATE_INPUT_VALUE",
    });
    await expect(
      bundle.validateInput({
        state: initial,
        input: submitCardsInput("player-1", ["card-1", "card-2", "card-4"]),
      }),
    ).resolves.toMatchObject({
      valid: false,
      errorCode: "CARD_TARGET_NOT_ELIGIBLE",
    });

    const first = await bundle.dispatch({
      state: initial,
      input: submitCardsInput("player-1", ["card-1", "card-2", "card-3"]),
    });
    expect(first.kind).toBe("accept");
    if (first.kind !== "accept") return;
    expect(first.state.domain.publicState).toEqual({ resolved: [] });

    const second = await bundle.dispatch({
      state: first.state,
      input: submitCardsInput("player-2", ["card-4", "card-5", "card-6"]),
    });
    expect(second.kind).toBe("accept");
    if (second.kind !== "accept") return;
    expect(second.state.domain.publicState).toEqual({
      resolved: [
        {
          playerId: "player-1",
          cardIds: ["card-1", "card-2", "card-3"],
        },
        {
          playerId: "player-2",
          cardIds: ["card-4", "card-5", "card-6"],
        },
      ],
    });
  });

  test("rejects auto submit for many-input simultaneous submissions", () => {
    expect(() =>
      // @ts-expect-error -- Deliberately reject automatic commit for a many-input simultaneous phase at runtime.
      createCardPassGame({ commit: { mode: "autoWhenReady" } }),
    ).toThrow(
      'defineGame: phases.choose.submit: interactions with many(...) inputs must use commit: { mode: "manual" }.',
    );
  });
});
