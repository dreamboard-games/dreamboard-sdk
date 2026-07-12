import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.trick-resolution",
  description:
    "Ace-high lead-suit comparison and a later penalty trick resolve atomically to the winner and next leader.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 23),
  when: [completeGamePath[23]],
  then: ({ expect, state, view }) => {
    const history = state().publicState.trickHistory;
    expect(history).toHaveLength(5);
    expect(history[0]).toMatchObject({
      leadSuit: "clubs",
      winnerPlayerId: "player-3",
      heartsCaptured: 0,
      queenOfSpadesCaptured: false,
    });
    expect(history[0]?.plays.map(({ cardId }) => cardId)).toEqual([
      "clubs-2",
      "clubs-A",
      "clubs-10",
      "clubs-3",
    ]);
    expect(history[4]).toMatchObject({
      leadSuit: "spades",
      winnerPlayerId: "player-4",
      heartsCaptured: 1,
    });
    expect(state().publicState.capturedHeartsByPlayer["player-4"]).toBe(1);
    expect(state().publicState.heartsBroken).toBe(true);
    expect(state().flow.activePlayers).toEqual(["player-4"]);
    expect(view({ seat: 0 }).currentTrick).toHaveLength(0);
  },
});
