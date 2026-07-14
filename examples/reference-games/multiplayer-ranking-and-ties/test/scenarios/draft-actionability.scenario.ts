import { draft } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "harbor-fair.draft-actionability",
  description:
    "Only the active organizer may draft one current market stall; removed and nonmarket cards are rejected.",
  setup: { players: 2, seed: 2 },
  given: [],
  when: [draft(0, "music-p2-c0-2")],
  then: async ({ expect, interactions, probe, state }) => {
    const final = state().publicState;
    expect(final.activePlayerIndex).toBe(1);
    expect(final.festivalRows["player-1"]).toEqual(["music-p2-c0-2"]);
    expect(final.market[0]).toBe("food-p1-c1-2");
    expect(interactions({ seat: 1 })).toHaveLength(1);
    expect(interactions({ seat: 1 })[0]?.interactionId).toBe("draftStall");
    await expect(await probe(draft(0, "food-p1-c1-2"))).toRejectWith({
      errorCode: "NOT_YOUR_TURN",
    });
    await expect(await probe(draft(1, "music-p2-c0-2"))).toRejectWith({
      errorCode: "CARD_TARGET_NOT_ELIGIBLE",
    });
    await expect(await probe(draft(1, "storm-1"))).toRejectWith({
      errorCode: "CARD_TARGET_NOT_ELIGIBLE",
    });
  },
});
