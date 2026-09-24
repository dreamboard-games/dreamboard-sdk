import { describe, expect, test } from "vitest";
import { z } from "zod";
import { perPlayer, asPlayerId } from "./per-player";
import { createGame } from "../reducer";
import { createReducerBundle } from "./internal";
import { buildMinimalManifest, createTable } from "./lifecycle-test-fixtures";

async function fixture(
  options: {
    exclusive?: boolean;
    rejectFinal?: boolean;
    simultaneous?: boolean;
  } = {},
) {
  let reductions = 0;
  let validations = 0;
  const game = createGame({
    manifest: buildMinimalManifest(["play"] as const),
    phases: { play: z.object({}) },
    state: {
      public: z.object({ blocked: z.boolean(), result: z.string().nullable() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const play = game.phase("play");
  const choose = play.interaction({
    actor: options.exclusive ? () => "player-1" : undefined,
    steps: play
      .steps()
      .input(
        "first",
        play.inputs.form.choice({
          choices: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
          defaultValue: () => undefined,
        }),
      )
      .input("second", ({ selected, state, playerId }) => {
        if (options.exclusive && playerId !== "player-1")
          throw new Error("Unauthorized private domain");
        return play.inputs.form.choice({
          choices: state.publicState.blocked
            ? []
            : [{ value: selected.first, label: selected.first }],
          defaultValue: () => undefined,
        });
      }),
    rules: [
      {
        id: "final",
        errorCode: "REJECT",
        validate: () => {
          validations++;
          return null;
        },
      },
    ],
    reduce({ tx, input, random }) {
      reductions++;
      tx.patchPublicState({ result: input.params.first + input.params.second });
      random.integer({ minInclusive: 1, maxInclusive: 6 });
      if (options.rejectFinal) return tx.reject("REJECT");
    },
  });
  const definition = game.assemble({
    initial: {
      public: () => ({ blocked: false, result: null }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "play",
    phases: {
      play: options.simultaneous
        ? play.define({
            kind: "simultaneousPlayer",
            actors: () => ["player-1", "player-2"],
            initialState: () => ({}),
            submit: choose,
            resolve({ tx, random, submissions }) {
              reductions++;
              random.integer({ minInclusive: 1, maxInclusive: 6 });
              tx.patchPublicState({
                result: Object.values(submissions)
                  .map((entry) => entry.params.first + entry.params.second)
                  .join(":"),
              });
              if (options.rejectFinal) return tx.reject("REJECT");
            },
          })
        : play.define({
            kind: "player",
            initialState: () => ({}),
            enter: ({ tx }) => {
              tx.setActivePlayers(["player-1", "player-2"]);
            },
            interactions: {
              choose,
              block: play.interaction({
                inputs: {},
                reduce: ({ tx }) => {
                  tx.patchPublicState({ blocked: true });
                },
              }),
              reset: play.interaction({
                inputs: {},
                reduce: ({ tx }) => tx.transition("play"),
              }),
            },
          }),
    },
    view: game.view(() => ({})),
  });
  const bundle = createReducerBundle(definition);
  const table = createTable();
  table.hands.hand = perPlayer(
    [asPlayerId("player-1"), asPlayerId("player-2")],
    () => [],
  );
  const initialized = await bundle.initialize({
    table,
    playerIds: ["player-1", "player-2"],
    rngSeed: 42,
  });
  return { bundle, initialized, counts: () => ({ reductions, validations }) };
}

describe("committed interaction steps", () => {
  test("commits one current value without reducing, restores it, then validates and reduces once", async () => {
    const { bundle, initialized, counts } = await fixture();
    const first = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "b" },
      },
    });
    expect(first.kind).toBe("accept");
    if (first.kind !== "accept") return;
    expect(counts()).toEqual({ reductions: 0, validations: 0 });
    expect(first.state.runtime.pending["player-1"]).toEqual({
      phaseName: "play",
      interactionId: "choose",
      values: ["b"],
    });
    expect(initialized.state.runtime.pending).toEqual({});
    const restored = JSON.parse(JSON.stringify(first.state));
    const last = await bundle.dispatch({
      state: restored,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { second: "b" },
      },
    });
    expect(last.kind).toBe("accept");
    if (last.kind !== "accept") return;
    expect(last.state.domain.publicState.result).toBe("bb");
    expect(last.state.runtime.pending).toEqual({});
    expect(counts()).toEqual({ reductions: 1, validations: 1 });
  });

  test("rejects malformed persisted pending identities and completed prefixes", async () => {
    const { bundle, initialized } = await fixture();
    for (const pending of [
      { phaseName: "play", interactionId: "missing", values: ["a"] },
      { phaseName: "play", interactionId: "block", values: ["a"] },
      { phaseName: "play", interactionId: "choose", values: [] },
      { phaseName: "play", interactionId: "choose", values: ["a", "a"] },
    ]) {
      const malformed = JSON.parse(JSON.stringify(initialized.state));
      malformed.runtime.pending["player-1"] = pending;
      expect(() =>
        bundle.project({ state: malformed, playerIds: ["player-1"] }),
      ).toThrow();
    }
  });

  test("rejects future/extra keys and cancels only the actor's own unsealed prefix", async () => {
    const { bundle, initialized } = await fixture();
    const bad = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "a", second: "a" },
      },
    });
    expect(bad.kind).toBe("reject");
    const first = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "a" },
      },
    });
    if (first.kind !== "accept") throw new Error("first step rejected");
    const other = await bundle.dispatch({
      state: first.state,
      input: {
        kind: "interaction.cancel",
        playerId: "player-2",
        interactionId: "choose",
      },
    });
    expect(other.kind).toBe("reject");
    const canceled = await bundle.dispatch({
      state: first.state,
      input: {
        kind: "interaction.cancel",
        playerId: "player-1",
        interactionId: "choose",
      },
    });
    expect(canceled.kind).toBe("accept");
    if (canceled.kind === "accept")
      expect(canceled.state.runtime.pending).toEqual({});
  });
  test("does not resolve another seat's private factory and projects only that seat's prefix", async () => {
    const { bundle, initialized } = await fixture({ exclusive: true });
    const first = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "a" },
      },
    });
    if (first.kind !== "accept") throw new Error("first step rejected");
    const projection = bundle.project({
      state: first.state,
      playerIds: ["player-1", "player-2"],
    });
    const own = projection.seats["player-1"]!;
    const other = projection.seats["player-2"]!;
    const ownDescriptors = own.availableInteractionRefs.map(
      (ref) => projection.interactionsByRef[ref],
    );
    const otherDescriptors = other.availableInteractionRefs.map(
      (ref) => projection.interactionsByRef[ref],
    );
    expect(
      ownDescriptors.find((descriptor) => descriptor.interactionId === "choose")
        ?.step,
    ).toMatchObject({ index: 1, selected: { first: "a" }, canCancel: true });
    expect(
      otherDescriptors.some(
        (descriptor) => descriptor.interactionId === "choose",
      ),
    ).toBe(false);
  });

  test("preserves the pre-final prefix and RNG when authored reduction rejects", async () => {
    const { bundle, initialized } = await fixture({ rejectFinal: true });
    const first = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "b" },
      },
    });
    if (first.kind !== "accept") throw new Error("first step rejected");
    const before = JSON.stringify(first.state);
    const rejected = await bundle.dispatch({
      state: first.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { second: "b" },
      },
    });
    expect(rejected.kind).toBe("reject");
    expect(JSON.stringify(first.state)).toBe(before);
    expect(first.state.runtime.rng).toEqual(initialized.state.runtime.rng);
  });

  test("keeps a valid prefix when the next domain empties and clears it on same-name phase entry", async () => {
    const { bundle, initialized } = await fixture();
    const first = await bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "choose",
        params: { first: "b" },
      },
    });
    if (first.kind !== "accept") throw new Error("first step rejected");
    const blocked = await bundle.dispatch({
      state: first.state,
      input: {
        kind: "interaction",
        playerId: "player-2",
        interactionId: "block",
        params: {},
      },
    });
    if (blocked.kind !== "accept") throw new Error("block rejected");
    expect(blocked.state.runtime.pending["player-1"]?.values).toEqual(["b"]);
    const reset = await bundle.dispatch({
      state: blocked.state,
      input: {
        kind: "interaction",
        playerId: "player-2",
        interactionId: "reset",
        params: {},
      },
    });
    if (reset.kind !== "accept") throw new Error("reset rejected");
    expect(reset.state.runtime.pending).toEqual({});
  });

  test("simultaneous final rejection preserves earlier seals and the final actor's pre-final prefix", async () => {
    const { bundle, initialized } = await fixture({
      simultaneous: true,
      rejectFinal: true,
    });
    let state = initialized.state;
    for (const [playerId, params] of [
      ["player-1", { first: "a" }],
      ["player-1", { second: "a" }],
      ["player-2", { first: "b" }],
    ] as const) {
      const result = await bundle.dispatch({
        state,
        input: {
          kind: "interaction",
          playerId,
          interactionId: "submit",
          params,
        },
      });
      if (result.kind !== "accept") throw new Error("setup step rejected");
      state = result.state;
    }
    expect(
      state.runtime.simultaneous.current?.submissions["player-1"],
    ).toMatchObject({ params: { first: "a", second: "a" } });
    expect(state.runtime.pending["player-1"]).toBeUndefined();
    expect(state.runtime.pending["player-2"]?.values).toEqual(["b"]);
    const before = JSON.stringify(state);
    const result = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-2",
        interactionId: "submit",
        params: { second: "b" },
      },
    });
    expect(result.kind).toBe("reject");
    expect(JSON.stringify(state)).toBe(before);
    expect(state.runtime.rng).toEqual(initialized.state.runtime.rng);
    const cancelSealed = await bundle.dispatch({
      state,
      input: {
        kind: "interaction.cancel",
        playerId: "player-1",
        interactionId: "submit",
      },
    });
    expect(cancelSealed.kind).toBe("reject");
  });

  test("simultaneous completion resolves once with complete params and clears only completed prefixes", async () => {
    const { bundle, initialized, counts } = await fixture({
      simultaneous: true,
    });
    let state = initialized.state;
    for (const [playerId, params] of [
      ["player-1", { first: "a" }],
      ["player-2", { first: "b" }],
      ["player-1", { second: "a" }],
      ["player-2", { second: "b" }],
    ] as const) {
      const result = await bundle.dispatch({
        state,
        input: {
          kind: "interaction",
          playerId,
          interactionId: "submit",
          params,
        },
      });
      if (result.kind !== "accept") throw new Error("step rejected");
      state = result.state;
    }
    expect(state.runtime.pending).toEqual({});
    expect(state.domain.publicState.result).toBe("aa:bb");
    expect(counts()).toEqual({ reductions: 1, validations: 2 });
    expect(state.runtime.rng.cursor).toBeGreaterThan(
      initialized.state.runtime.rng.cursor,
    );
  });
});

describe("prepared final step parameters", () => {
  for (const simultaneous of [false, true]) {
    test(`parses transforms once before ${simultaneous ? "simultaneous resolve" : "ordinary reduce"}`, async () => {
      const seen: unknown[] = [];
      let finalParses = 0;
      const game = createGame({
        manifest: buildMinimalManifest(["play"] as const),
        phases: { play: z.object({}) },
        state: {
          public: z.object({}),
          private: z.object({}),
          hidden: z.object({}),
        },
      });
      const play = game.phase("play");
      const action = play.interaction({
        steps: play
          .steps()
          .input("first", {
            ...play.inputs.form.number({ min: 0, max: 10 }),
            schema: z.number().transform((value) => value + 1),
          })
          .input("second", ({ selected }) => ({
            ...play.inputs.form.number({
              min: selected.first,
              max: selected.first,
            }),
            schema: z.literal(selected.first),
          })),
        paramsSchema: z
          .object({ first: z.number(), second: z.number() })
          .transform((params) => {
            finalParses++;
            return params;
          }),
        reduce({ input, random }) {
          seen.push(input.params);
          random.integer({ minInclusive: 1, maxInclusive: 6 });
        },
      });
      const definition = game.assemble({
        initial: {
          public: () => ({}),
          private: () => ({}),
          hidden: () => ({}),
        },
        initialPhase: "play",
        phases: {
          play: simultaneous
            ? play.define({
                kind: "simultaneousPlayer",
                actors: () => ["player-1"],
                initialState: () => ({}),
                submit: action,
                resolve({ submissions, random }) {
                  seen.push(submissions["player-1"].params);
                  random.integer({ minInclusive: 1, maxInclusive: 6 });
                },
              })
            : play.define({
                kind: "player",
                initialState: () => ({}),
                enter: ({ tx }) => {
                  tx.setActivePlayers(["player-1"]);
                },
                interactions: { action },
              }),
        },
        view: game.view(() => ({})),
      });
      const bundle = createReducerBundle(definition);
      const initialized = await bundle.initialize({
        table: createTable(),
        playerIds: ["player-1", "player-2"],
        rngSeed: 42,
      });
      const interactionId = simultaneous ? "submit" : "action";
      const first = await bundle.dispatch({
        state: initialized.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId,
          params: { first: 1 },
        },
      });
      if (first.kind !== "accept") throw new Error("first step rejected");
      expect(first.state.runtime.pending["player-1"]?.values).toEqual([1]);
      const second = await bundle.dispatch({
        state: first.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId,
          params: { second: 2 },
        },
      });
      expect(second.kind).toBe("accept");
      expect(seen).toEqual([{ first: 2, second: 2 }]);
      expect(finalParses).toBe(1);
      if (second.kind === "accept")
        expect(second.state.runtime.rng.draws).toHaveLength(1);
    });
  }
});

for (const change of [
  "touch",
  "invalidate",
  "revoke",
  "unavailable",
  "roundTrip",
] as const) {
  test(`reconciles committed prefixes after ${change}`, async () => {
    const model = createGame({
      manifest: buildMinimalManifest(["play", "detour"] as const),
      phases: { play: z.object({}), detour: z.object({}) },
      state: {
        public: z.object({
          allowed: z.boolean(),
          actor: z.boolean(),
          available: z.boolean(),
          revision: z.number(),
        }),
        private: z.object({}),
        hidden: z.object({}),
      },
    });
    const play = model.phase("play");
    const detour = model.phase("detour");
    const definition = model.assemble({
      initial: {
        public: () => ({
          allowed: true,
          actor: true,
          available: true,
          revision: 0,
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "play",
      phases: {
        play: play.define({
          kind: "player",
          initialState: () => ({}),
          enter: ({ tx }) => {
            tx.setActivePlayers(["player-1", "player-2"]);
          },
          interactions: {
            choose: play.interaction({
              actor: ({ state }) =>
                state.publicState.actor ? "player-1" : "player-2",
              steps: play
                .steps()
                .input(
                  "first",
                  play.inputs.form.choice({
                    choices: [{ value: "a", label: "A" }],
                    defaultValue: () => undefined,
                  }),
                )
                .input("second", ({ state }) =>
                  play.inputs.form.choice({
                    choices: [
                      {
                        value: state.publicState.allowed ? "b" : "c",
                        label: "Second",
                      },
                    ],
                    defaultValue: () => undefined,
                  }),
                )
                .input(
                  "third",
                  play.inputs.form.choice({
                    choices: [{ value: "done", label: "Done" }],
                    defaultValue: () => undefined,
                  }),
                ),
              rules: [
                {
                  id: "available",
                  errorCode: "UNAVAILABLE",
                  available: ({ state }) => state.publicState.available,
                },
              ],
              reduce: () => {},
            }),
            change: play.interaction({
              actor: () => "player-2",
              inputs: {},
              reduce({ tx }) {
                if (change === "roundTrip") return tx.transition("detour");
                tx.patchPublicState({
                  revision: 1,
                  ...(change === "invalidate" ? { allowed: false } : {}),
                  ...(change === "revoke" ? { actor: false } : {}),
                  ...(change === "unavailable" ? { available: false } : {}),
                });
              },
            }),
          },
        }),
        detour: detour.define({
          kind: "auto",
          initialState: () => ({}),
          enter: ({ tx }) => tx.transition("play"),
        }),
      },
      view: model.view(() => ({})),
    });
    const bundle = createReducerBundle(definition);
    const table = createTable();
    table.hands.hand = perPlayer(
      [asPlayerId("player-1"), asPlayerId("player-2")],
      () => [],
    );
    let state = (
      await bundle.initialize({ table, playerIds: ["player-1", "player-2"] })
    ).state;
    for (const params of [{ first: "a" }, { second: "b" }]) {
      const result = await bundle.dispatch({
        state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "choose",
          params,
        },
      });
      if (result.kind !== "accept") throw new Error("prefix rejected");
      state = result.state;
    }
    const before = JSON.stringify(state);
    const changed = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "player-2",
        interactionId: "change",
        params: {},
      },
    });
    if (changed.kind !== "accept") throw new Error("change rejected");
    expect(JSON.stringify(state)).toBe(before);
    expect(changed.state.runtime.pending["player-1"]?.values).toEqual(
      change === "touch"
        ? ["a", "b"]
        : change === "invalidate"
          ? ["a"]
          : undefined,
    );
    if (change === "invalidate") {
      const stale = await bundle.dispatch({
        state: changed.state,
        input: {
          kind: "interaction",
          playerId: "player-1",
          interactionId: "choose",
          params: { third: "done" },
        },
      });
      expect(stale.kind).toBe("reject");
      expect(changed.state.runtime.pending["player-1"]?.values).toEqual(["a"]);
    }
    if (change === "roundTrip")
      expect(changed.state.domain.flow.currentPhase).toBe("play");
  });
}
