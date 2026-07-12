import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "./commands.ts";

export const completeGameSetup = {
  players: 2,
  seed: 7,
  setupProfileId: "standard",
} as const;

export default defineScenario({
  id: "lantern-market.complete-game",
  description:
    "Two stall owners complete twelve sealed picks across both rounds from one seeded deck.",
  setup: completeGameSetup,
  given: COMPLETE_GAME_COMMANDS.slice(0, 22),
  when: COMPLETE_GAME_COMMANDS.slice(22),
  then: ({ expect, interactions, state, view }) => {
    const finalState = state();
    expect(finalState.flow.currentPhase).toBe("gameOver");
    expect(finalState.publicState.round).toBe(2);
    expect(finalState.publicState.pick).toBe(6);
    expect(finalState.publicState.totalScoreByPlayer).toEqual({
      "player-1": 21,
      "player-2": 18,
    });
    expect(finalState.publicState.roundScoreByPlayer).toEqual({
      "player-1": 15,
      "player-2": 11,
    });
    expect(finalState.publicState.roundHistory).toEqual([
      {
        round: 1,
        scoreByPlayer: { "player-1": 6, "player-2": 7 },
        cardIdsByPlayer: {
          "player-1": [
            "festival-banner-18",
            "festival-banner-12",
            "lantern-19",
            "lantern-5",
            "lantern-1",
            "tea-cup-2",
          ],
          "player-2": [
            "tea-cup-7",
            "lantern-13",
            "tea-cup-15",
            "festival-banner-14",
            "festival-banner-20",
            "tea-cup-14",
          ],
        },
      },
      {
        round: 2,
        scoreByPlayer: { "player-1": 15, "player-2": 11 },
        cardIdsByPlayer: {
          "player-1": [
            "lantern-18",
            "lantern-12",
            "festival-banner-17",
            "festival-banner-1",
            "lantern-11",
            "festival-banner-7",
          ],
          "player-2": [
            "lantern-15",
            "lantern-6",
            "tea-cup-20",
            "festival-banner-3",
            "lantern-7",
            "tea-cup-10",
          ],
        },
      },
    ]);
    expect(finalState.table.zones.shared["market-deck"]).toHaveLength(36);
    expect(finalState.publicState.outcome).toEqual({
      reason: { code: "TWO_ROUNDS_COMPLETE" },
      standings: [
        {
          playerId: "player-1",
          rank: 1,
          result: "win",
          score: 21,
          scoreBreakdown: [
            { id: "round-1", label: "Round 1", value: 6 },
            { id: "round-2", label: "Round 2", value: 15 },
          ],
        },
        {
          playerId: "player-2",
          rank: 2,
          result: "loss",
          score: 18,
          scoreBreakdown: [
            { id: "round-1", label: "Round 1", value: 7 },
            { id: "round-2", label: "Round 2", value: 11 },
          ],
        },
      ],
    });

    for (const seat of [0, 1]) {
      const playerView = view({ seat });
      expect(playerView.hand).toHaveLength(0);
      expect(playerView.stallByPlayer[`player-${seat + 1}`]).toHaveLength(0);
      expect(
        playerView.scoredHistoryByPlayer[`player-${seat + 1}`],
      ).toHaveLength(12);
      expect(interactions({ seat })).toHaveLength(0);
    }
  },
});
