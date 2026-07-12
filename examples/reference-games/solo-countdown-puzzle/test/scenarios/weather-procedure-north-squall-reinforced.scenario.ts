import { reinforce, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-north-squall-reinforced",
  description:
    "A stored reinforcement prevents every effect of a North Squall and is consumed.",
  setup: { players: 1, seed: 6 },
  given: [repair("beacon-north")],
  when: [reinforce],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.storm).toBe(0);
    expect(final.beacons["beacon-north"]).toBe(1);
    expect(final.reinforcement).toBe(false);
    expect(final.weatherHistory.map(({ cardId }) => cardId)).toEqual([
      "calm-2",
      "north-squall",
    ]);
    expect(final.events.map(({ id }) => id)).toEqual([
      "weather-calm",
      "countdown-advanced",
      "reinforcement-held",
      "countdown-advanced",
    ]);
  },
});
