import { createReducerTestingRuntime } from "../../testing/reducer-runtime.js";
import { asPlayerId } from "../per-player.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { createGame } from "../authoring/game.js";
import { createReducerBundle } from "./create-reducer-bundle.js";

async function fixture() {
  const validation = vi.fn();
  const initializePrivate = vi.fn(() => ({}));
  const actor = vi.fn(() => [asPlayerId("seated")]);
  const view = vi.fn(() => ({}));
  const model = createGame({
    manifest: {
      players: { minPlayers: 1, maxPlayers: 1 },
      cardSets: [],
      zones: [],
      boards: [],
    },
    state: {
      public: z.object({ count: z.number() }).superRefine(() => {
        validation();
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: { play: z.object({}) },
  });
  const play = model.phase("play");
  const change = play.interaction({
    inputs: {},
    reduce({ tx, state }) {
      tx.patchPublicState({ count: state.publicState.count + 1 });
    },
  });
  const game = model.assemble({
    initial: { public: () => ({ count: 0 }), private: initializePrivate },
    initialPhase: "play",
    phases: {
      play: play.define({
        kind: "player",
        initialState: () => ({}),
        enter({ tx }) {
          tx.setActivePlayers([]);
        },
        interactions: {
          change,
          controlled: play.interaction({ actor, inputs: {}, reduce() {} }),
        },
      }),
    },
    view: model.view(view),
  });
  const bundle = createReducerBundle(game);
  const initial = await bundle.initialize({
    table: RuntimeJsonSchema.parse(
      model.contract.manifest.createInitialTable({ playerIds: ["seated"] }),
    ),
    playerIds: ["seated"],
    rngSeed: 1,
  });
  validation.mockClear();
  initializePrivate.mockClear();
  actor.mockClear();
  view.mockClear();
  return {
    game,
    bundle,
    state: initial.state,
    validation,
    initializePrivate,
    actor,
    view,
  };
}

describe("session roster admission before authored callbacks", () => {
  it("rejects outsiders before no-input reduction, actor resolution, and cancellation", async () => {
    const { bundle, state, validation, actor } = await fixture();
    const before = structuredClone(state);
    expect(state.domain.flow.activePlayers).toEqual([]);
    for (const input of [
      {
        kind: "interaction",
        playerId: "outsider",
        interactionId: "change",
        params: {},
      },
      {
        kind: "interaction",
        playerId: "outsider",
        interactionId: "controlled",
        params: {},
      },
      {
        kind: "interaction.cancel",
        playerId: "outsider",
        interactionId: "change",
      },
    ] as const) {
      expect(await bundle.dispatch({ state, input })).toMatchObject({
        kind: "reject",
        errorCode: "NOT_YOUR_TURN",
      });
      expect(state).toEqual(before);
    }
    expect(validation).not.toHaveBeenCalled();
    expect(actor).not.toHaveBeenCalled();
    const accepted = await bundle.dispatch({
      state,
      input: {
        kind: "interaction",
        playerId: "seated",
        interactionId: "change",
        params: {},
      },
    });
    expect(accepted.kind).toBe("accept");
    if (accepted.kind !== "accept")
      throw new Error("Expected seated actor acceptance");
    expect(accepted.state.domain.publicState).toEqual({ count: 1 });
  });

  it("rejects the complete perspective request before view, control, or private callbacks", async () => {
    const { bundle, state, validation, initializePrivate, actor, view } =
      await fixture();
    expect(() =>
      bundle.project({ state, playerIds: ["seated", "outsider"] }),
    ).toThrow("not seated");
    expect(() =>
      bundle.project({ state, playerIds: ["seated", "seated"] }),
    ).toThrow("Duplicate player id");
    expect(validation).not.toHaveBeenCalled();
    expect(initializePrivate).not.toHaveBeenCalled();
    expect(actor).not.toHaveBeenCalled();
    expect(view).not.toHaveBeenCalled();
    expect(bundle.project({ state, playerIds: [] }).seats).toEqual({});
    expect(
      bundle.project({ state, playerIds: ["seated"] }).seats.seated,
    ).toBeDefined();
    expect(view).toHaveBeenCalledOnce();
  });
  it("keeps direct inspection, actions-only projection and validation consistent with dispatch", async () => {
    const { game, state, validation, actor, view } = await fixture();
    const runtime = createReducerTestingRuntime(game);
    const input = {
      kind: "interaction",
      playerId: "outsider",
      interactionId: "change",
      params: {},
    } as const;
    expect(await runtime.validateInput({ state, input })).toMatchObject({
      valid: false,
      errorCode: "NOT_YOUR_TURN",
    });
    expect(await runtime.dispatch({ state, input })).toMatchObject({
      kind: "reject",
      errorCode: "NOT_YOUR_TURN",
    });
    expect(() =>
      runtime.project({
        state,
        playerIds: ["outsider"],
        projectionMode: "actionsOnly",
      }),
    ).toThrow("not seated");
    expect(() =>
      runtime.explainInteraction({
        state,
        playerId: "outsider",
        interactionId: "change",
      }),
    ).toThrow("not seated");
    expect(validation).not.toHaveBeenCalled();
    expect(actor).not.toHaveBeenCalled();
    expect(view).not.toHaveBeenCalled();
    expect(
      await runtime.validateInput({
        state,
        input: { ...input, playerId: "seated" },
      }),
    ).toMatchObject({ valid: true });
  });
});
