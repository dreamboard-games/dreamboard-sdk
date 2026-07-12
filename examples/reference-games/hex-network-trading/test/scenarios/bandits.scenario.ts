import { defineScenario } from "../testing-types.ts";
import {
  BANDITS_PREFIX_COMMANDS,
  bandits,
} from "../scenario-commands.ts";

export default defineScenario({
  id: "stormtrail.bandits",
  description:
    "A seeded opening 7 lets Player 1 move the Bandits to a district adjacent to two supplied opponents and steal reproducibly from Player 2.",
  setup: { players: 3, seed: 2 },
  given: BANDITS_PREFIX_COMMANDS,
  when: [bandits(0, "northForest", 1)],
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("main");
    expect(view({ seat: 0 }).banditsHexId).toBe("northForest");
    expect(state().publicState.lastSteal).toEqual({
      thiefPlayerId: "player-1",
      victimPlayerId: "player-2",
    });
    expect(view({ seat: 0 }).myLastStolenResourceId).toBe("provisions");
    expect(view({ seat: 0 }).myLastStolenResourceId).toBe(
      view({ seat: 1 }).myLastStolenResourceId,
    );
    expect(view({ seat: 2 }).myLastStolenResourceId).toBeNull();
  },
});
