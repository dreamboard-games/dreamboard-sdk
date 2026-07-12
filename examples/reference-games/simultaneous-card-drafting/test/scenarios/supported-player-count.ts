import { defineScenario } from "../testing-types.ts";
import type { submit } from "./commands.ts";

export function supportedPlayerCountScenario(
  players: 2 | 3 | 4 | 5,
  commands: readonly ReturnType<typeof submit>[],
) {
  return defineScenario({
    id: `lantern-market.supported-player-count-${players}`,
    description: `${players} players complete both six-pick rounds from the same sixty-card recipe.`,
    setup: { players, seed: 29, setupProfileId: "standard" },
    given: commands.slice(0, -players),
    when: commands.slice(-players),
    then: ({ expect, state, view }) => {
      const table = state().table;
      const cards = Object.values(table.cards);
      expect(cards).toHaveLength(60);
      expect(
        cards.filter((card) => card.properties.family === "lantern"),
      ).toHaveLength(20);
      expect(
        cards.filter((card) => card.properties.family === "tea-cup"),
      ).toHaveLength(20);
      expect(
        cards.filter((card) => card.properties.family === "festival-banner"),
      ).toHaveLength(20);
      expect(state().flow.currentPhase).toBe("gameOver");
      expect(state().publicState.roundHistory).toHaveLength(2);
      expect(state().publicState.outcome?.reason).toEqual({
        code: "TWO_ROUNDS_COMPLETE",
      });
      expect(table.zones.shared["market-deck"]).toHaveLength(60 - players * 12);
      for (let seat = 0; seat < players; seat += 1) {
        expect(view({ seat }).hand).toHaveLength(0);
        expect(view({ seat }).handCountByPlayer).toEqual(
          Object.fromEntries(
            Array.from({ length: players }, (_, index) => [
              `player-${index + 1}`,
              0,
            ]),
          ),
        );
        expect(
          view({ seat }).scoredHistoryByPlayer[`player-${seat + 1}`],
        ).toHaveLength(12);
      }
    },
  });
}
