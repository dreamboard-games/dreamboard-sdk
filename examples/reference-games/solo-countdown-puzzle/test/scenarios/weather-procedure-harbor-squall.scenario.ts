import { repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-harbor-squall",
  description:
    "An unblocked Harbor Squall advances storm and dims a lit harbor beacon before countdown.",
  setup: { players: 1, seed: 26 },
  given: [],
  when: [repair("beacon-harbor")],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.storm).toBe(1);
    expect(final.beacons["beacon-harbor"]).toBe(0);
    expect(final.weatherHistory[0]?.cardId).toBe("harbor-squall");
    expect(final.events.map(({ id }) => id)).toEqual([
      "storm-advanced",
      "beacon-dimmed",
      "countdown-advanced",
    ]);
  },
});
