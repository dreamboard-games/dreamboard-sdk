import { defineScenario } from "../testing-types.ts";
import { craft, pass, place } from "./commands.ts";

export const COMPLETE_GAME_COMMANDS = [
  // Season 1: gather, craft the first frame, then finish the season.
  place(0, "ordinary-p1-1", "timberYard"),
  pass(1),
  craft(0, "ordinary-p1-2", "timberFrame", "cell-r0-c0"),
  place(0, "master-p1", "stoneYard"),
  // Season 2 begins with player 2, then player 1 develops a relief.
  pass(1),
  place(0, "ordinary-p1-1", "patronSquare"),
  craft(0, "ordinary-p1-2", "stoneRelief", "cell-r0-c1"),
  place(0, "master-p1", "timberYard"),
  // Season 3 adds the first adjacency-constrained mosaic.
  place(0, "ordinary-p1-1", "timberYard"),
  pass(1),
  place(0, "ordinary-p1-2", "stoneYard"),
  craft(0, "master-p1", "joinedMosaic", "cell-r1-c0"),
  // Season 4 demonstrates ordinary/master sharing at the bench.
  pass(1),
  craft(0, "ordinary-p1-1", "timberFrame", "cell-r1-c1"),
  craft(0, "master-p1", "joinedMosaic", "cell-r0-c2"),
  pass(0),
] as const;

export default defineScenario({
  id: "mosaic-workshop.complete-game",
  description: "A deterministic four-season arc ends in a scored unique win.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
    "first-craft": { segment: "given", completed: 3 },
    "season-two": { segment: "given", completed: 4 },
    developed: { segment: "given", completed: 8 },
    "late-game": { segment: "when", completed: 6 },
    contention: { segment: "when", completed: 7 },
    "game-over": { segment: "when", completed: 8 },
  },
  given: COMPLETE_GAME_COMMANDS.slice(0, 8),
  when: COMPLETE_GAME_COMMANDS.slice(8),
  then: ({ expect, interactions, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(state().publicState.season).toBe(4);
    expect(state().publicState.passedPlayerIds).toEqual([]);
    expect(Object.values(state().publicState.workerLocations)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(view({ seat: 0 }).finalScoreByPlayer).toEqual({
      "player-1": 20,
      "player-2": 0,
    });
    expect(view({ seat: 0 }).outcome).toEqual({
      reason: { code: "FOUR_SEASONS_COMPLETE" },
      standings: [
        {
          playerId: "player-1",
          rank: 1,
          result: "win",
          score: 20,
          scoreBreakdown: [
            { id: "printed-prestige", label: "Printed Prestige", value: 15 },
            { id: "harmony-prestige", label: "Harmony Prestige", value: 5 },
          ],
        },
        {
          playerId: "player-2",
          rank: 2,
          result: "loss",
          score: 0,
          scoreBreakdown: [
            { id: "printed-prestige", label: "Printed Prestige", value: 0 },
            { id: "harmony-prestige", label: "Harmony Prestige", value: 0 },
          ],
        },
      ],
    });
    expect(interactions({ seat: 0 })).toHaveLength(0);
    expect(interactions({ seat: 1 })).toHaveLength(0);
  },
});
