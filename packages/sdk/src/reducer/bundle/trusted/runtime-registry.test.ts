import { createGame as createModel } from "../../../reducer";
import { buildMinimalManifest } from "../../lifecycle-test-fixtures";

import { describe, expect, test } from "vitest";
import { z } from "zod";

import { collectTrustedRuntimeRegistry } from "./runtime-registry";

describe("collectTrustedRuntimeRegistry", () => {
  test("preserves typed phase keys while collecting heterogeneous phase registries", () => {
    const setupState = z.object({
      selectedFirstPlayer: z.string().nullable(),
    });
    const playState = z.object({
      actionCount: z.number().int(),
    });
    const contract = createModel({
      manifest: buildMinimalManifest(["setup", "play"] as const),
      state: {
        public: z.object({}),
        private: z.object({}),
        hidden: z.object({}),
      },
      phases: { setup: setupState, play: playState },
    });
    const game = contract.assemble({
      initialPhase: "setup",
      phases: {
        setup: contract.phase("setup").define({
          kind: "player",
          initialState: () => ({ selectedFirstPlayer: null }),
          interactions: {
            chooseFirstPlayer: contract.phase("setup").interaction({
              inputs: {},
              reduce: ({ tx }) => {
                tx.patchPhaseState({ selectedFirstPlayer: "player-1" });
              },
            }),
          },
        }),
        play: contract.phase("play").define({
          kind: "player",
          initialState: () => ({ actionCount: 0 }),
          interactions: {
            takeAction: contract.phase("play").interaction({
              inputs: {},
              reduce: ({ state, tx }) => {
                tx.patchPhaseState({
                  actionCount: state.phase.actionCount + 1,
                });
              },
            }),
          },
        }),
      },
    });

    const registry = collectTrustedRuntimeRegistry(game);
    type PhaseKey = Parameters<typeof registry.phasesByName.get>[0];
    const setupPhaseKey: PhaseKey = "setup";

    expect(setupPhaseKey).toBe("setup");
    // @ts-expect-error phase keys must stay narrowed to "setup" | "play".
    registry.phasesByName.get("scoring");
    expect(registry.phaseEntries.map(([phaseName]) => phaseName)).toEqual([
      "setup",
      "play",
    ]);
    expect(
      registry.phasesByName
        .get("setup")
        ?.interactions.map(([interactionId]) => interactionId),
    ).toEqual(["chooseFirstPlayer"]);
    expect(
      registry.phasesByName.get("play")?.interactions.map(([id]) => id),
    ).toEqual(["takeAction"]);
    expect(registry.phasesByName.get("setup")).not.toHaveProperty("zones");
    expect(registry).not.toHaveProperty("effectsById");
    expect(registry).not.toHaveProperty("continuationsById");
  });
});
