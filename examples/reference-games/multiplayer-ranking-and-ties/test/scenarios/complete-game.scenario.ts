import { fourPlayerCompletePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.complete-game",
  description:
    "Four organizers complete six seeded rounds with public rows, a final refill, score components, tie-break evidence, and competition ranks.",
  setup: { players: 4, seed: 2 },
  given: fourPlayerCompletePath.slice(0, 23),
  when: [fourPlayerCompletePath[23]],
  then: ({ expect, interactions, state, view }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.round).toBe(6);
    expect(final.market.filter((cardId) => cardId !== null)).toHaveLength(4);
    for (const playerId of final.playerIds) {
      expect(final.festivalRows[playerId]).toHaveLength(6);
    }
    expect(final.events[final.events.length - 2]?.kind).toBe("market-refilled");
    expect(final.events[final.events.length - 1]?.kind).toBe("festival-scored");
    expect(final.outcome?.reason.code).toBe("SIX_ROUNDS_COMPLETE");
    expect(final.outcome?.standings.map(({ rank }) => rank)).toEqual([1, 2, 3, 4]);
    expect(final.outcome?.standings[0]).toMatchObject({
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 22,
      scoreBreakdown: [
        { id: "stall-prestige", label: "Stall prestige", value: 11 },
        { id: "guild-set-points", label: "Guild set points", value: 8 },
        { id: "coin-bonus", label: "Coin bonus", value: 3 },
      ],
      tieBreaks: [
        {
          id: "complete-guild-sets",
          label: "Complete guild sets",
          value: 2,
        },
        { id: "coins", label: "Coins", value: 3 },
      ],
    });
    expect(view({ seat: 0 }).festivalRows["player-1"]).toHaveLength(6);
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
