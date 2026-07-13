import { reinforce } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-calm",
  description: "Calm reveals normally and preserves stored reinforcement.",
  setup: { players: 1, seed: 1 },
  given: [],
  when: [reinforce],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.energy).toBe(3);
    expect(final.reinforcement).toBe(true);
    expect(final.storm).toBe(0);
    expect(final.weatherHistory.map(({ cardId }) => cardId)).toEqual([
      "calm-1",
    ]);
    expect(final.events.map(({ id }) => id)).toEqual([
      "weather-calm",
      "countdown-advanced",
    ]);
  },
});
