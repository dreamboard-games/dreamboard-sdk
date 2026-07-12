import { defineScenario } from "../testing-types.ts";
import { submit } from "./commands.ts";

export default defineScenario({
  id: "lantern-market.barrier-actionability",
  description:
    "Three players commit in non-seat order before one atomic reveal and left pass.",
  setup: { players: 3, seed: 7, setupProfileId: "standard" },
  given: [
    submit(2, "lantern-13"),
    submit(0, "festival-banner-18"),
    submit(1, "tea-cup-7"),
  ],
  when: [],
  then: async ({ expect, interactions, probe, state, view }) => {
    expect(state().publicState.pick).toBe(2);
    expect(
      Object.fromEntries(
        Object.entries(view({ seat: 0 }).stallByPlayer).map(
          ([playerId, cards]) => [playerId, cards.map(({ id }) => id)],
        ),
      ),
    ).toEqual({
      "player-1": ["festival-banner-18"],
      "player-2": ["tea-cup-7"],
      "player-3": ["lantern-13"],
    });
    for (const seat of [0, 1, 2]) {
      expect(view({ seat }).hand).toHaveLength(5);
      expect(interactions({ seat })).toHaveLength(1);
    }
    const stale = await probe(submit(2, "lantern-13"));
    expect(stale).toRejectWith({ errorCode: "CARD_TARGET_NOT_ELIGIBLE" });
  },
});
