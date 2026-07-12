import { repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.weather-procedure-north-squall",
  description:
    "An unblocked North Squall advances storm and dims a lit north beacon before countdown.",
  setup: { players: 1, seed: 3 },
  given: [],
  when: [repair("beacon-north")],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.storm).toBe(1);
    expect(final.beacons["beacon-north"]).toBe(0);
    expect(final.weatherHistory[0]?.cardId).toBe("north-squall");
    expect(final.events.map(({ id }) => id)).toEqual([
      "storm-advanced",
      "beacon-dimmed",
      "countdown-advanced",
    ]);
    expect(final.events[1]).toMatchObject({
      beaconId: "beacon-north",
      previousValue: 1,
      nextValue: 0,
    });
  },
});
