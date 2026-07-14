import { dawnLossCommands } from "./complete-game-loss-dawn.scenario.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.determinism-and-actors",
  description:
    "A seeded solo replay is deterministic and automatic procedures never introduce a fake actor.",
  setup: { players: 1, seed: 3 },
  given: dawnLossCommands.slice(0, 7),
  when: [dawnLossCommands[7]],
  then: ({ expect, interactions, state }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(state().publicState.outcome?.reason.code).toBe("DAWN_ARRIVED");
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
