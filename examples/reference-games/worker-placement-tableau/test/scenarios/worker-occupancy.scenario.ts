import { defineScenario } from "../testing-types.ts";
import { place } from "./commands.ts";

export default defineScenario({
  id: "mosaic-workshop.worker-occupancy",
  description: "A master may share one ordinary worker's action space.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: [place(0, "ordinary-p1-1", "timberYard")],
  when: [place(1, "master-p2", "timberYard")],
  then: ({ expect, state, view }) => {
    expect(view({ seat: 0 }).occupantsBySpace.timberYard).toEqual([
      "master-p2",
      "ordinary-p1-1",
    ]);
    expect(state().publicState.activePlayerId).toBe("player-1");
  },
});
