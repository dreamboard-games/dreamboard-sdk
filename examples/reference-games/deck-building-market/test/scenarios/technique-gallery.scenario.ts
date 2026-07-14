import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.technique-gallery",
  description:
    "Gallery draws a card while preserving the action and adding one buy and inspiration.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 124),
  when: COMPLETE_GAME_COMMANDS.slice(124, 125),
  then: ({ expect, state, view }) => {
    expect(state().phase.actionsLeft).toBe(1);
    expect(state().phase.buysLeft).toBe(2);
    expect(state().phase.inspiration).toBe(1);
    expect(view({ seat: 1 }).inPlayCardsByPlayerId["player-2"]).toContain(
      "gallery-1",
    );
  },
});
