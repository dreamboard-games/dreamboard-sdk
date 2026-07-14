import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.buying-and-actionability",
  description:
    "Individual Inspiration plays accumulate a legal budget before one affordable top supply card is bought.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 4),
  when: COMPLETE_GAME_COMMANDS.slice(4, 5),
  then: ({ expect, state, view }) => {
    expect(state().phase.inspiration).toBe(0);
    expect(state().phase.buysLeft).toBe(0);
    expect(view({ seat: 0 }).discardCardsByPlayerId["player-1"]).toContain(
      "studio-1",
    );
  },
});
