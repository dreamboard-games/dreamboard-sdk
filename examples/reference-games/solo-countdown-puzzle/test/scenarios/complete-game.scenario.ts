import { charge, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.complete-game",
  description:
    "One keeper charges the station and lights all three beacons before the seventh weather reveal.",
  setup: { players: 1, seed: 3 },
  given: [
    charge,
    repair("beacon-north"),
    repair("beacon-north"),
    repair("beacon-harbor"),
    repair("beacon-harbor"),
    repair("beacon-south"),
  ],
  when: [repair("beacon-south")],
  then: ({ expect, interactions, state, view }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.completed).toBe(true);
    expect(final.energy).toBe(1);
    expect(final.storm).toBe(4);
    expect(final.turnsRemaining).toBe(2);
    expect(final.beacons).toEqual({
      "beacon-north": 2,
      "beacon-harbor": 2,
      "beacon-south": 2,
    });
    expect(final.weatherHistory.map(({ cardId }) => cardId)).toEqual([
      "north-squall",
      "calm-2",
      "south-squall",
      "calm-1",
      "gale-2",
      "gale-1",
    ]);
    expect(final.events).toHaveLength(12);
    expect(final.events[final.events.length - 1]?.id).toBe("countdown-advanced");
    expect(final.outcome?.reason.code).toBe("ALL_BEACONS_LIT");
    expect(final.outcome?.standings).toEqual([
      { playerId: "player-1", rank: 1, result: "win" },
    ]);
    expect(final.outcome?.standings[0]?.score).toBe(undefined);
    expect(final.outcome?.standings[0]?.scoreBreakdown).toBe(undefined);
    expect(view({ seat: 0 }).weatherRemaining).toBe(2);
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
