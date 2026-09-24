import { buildMinimalManifest } from "../../lifecycle-test-fixtures";
import { defineGameDefinition as defineGame } from "../../authoring/game";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  defineGameContract,
  defineInteraction,
  definePhase,
} from "../../authoring";

import { collectTrustedRuntimeRegistry } from "./runtime-registry";

function buildContract<const PhaseNames extends readonly string[]>(
  phaseNames: PhaseNames,
) {
  return defineGameContract({
    manifest: buildMinimalManifest(phaseNames),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: Object.fromEntries(
      phaseNames.map((phaseName) => [phaseName, z.object({})]),
    ) as { [Name in PhaseNames[number]]: z.ZodObject<Record<string, never>> },
  });
}

describe("collectTrustedRuntimeRegistry", () => {
  test("preserves typed phase keys while collecting heterogeneous phase registries", () => {
    const contract = buildContract(["setup", "play"] as const);
    const setupState = z.object({
      selectedFirstPlayer: z.string().nullable(),
    });
    const playState = z.object({
      actionCount: z.number().int(),
    });
    const game = defineGame({
      contract,
      initialPhase: "setup",
      phases: {
        setup: definePhase<typeof contract>()({
          kind: "player",
          state: setupState,
          initialState: () => ({ selectedFirstPlayer: null }),
          interactions: {
            chooseFirstPlayer: defineInteraction<
              typeof contract,
              typeof setupState
            >()({
              inputs: {},
              reduce: ({ state }) => ({
                type: "accept",
                state: {
                  ...state,
                  phase: { selectedFirstPlayer: "player-1" },
                },
              }),
            }),
          },
          zones: ["hand"],
        }),
        play: definePhase<typeof contract>()({
          kind: "player",
          state: playState,
          initialState: () => ({ actionCount: 0 }),
          interactions: {
            takeAction: defineInteraction<typeof contract, typeof playState>()({
              inputs: {},
              reduce: ({ state }) => ({
                type: "accept",
                state: {
                  ...state,
                  phase: { actionCount: state.phase.actionCount + 1 },
                },
              }),
            }),
          },
          zones: ["hand"],
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
    expect(registry.phasesByName.get("setup")?.zones).toEqual(["hand"]);
    expect(registry).not.toHaveProperty("effectsById");
    expect(registry).not.toHaveProperty("continuationsById");
  });
});
