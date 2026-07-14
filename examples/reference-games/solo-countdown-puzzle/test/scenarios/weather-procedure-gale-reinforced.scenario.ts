import { reinforce } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-gale-reinforced",
  description:
    "A stored reinforcement prevents the entire Gale and is consumed.",
  setup: { players: 1, seed: 4 },
  given: [],
  when: [reinforce],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.energy).toBe(3);
    expect(final.reinforcement).toBe(false);
    expect(final.storm).toBe(0);
    expect(final.events.map(({ id }) => id)).toEqual([
      "reinforcement-held",
      "countdown-advanced",
    ]);
    expect(final.events[0]?.weatherCardId).toBe("gale-3");
  },
});
