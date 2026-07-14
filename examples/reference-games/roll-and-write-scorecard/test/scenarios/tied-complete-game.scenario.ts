import { defineScenario } from "../testing-types.ts";

const cells = [
  "cell-1-0",
  "cell-1-1",
  "cell-0-1",
  "cell-2-0",
  "cell-1-2",
  "cell-2-3",
  "cell-1-3",
  "cell-2-1",
] as const;

function mark(seat: 0 | 1, spaceId: (typeof cells)[number]) {
  return {
    actor: { seat },
    interactionId: "markCell" as const,
    params: {
      cell: {
        boardId: "survey-grid" as const,
        playerId: { seat },
        spaceId,
      },
    },
  };
}

const commands = cells.flatMap((spaceId) => [
  mark(0, spaceId),
  mark(1, spaceId),
]);

export default defineScenario({
  id: "cloudline.tied-complete-game",
  description:
    "Two crews make the same eight legal marks and share rank one at final scoring.",
  setup: { players: 2, seed: 3, setupProfileId: "standard" },
  given: commands.slice(0, -2),
  when: commands.slice(-2),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(
      state().publicState.outcome?.standings.map(
        ({ playerId, rank, result, score }) => ({
          playerId,
          rank,
          result,
          score,
        }),
      ),
    ).toEqual([
      { playerId: "player-1", rank: 1, result: "draw", score: 14 },
      { playerId: "player-2", rank: 1, result: "draw", score: 14 },
    ]);
    expect(view({ seat: 0 }).marksByPlayer).toEqual(
      view({ seat: 1 }).marksByPlayer,
    );
  },
});
