import { defineScenario } from "../testing-types.ts";
import { pass } from "./commands.ts";

export const COMPLETE_DRAW_COMMANDS = [
  pass(0),
  pass(1),
  pass(1),
  pass(0),
  pass(0),
  pass(1),
  pass(1),
  pass(0),
] as const;

export default defineScenario({
  id: "mosaic-workshop.complete-game-draw",
  description:
    "Both workshops pass through all four seasons and share rank one.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: COMPLETE_DRAW_COMMANDS.slice(0, 4),
  when: COMPLETE_DRAW_COMMANDS.slice(4),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(view({ seat: 0 }).finalScoreByPlayer).toEqual({
      "player-1": 0,
      "player-2": 0,
    });
    expect(view({ seat: 0 }).outcome?.standings).toEqual([
      {
        playerId: "player-1",
        rank: 1,
        result: "draw",
        score: 0,
        scoreBreakdown: [
          { id: "printed-prestige", label: "Printed Prestige", value: 0 },
          { id: "harmony-prestige", label: "Harmony Prestige", value: 0 },
        ],
      },
      {
        playerId: "player-2",
        rank: 1,
        result: "draw",
        score: 0,
        scoreBreakdown: [
          { id: "printed-prestige", label: "Printed Prestige", value: 0 },
          { id: "harmony-prestige", label: "Harmony Prestige", value: 0 },
        ],
      },
    ]);
  },
});
