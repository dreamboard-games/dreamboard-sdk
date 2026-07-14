import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.technique-brainstorm",
  description:
    "A purchased Brainstorm cycles into a later hand and draws three cards when played.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 26),
  when: COMPLETE_GAME_COMMANDS.slice(26, 27),
  then: ({ expect, state, view }) => {
    expect(view({ seat: 0 }).myHand).toHaveLength(7);
    expect(view({ seat: 0 }).inPlayCardsByPlayerId["player-1"]).toContain(
      "brainstorm-1",
    );
    expect(state().phase.actionsLeft).toBe(0);
  },
});
