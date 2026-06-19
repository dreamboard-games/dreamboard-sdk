import { defineBase } from "../testing-types.ts";

// Browser screenshot base: enter buy mode with treasure cards already played,
// so supply cards render as live buy targets instead of a greyed action hand.
export default defineBase({
  id: "after-play-all-treasures",
  extends: "initial-turn",
  setup: async ({ game, seat }) => {
    const player1 = seat(0);
    await game.submit(player1, "endActionPhase", {});
    await game.submit(player1, "playAllTreasures", {});
  },
});
