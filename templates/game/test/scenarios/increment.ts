import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";
import game from "../../app/game";
const { defineScenario } = createScenarioAuthoring(game);
export default defineScenario({
  id: "counter.increment",
  setup: { players: 1, seed: 1 },
  checkpoints: { incremented: { segment: "when", completed: 1 } },
  given: [],
  when: [{ actor: { seat: 0 }, interactionId: "increment", params: {} }],
  then: ({ expect, view }) => {
    expect(view({ seat: 0 }).count).toBe(1);
  },
});
