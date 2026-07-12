import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.zone-and-reshuffle",
  description:
    "A purchased card enters discard, survives cleanup, and appears in a later hand after deterministic recycling.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 26),
  when: COMPLETE_GAME_COMMANDS.slice(26, 27),
  then: ({ expect, view }) => {
    expect(view({ seat: 0 }).inPlayCardsByPlayerId["player-1"]).toContain(
      "brainstorm-1",
    );
  },
});
