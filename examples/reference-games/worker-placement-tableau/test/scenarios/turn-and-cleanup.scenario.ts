import { defineScenario } from "../testing-types.ts";
import { pass, place } from "./commands.ts";

export const TURN_CLEANUP_COMMANDS = [
  // Season 1: player 1 passes and player 2 finishes alone.
  pass(0),
  place(1, "ordinary-p2-1", "timberYard"),
  place(1, "ordinary-p2-2", "stoneYard"),
  place(1, "master-p2", "patronSquare"),
  // Season 2 reverses those roles after first-player alternation.
  pass(1),
  place(0, "ordinary-p1-1", "timberYard"),
  place(0, "ordinary-p1-2", "stoneYard"),
  place(0, "master-p1", "patronSquare"),
  // Seasons 3 and 4 repeat the skip/continue branch with alternating starts.
  pass(0),
  place(1, "ordinary-p2-1", "timberYard"),
  place(1, "ordinary-p2-2", "stoneYard"),
  place(1, "master-p2", "patronSquare"),
  pass(1),
  place(0, "ordinary-p1-1", "timberYard"),
  place(0, "ordinary-p1-2", "stoneYard"),
  place(0, "master-p1", "patronSquare"),
] as const;

export default defineScenario({
  id: "mosaic-workshop.turn-and-cleanup",
  description:
    "Pass, skip, solo continuation, cleanup, and alternation repeat for four seasons.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: TURN_CLEANUP_COMMANDS.slice(0, 4),
  when: TURN_CLEANUP_COMMANDS.slice(4),
  then: ({ expect, state }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(state().publicState.season).toBe(4);
    expect(state().publicState.firstPlayerId).toBe("player-2");
    expect(state().publicState.activePlayerId).toBe(null);
    expect(state().publicState.passedPlayerIds).toEqual([]);
    expect(
      Object.values(state().publicState.workerLocations).every(
        (x) => x === null,
      ),
    ).toBe(true);
    expect(
      state().publicState.events.filter(
        ({ kind }) => kind === "seasonCompleted",
      ),
    ).toHaveLength(4);
  },
});
