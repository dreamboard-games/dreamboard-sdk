import { shootTheMoonPath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.scoring-and-outcome-shoot-the-moon",
  description:
    "The player capturing all thirteen Hearts and the Queen scores zero while every opponent scores 26.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: shootTheMoonPath.slice(0, 55),
  when: [shootTheMoonPath[55]],
  then: ({ expect, state }) => {
    const final = state().publicState;
    expect(final.capturedHeartsByPlayer["player-1"]).toBe(13);
    expect(final.queenOfSpadesCapturedBy).toBe("player-1");
    expect(final.moonShooter).toBe("player-1");
    expect(final.pointsByPlayer).toEqual({
      "player-1": 0,
      "player-2": 26,
      "player-3": 26,
      "player-4": 26,
    });
  },
});
