import { charge } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-gale",
  description: "An unblocked Gale advances storm by exactly one.",
  setup: { players: 1, seed: 4 },
  given: [],
  when: [charge],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.energy).toBe(7);
    expect(final.storm).toBe(1);
    expect(final.weatherHistory[0]?.cardId).toBe("gale-3");
    expect(final.events.map(({ id }) => id)).toEqual([
      "storm-advanced",
      "countdown-advanced",
    ]);
  },
});
