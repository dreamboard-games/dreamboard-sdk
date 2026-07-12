import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.complete-game",
  description:
    "Three crews resolve eight seeded weather readings; one completes a row and the lower crews tie.",
  setup: { players: 3, seed: 3, setupProfileId: "standard" },
  given: [
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-1-0",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-2-3",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-1-0",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-1-1",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-3-3",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-3-3",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-0-1",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-3-2",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-3-2",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-2-0",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-2-0",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-2-0",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-1-2",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-1-2",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-1-2",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-2-3",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-1-0",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-2-3",
        },
      },
    },
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-1-3",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-3-0",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-3-0",
        },
      },
    },
  ],
  when: [
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-2-1",
        },
      },
    },
    {
      actor: { seat: 1 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 1 },
          spaceId: "cell-2-1",
        },
      },
    },
    {
      actor: { seat: 2 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 2 },
          spaceId: "cell-2-1",
        },
      },
    },
  ],
  then: ({ expect, interactions, state, view }) => {
    const final = state().publicState;
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(final.completed).toBe(true);
    expect(final.scores?.["player-1"]).toEqual({
      total: 14,
      components: {
        "complete-rows": 6,
        "complete-columns": 0,
        "largest-region": 8,
        "failed-surveys": 0,
      },
    });
    expect(
      final.outcome?.standings.map(({ rank, result, score }) => ({
        rank,
        result,
        score,
      })),
    ).toEqual([
      { rank: 1, result: "win", score: 14 },
      { rank: 2, result: "loss", score: 4 },
      { rank: 2, result: "loss", score: 4 },
    ]);
    expect(final.outcome?.reason.code).toBe("EIGHT_ROUNDS_COMPLETE");
    expect(Object.keys(view({ seat: 0 }).marksByPlayer)).toHaveLength(3);
    expect(view({ seat: 0 }).activePlayerId).toBe(null);
    expect(view({ seat: 0 }).legalSpaceIds).toEqual([]);
    expect(view({ seat: 0 }).marksByPlayer).toEqual(
      view({ seat: 2 }).marksByPlayer,
    );
    expect(interactions({ seat: 0 })).toHaveLength(0);
  },
});
