import { completeGamePath } from "../scenario-paths.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "hearts.setup-and-pass",
  description:
    "A seeded 52-card round-robin deal resolves four sealed three-card commitments left in one atomic barrier.",
  setup: { players: 4, seed: 1, setupProfileId: "default" },
  given: completeGamePath.slice(0, 3),
  when: [completeGamePath[3]],
  then: ({ expect, interactions, state, view }) => {
    expect(state().flow.currentPhase).toBe("playing");
    expect(state().flow.activePlayers).toEqual(["player-2"]);
    const seen = new Set<string>();
    for (const seat of [0, 1, 2, 3] as const) {
      const playerView = view({ seat });
      expect(playerView.hand).toHaveLength(13);
      expect(Object.values(playerView.handCountByPlayer)).toEqual([
        13, 13, 13, 13,
      ]);
      for (const card of playerView.hand) seen.add(card.id);
    }
    expect(seen.size).toBe(52);
    const passedBySeat = [
      ["clubs-6", "diamonds-10", "hearts-10"],
      ["diamonds-2", "spades-3", "diamonds-8"],
      ["hearts-8", "clubs-4", "spades-K"],
      ["diamonds-4", "clubs-7", "hearts-9"],
    ] as const;
    for (const seat of [0, 1, 2, 3] as const) {
      const ids = view({ seat }).hand.map(({ id }) => id);
      for (const incoming of passedBySeat[(seat + 3) % 4] ?? []) {
        expect(ids.includes(incoming)).toBe(true);
      }
      for (const outgoing of passedBySeat[seat]) {
        expect(ids.includes(outgoing)).toBe(false);
      }
    }
    expect(interactions({ seat: 1 })[0]?.interactionId).toBe("playCard");
    expect(interactions({ seat: 0 })[0]?.availability?.status).toBe(
      "notYourTurn",
    );
  },
});
