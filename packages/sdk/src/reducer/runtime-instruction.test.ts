import { describe, expect, test } from "bun:test";
import { createReducerFx } from "./effects";
import type { RuntimeInstructionForState } from "./core/runtime-instruction";
import { createRuntimeInstructionEngine } from "./engine/runtime-instruction-engine";

type TestInput =
  | {
      kind: "interaction";
      playerId: "player-1";
      interactionId: "start";
      params: Record<string, never>;
    }
  | {
      kind: "continuation";
      continuationId: string;
      resumeData: Record<string, never>;
      source: "effect";
      effectKind: "rollDie";
      response: { value: number };
    };

describe("runtime instruction authoring", () => {
  test("fx.transition returns a flow instruction", () => {
    const fx = createReducerFx<any>({});

    expect(fx.transition("next")).toEqual({
      kind: "flow.transition",
      to: "next",
    });
  });

  test("fx.effect returns a resumable rollDie instruction", () => {
    const fx = createReducerFx<any>({});
    const continuation = {
      id: "afterRoll",
      data: { reason: "test" },
    };

    expect(
      fx.effect(
        {
          type: "rollDie",
          id: "roll",
          __continuation: (() => continuation) as any,
        },
        { dieId: "die-1" },
      ),
    ).toEqual({
      kind: "engine.rollDie",
      dieId: "die-1",
      continuation,
    });
  });

  test("fx.effect omits continuation metadata for fire-and-forget effects", () => {
    const fx = createReducerFx<any>({});
    const instruction = fx.effect(
      {
        type: "rollDie",
        id: "roll",
      },
      { dieId: "die-1" },
    );

    expect(instruction).toEqual({
      kind: "engine.rollDie",
      dieId: "die-1",
    });
    expect("continuation" in instruction).toBe(false);
  });
});

describe("runtime instruction engine", () => {
  test("drains resolver-queued instructions before continuation inputs", () => {
    const visited: string[] = [];
    let prepareCount = 0;
    const engine = createRuntimeInstructionEngine<
      { phase: string },
      "player-1",
      TestInput
    >({
      reduce(state, input) {
        if (input.kind === "interaction") {
          visited.push("interaction");
          return {
            type: "accept",
            state,
            instructions: [{ kind: "flow.transition", to: "next" } as any],
          };
        }
        visited.push("continuation");
        return {
          type: "accept",
          state: { ...state, phase: "continued" },
        };
      },
      resolveInstruction(state, instruction) {
        if (instruction.kind === "flow.transition") {
          visited.push("transition");
          return {
            state: { ...state, phase: instruction.to },
            queuedInputs: [],
            queuedInstructions: [
              {
                kind: "engine.rollDie",
                dieId: "die-1",
                continuation: { id: "afterRoll", data: {} },
              } as RuntimeInstructionForState<{ phase: string }>,
            ],
            trace: [],
          };
        }
        visited.push("rollDie");
        return {
          state,
          queuedInputs: [
            {
              kind: "continuation",
              continuationId: "afterRoll",
              resumeData: {},
              source: "effect",
              effectKind: "rollDie",
              response: { value: 4 },
            },
          ],
          queuedInstructions: [],
          trace: [],
        };
      },
      prepareInstructionState(state) {
        prepareCount++;
        return state;
      },
    });

    const result = engine.dispatch(
      { phase: "start" },
      {
        kind: "interaction",
        playerId: "player-1",
        interactionId: "start",
        params: {},
      },
    );

    expect(result.type).toBe("accept");
    expect(prepareCount).toBe(1);
    expect(visited).toEqual([
      "interaction",
      "transition",
      "rollDie",
      "continuation",
    ]);
    if (result.type === "accept") {
      expect(result.state).toEqual({ phase: "continued" });
      expect(
        result.trace
          .filter((entry) => entry.type === "appliedInstruction")
          .map((entry) => entry.instruction.kind),
      ).toEqual(["flow.transition", "engine.rollDie"]);
    }
  });
});
