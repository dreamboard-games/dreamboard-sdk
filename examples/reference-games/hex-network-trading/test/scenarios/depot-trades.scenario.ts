import { defineScenario } from "../testing-types.ts";
import {
  DISCARD_BARRIER_PREFIX_COMMANDS,
  depot,
} from "../scenario-commands.ts";

export const depotReadyPrefix = DISCARD_BARRIER_PREFIX_COMMANDS.slice(0, 172);
export const THREE_DEPOT_TRADES = [
  depot(1, "timber", "brick"),
  depot(1, "timber", "brick"),
  depot(1, "timber", "brick"),
] as const;

export default defineScenario({
  id: "stormtrail.depot-trades",
  description:
    "Player 2 legally performs three independent 3:1 Supply Depot exchanges during one main phase.",
  setup: { players: 3, seed: 1 },
  given: depotReadyPrefix,
  when: THREE_DEPOT_TRADES,
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("main");
    expect(state().flow.activePlayers).toEqual(["player-2"]);
    expect(view({ seat: 1 }).mySupplies).toEqual({
      brick: 3,
      provisions: 6,
      timber: 0,
    });
    expect(
      state().publicState.history
        .slice(-3)
        .map(({ kind }) => kind),
    ).toEqual(["depotTrade", "depotTrade", "depotTrade"]);
  },
});
