import { defineScenario } from "../testing-types.ts";
import { NETWORK_EXHAUSTION_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "stormtrail.network-and-costs",
  description:
    "Player 1 grows one connected trail network from normal setup until all ten trail pieces have been paid for and placed.",
  setup: { players: 3, seed: 1 },
  given: NETWORK_EXHAUSTION_COMMANDS.slice(0, -1),
  when: NETWORK_EXHAUSTION_COMMANDS.slice(-1),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("main");
    expect(state().publicState.turnNumber).toBe(76);
    expect(view({ seat: 0 }).remainingTrailsByPlayerId["player-1"]).toBe(0);
    expect(
      Object.values(view({ seat: 0 }).trailsByEdgeId).filter(
        (playerId) => playerId === "player-1",
      ).length,
    ).toBe(10);
    expect(view({ seat: 0 }).mySupplies).toEqual({
      brick: 2,
      provisions: 0,
      timber: 0,
    });
  },
});
