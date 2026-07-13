import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.multiple-matches",
  description: "The first seeded total of six offers both matching cells.",
  setup: { players: 1, seed: 3, setupProfileId: "standard" },
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
    "ready-to-mark": { segment: "given", completed: 0 },
  },
  given: [],
  when: [],
  then: ({ expect, interactions, view }) => {
    expect(view({ seat: 0 }).roll?.total).toBe(6);
    expect(view({ seat: 0 }).legalSpaceIds).toEqual(["cell-1-0", "cell-2-3"]);
    expect(interactions({ seat: 0 })).toHaveLength(1);
  },
});
