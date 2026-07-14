import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.technique-studio",
  description:
    "Studio spends one action, draws one card, and grants two actions for a legal chain.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 60),
  when: COMPLETE_GAME_COMMANDS.slice(60, 61),
  then: ({ expect, state, view }) => {
    expect(state().phase.actionsLeft).toBe(2);
    expect(view({ seat: 1 }).myHand).toHaveLength(5);
    expect(view({ seat: 1 }).inPlayCardsByPlayerId["player-2"]).toContain(
      "studio-2",
    );
  },
});
