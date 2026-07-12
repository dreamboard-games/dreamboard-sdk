import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.technique-studio-visit",
  description:
    "Studio Visit exposes only a legal cost-four-or-less supply target and gains it to discard.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 72),
  when: COMPLETE_GAME_COMMANDS.slice(72, 73),
  then: ({ expect, state, view }) => {
    expect(state().phase.pendingTechnique).toBeNull();
    expect(view({ seat: 0 }).discardCardsByPlayerId["player-1"]).toContain(
      "sketch-3",
    );
  },
});
