import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.scoring-and-outcome-ordinary-penalty",
  description:
    "Thirteen Hearts and the Queen of Spades produce exactly 26 ordinary penalty points.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 55),
  when: [completeGamePath[55]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.moonShooter).toBe(null);
    expect(
      Object.values(final.capturedHeartsByPlayer).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(13);
    expect(final.queenOfSpadesCapturedBy).toBe("player-1");
    expect(
      Object.values(final.pointsByPlayer).reduce(
        (sum, points) => sum + points,
        0,
      ),
    ).toBe(26);
  },
});
