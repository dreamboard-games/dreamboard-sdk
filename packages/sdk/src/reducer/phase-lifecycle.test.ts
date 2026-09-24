import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineGameDefinition } from "./authoring/game";
import {
  createReducerBundle,
  defineGameContract,
  definePhase,
  defineInteraction,
  gameEvent,
} from "./internal";
import { buildMinimalManifest, createTable } from "./lifecycle-test-fixtures";

async function lifecycleGame(
  mode: "ignored" | "chain" | "terminal" | "invalid-terminal" | "runaway",
) {
  const observations: unknown[] = [];
  const contract = defineGameContract({
    manifest: buildMinimalManifest(["start", "next", "done"] as const),
    phases: {
      start: z.object({ visits: z.number() }),
      next: z.object({ visits: z.number() }),
      done: z.object({ visits: z.number() }),
    },
    state: {
      public: z.object({ entries: z.number() }),
      private: z.object({}),
      hidden: z.object({}),
    },
  });
  const event = (name: string) =>
    gameEvent.systemAction({ procedureId: name, title: name });
  const outcome = {
    reason: { code: "COMPLETE" },
    standings: [
      { playerId: "player-1", rank: 1, result: "win" as const },
      { playerId: "player-2", rank: 2, result: "loss" as const },
    ],
  };
  const game = defineGameDefinition({
    contract,
    initial: {
      public: () => ({ entries: 0 }),
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "start",
    phases: {
      start: definePhase<typeof contract>()({
        kind: "player",
        state: contract.phases.start,
        initialState: ({ state }) => {
          observations.push([
            "initial",
            state.flow.currentPhase,
            state.runtime.lastTransition,
            state.runtime.simultaneous.current,
          ]);
          return { visits: 1 };
        },
        enter: ({ tx }) => {
          observations.push([
            "enter",
            tx.state.flow.currentPhase,
            tx.state.phase,
          ]);
          tx.emit(event("start"));
        },
        interactions: {
          go: defineInteraction<typeof contract>()({
            inputs: {},
            reduce({ tx }) {
              tx.emit(event("go"));
              if (mode === "ignored") {
                tx.transition("next");
                return;
              }
              if (mode === "terminal" || mode === "invalid-terminal")
                return tx.endGame(outcome, { transition: "done" });
              return tx.transition("next");
            },
          }),
        },
      }),
      next: definePhase<typeof contract>()({
        kind: "auto",
        state: contract.phases.next,
        initialState: ({ state }) => {
          observations.push([
            "initial",
            state.flow.currentPhase,
            state.runtime.lastTransition,
            state.runtime.simultaneous.current,
          ]);
          return { visits: state.publicState.entries + 1 };
        },
        enter: ({ tx }) => {
          observations.push([
            "enter",
            tx.state.flow.currentPhase,
            tx.state.phase,
          ]);
          tx.patchPublicState({ entries: tx.state.publicState.entries + 1 });
          tx.emit(event("next"));
          return tx.transition(
            mode === "runaway" || tx.state.publicState.entries < 2
              ? "next"
              : "done",
          );
        },
      }),
      done: definePhase<typeof contract>()({
        kind: "player",
        state: contract.phases.done,
        initialState: ({ state }) => {
          observations.push([
            "initial",
            state.flow.currentPhase,
            state.runtime.lastTransition,
            state.runtime.simultaneous.current,
          ]);
          return { visits: 99 };
        },
        enter: ({ tx }) => {
          tx.patchPublicState({ entries: tx.state.publicState.entries + 1 });
          tx.emit(event("done"));
          if (mode === "invalid-terminal") return tx.transition("start");
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
  const dispatch = () =>
    bundle.dispatch({
      state: initialized.state,
      input: {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "go",
        params: {},
      },
    });
  return { observations, initialized, dispatch, outcome };
}

describe("direct phase entry", () => {
  test("an unreturned transition result does not schedule a phase", async () => {
    const { initialized, dispatch } = await lifecycleGame("ignored");
    expect(initialized.state.runtime.lastTransition).toBeNull();
    const result = await dispatch();
    if (result.kind !== "accept") throw new Error("Expected acceptance");
    expect(result.state.domain.flow.currentPhase).toBe("start");
    expect(result.events.map((e) => e.procedureId)).toEqual(["go"]);
    expect(result.trace.filter((e) => e.kind === "phaseEntered")).toEqual([]);
  });
  test("every entry resets phase state and exposes destination metadata before initialState", async () => {
    const { observations, initialized, dispatch } =
      await lifecycleGame("chain");
    const original = structuredClone(initialized.state);
    const result = await dispatch();
    if (result.kind !== "accept") throw new Error("Expected acceptance");
    expect(observations).toEqual([
      ["initial", "start", null, null],
      ["enter", "start", { visits: 1 }],
      ["initial", "next", { from: "start", to: "next" }, null],
      ["enter", "next", { visits: 1 }],
      ["initial", "next", { from: "next", to: "next" }, null],
      ["enter", "next", { visits: 2 }],
      ["initial", "done", { from: "next", to: "done" }, null],
    ]);
    expect(result.state.domain.phase).toEqual({ visits: 99 });
    expect(result.state.domain.publicState.entries).toBe(3);
    expect(result.events.map((e) => e.procedureId)).toEqual([
      "go",
      "next",
      "next",
      "done",
    ]);
    expect(result.trace.filter((e) => e.kind === "phaseEntered")).toEqual([
      { kind: "phaseEntered", from: "start", to: "next" },
      { kind: "phaseEntered", from: "next", to: "next" },
      { kind: "phaseEntered", from: "next", to: "done" },
    ]);
    expect(initialized.state).toEqual(original);
    expect(await dispatch()).toEqual(result);
  });
  test("endGame runs its final entry exactly once before terminal projection", async () => {
    const { dispatch, outcome } = await lifecycleGame("terminal");
    const result = await dispatch();
    if (result.kind !== "accept") throw new Error("Expected acceptance");
    expect(result.terminal).toEqual(outcome);
    expect(result.state.domain.publicState.entries).toBe(1);
    expect(result.events.map((e) => e.procedureId)).toEqual(["go", "done"]);
    expect(result.state.domain.flow.currentPhase).toBe("done");
  });
  test("a final entry cannot return another transition", async () => {
    const { dispatch } = await lifecycleGame("invalid-terminal");
    await expect(dispatch()).rejects.toThrow(
      /terminal.*transition|transition.*terminal/i,
    );
  });
  test("runaway phase entry fails at a finite bound", async () => {
    const { initialized, dispatch } = await lifecycleGame("runaway");
    const before = structuredClone(initialized.state);
    await expect(dispatch()).rejects.toThrow(
      "Reducer exceeded 1000 phase entries in one dispatch.",
    );
    expect(initialized.state).toEqual(before);
  });
});
