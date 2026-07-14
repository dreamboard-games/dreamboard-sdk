import { repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-south-squall",
  description:
    "An unblocked South Squall advances storm and dims a lit south beacon before countdown.",
  setup: { players: 1, seed: 12 },
  given: [],
  when: [repair("beacon-south")],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.storm).toBe(1);
    expect(final.beacons["beacon-south"]).toBe(0);
    expect(final.weatherHistory[0]?.cardId).toBe("south-squall");
    expect(final.events.map(({ id }) => id)).toEqual([
      "storm-advanced",
      "beacon-dimmed",
      "countdown-advanced",
    ]);
  },
});
