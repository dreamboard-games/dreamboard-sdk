import { charge, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.complete-game-loss-storm",
  description:
    "The sixth unblocked dangerous card is a South Squall whose dimming finishes before storm loss and before any final countdown step.",
  setup: { players: 1, seed: 4 },
  given: [
    charge,
    repair("beacon-harbor"),
    repair("beacon-south"),
    repair("beacon-south"),
    charge,
    repair("beacon-north"),
    charge,
  ],
  when: [repair("beacon-north")],
  then: ({ expect, interactions, state }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.storm).toBe(6);
    expect(final.turnsRemaining).toBe(1);
    expect(final.weatherHistory).toHaveLength(8);
    expect(final.weatherHistory[final.weatherHistory.length - 1]?.cardId).toBe(
      "south-squall",
    );
    expect(final.events[final.events.length - 2]).toMatchObject({
      id: "storm-advanced",
      weatherCardId: "south-squall",
      previousValue: 5,
      nextValue: 6,
    });
    expect(final.events[final.events.length - 1]).toMatchObject({
      id: "beacon-dimmed",
      weatherCardId: "south-squall",
      beaconId: "beacon-south",
      previousValue: 2,
      nextValue: 1,
    });
    expect(final.outcome?.reason.code).toBe("STORM_REACHED_LIGHTHOUSE");
    expect(final.outcome?.standings).toEqual([
      { playerId: "player-1", rank: 1, result: "loss" },
    ]);
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
