import { defineScenario } from "../testing-types.ts";
import { submit } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.projection-privacy",
  description:
    "A locked card remains sealed until the second player commits and both stalls reveal atomically.",
  setup: { players: 2, seed: 7, setupProfileId: "standard" },
  given: [submit(0, "festival-banner-18")],
  when: [submit(1, "tea-cup-7")],
  then: ({ expect, state, view }) => {
    expect(state().publicState.pick).toBe(2);
    expect(view({ seat: 0 }).stallByPlayer["player-1"]?.[0]?.id).toBe(
      "festival-banner-18",
    );
    expect(view({ seat: 1 }).stallByPlayer["player-2"]?.[0]?.id).toBe(
      "tea-cup-7",
    );
    expect(view({ seat: 0 }).hand).toHaveLength(5);
    expect(view({ seat: 1 }).hand).toHaveLength(5);
  },
});
