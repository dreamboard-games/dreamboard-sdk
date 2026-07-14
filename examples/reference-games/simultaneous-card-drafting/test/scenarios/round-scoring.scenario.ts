import { defineScenario } from "../testing-types.ts";
import { ROUND_SCORING_COMMANDS } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.round-scoring",
  description:
    "Round one scores two banner triples, two tea pairs, lantern singles, and leftovers before clearing.",
  setup: { players: 3, seed: 2, setupProfileId: "standard" },
  given: ROUND_SCORING_COMMANDS.slice(0, 15),
  when: ROUND_SCORING_COMMANDS.slice(15),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("drafting");
    expect(state().publicState.round).toBe(2);
    expect(state().publicState.pick).toBe(1);
    expect(state().publicState.totalScoreByPlayer).toEqual({
      "player-1": 18,
      "player-2": 10,
      "player-3": 11,
    });
    expect(state().publicState.roundHistory).toEqual([
      {
        round: 1,
        scoreByPlayer: {
          "player-1": 18,
          "player-2": 10,
          "player-3": 11,
        },
        cardIdsByPlayer: {
          "player-1": [
            "festival-banner-14",
            "festival-banner-1",
            "festival-banner-2",
            "festival-banner-11",
            "festival-banner-13",
            "festival-banner-18",
          ],
          "player-2": [
            "tea-cup-1",
            "tea-cup-15",
            "festival-banner-5",
            "tea-cup-17",
            "tea-cup-3",
            "festival-banner-16",
          ],
          "player-3": [
            "lantern-8",
            "festival-banner-15",
            "lantern-16",
            "lantern-4",
            "tea-cup-8",
            "tea-cup-2",
          ],
        },
      },
    ]);
    for (const seat of [0, 1, 2]) {
      const playerId = `player-${seat + 1}`;
      expect(view({ seat }).stallByPlayer[playerId]).toHaveLength(0);
      expect(view({ seat }).scoredHistoryByPlayer[playerId]).toHaveLength(6);
      expect(view({ seat }).hand).toHaveLength(6);
    }
    expect(state().table.zones.shared["market-deck"]).toHaveLength(24);
  },
});
