import { charge, reinforce, repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export const dawnLossCommands = [
  reinforce,
  repair("beacon-north"),
  charge,
  repair("beacon-north"),
  repair("beacon-harbor"),
  charge,
  repair("beacon-harbor"),
  charge,
] as const;

export default defineScenario({
  id: "last-light.complete-game-loss-dawn",
  description:
    "A stored reinforcement prevents one Squall, so the keeper survives weather but loses when the countdown reaches zero.",
  setup: { players: 1, seed: 3 },
  given: dawnLossCommands.slice(0, 7),
  when: [dawnLossCommands[7]],
  then: ({ expect, interactions, state }) => {
    const domain = state();
    const final = domain.publicState;
    expect(domain.flow.currentPhase).toBe("gameOver");
    expect(final.storm).toBe(5);
    expect(final.turnsRemaining).toBe(0);
    expect(final.weatherHistory).toHaveLength(8);
    expect(final.events[0]).toMatchObject({
      id: "reinforcement-held",
      weatherCardId: "north-squall",
    });
    expect(final.events[final.events.length - 1]).toMatchObject({
      id: "countdown-advanced",
      previousValue: 1,
      nextValue: 0,
    });
    expect(final.outcome?.reason.code).toBe("DAWN_ARRIVED");
    expect(final.outcome?.standings).toEqual([
      { playerId: "player-1", rank: 1, result: "loss" },
    ]);
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
