import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract.ts";
import { defineScenario } from "../testing-types.ts";
import { claim } from "./commands.ts";

type ClaimCommand = ReturnType<typeof claim>;

export function defineSoloResultScenario(options: {
  readonly id: string;
  readonly result: "win" | "draw" | "loss";
  readonly commands: readonly ClaimCommand[];
  readonly teamScore: number;
  readonly rivalProgress: number;
}) {
  return defineScenario({
    id: options.id,
    description: `A normal seeded solo game ends in a cooperative ${options.result}.`,
    setup: { players: 1, seed: 1, setupProfileId: "standard" },
    given: options.commands.slice(0, -1),
    when: options.commands.slice(-1),
    then: ({ expect, interactions, state, view }) => {
      const outcome = state().publicState.outcome as GameOutcome<PlayerId>;
      expect(state().flow.currentPhase).toBe("gameOver");
      expect(state().publicState.round).toBe(6);
      expect(state().publicState.rivalProgress).toBe(options.rivalProgress);
      expect(outcome).toEqual({
        reason: { code: "SIX_RIVER_ROUNDS_COMPLETE" },
        standings: [
          {
            playerId: "player-1",
            rank: 1,
            result: options.result,
            score: options.teamScore,
            scoreBreakdown: [
              {
                id: "seat-1-contribution",
                label: "Seat 1 cargo",
                value: options.teamScore,
              },
            ],
          },
        ],
      });
      expect(view({ seat: 0 }).teamScore).toBe(options.teamScore);
      expect(view({ seat: 0 }).rival.progress).toBe(options.rivalProgress);
      expect(interactions({ seat: 0 })).toHaveLength(0);
    },
  });
}
