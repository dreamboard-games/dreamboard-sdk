import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "./commands.ts";

export const completeGameSetup = {
  players: 2,
  seed: 1,
  setupProfileId: "standard",
} as const;

export default defineScenario({
  id: "river-guild.complete-game",
  description:
    "Two guild members claim cargo in seat order through all six rival rounds.",
  setup: completeGameSetup,
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
    "first-cargo": { segment: "given", completed: 1 },
    midgame: { segment: "given", completed: 6 },
    developed: { segment: "given", completed: 10 },
    "game-over": { segment: "when", completed: 2 },
  },
  given: COMPLETE_GAME_COMMANDS.slice(0, 10),
  when: COMPLETE_GAME_COMMANDS.slice(10),
  then: ({ expect, interactions, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(state().publicState.round).toBe(6);
    expect(state().publicState.procedureEvents).toHaveLength(36);
    expect(state().table.zones.shared["cargo-deck"]).toHaveLength(2);
    expect(state().table.zones.shared["instruction-history"]).toHaveLength(6);
    expect(state().table.zones.shared["rival-claimed"]).toHaveLength(5);
    expect(state().table.zones.shared["rival-discarded"]).toHaveLength(1);
    expect(state().publicState.outcome).toEqual({
      reason: { code: "SIX_RIVER_ROUNDS_COMPLETE" },
      standings: [
        {
          playerId: "player-1",
          rank: 1,
          result: "win",
          score: 24,
          scoreBreakdown: [
            { id: "seat-1-contribution", label: "Seat 1 cargo", value: 10 },
            { id: "seat-2-contribution", label: "Seat 2 cargo", value: 14 },
          ],
        },
        {
          playerId: "player-2",
          rank: 1,
          result: "win",
          score: 24,
          scoreBreakdown: [
            { id: "seat-1-contribution", label: "Seat 1 cargo", value: 10 },
            { id: "seat-2-contribution", label: "Seat 2 cargo", value: 14 },
          ],
        },
      ],
    });
    expect(view({ seat: 0 }).contributionByPlayer).toEqual({
      "player-1": 10,
      "player-2": 14,
    });
    expect(view({ seat: 1 }).teamScore).toBe(24);
    expect(view({ seat: 0 }).rival.progress).toBe(13);
    expect(interactions({ seat: 0 })).toHaveLength(0);
    expect(interactions({ seat: 1 })).toHaveLength(0);
  },
});
