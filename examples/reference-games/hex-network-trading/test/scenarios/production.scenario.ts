import { defineScenario } from "../testing-types.ts";
import { PRODUCTION_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "stormtrail.production",
  description:
    "A legal seeded replay exercises every numbered terrain, all four no-token totals, and Bandits suppression without injected dice.",
  setup: { players: 3, seed: 1 },
  checkpoints: {
    produced: { segment: "given", completed: 7 },
  },
  given: PRODUCTION_COMMANDS.slice(0, -1),
  when: PRODUCTION_COMMANDS.slice(-1),
  then: ({ expect, state }) => {
    expect(state().flow.currentPhase).toBe("main");
    expect(state().publicState.turnNumber).toBe(93);
    expect(state().publicState.lastRoll).toEqual({ dice: [1, 1], total: 2 });
    expect(state().publicState.lastProduction).toEqual([]);
    const productionSummaries = state()
      .publicState.history.filter(({ kind }) => kind === "production")
      .map(({ summary }) => summary);
    expect(productionSummaries).toContain("Roll 4 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 5 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 6 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 8 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 9 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 10 produced 1 supplies.");
    expect(productionSummaries).toContain("Roll 2 produced no supplies.");
    expect(productionSummaries).toContain("Roll 3 produced no supplies.");
    expect(productionSummaries).toContain("Roll 11 produced no supplies.");
    expect(productionSummaries).toContain("Roll 12 produced no supplies.");
  },
});
