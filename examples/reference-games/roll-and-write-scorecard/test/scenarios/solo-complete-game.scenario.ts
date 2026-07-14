import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.solo-complete-game",
  description: "A solo crew completes all eight rounds and wins.",
  setup: { players: 1, seed: 3, setupProfileId: "standard" },
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
  ],
  then: ({ expect, state }) => {
    const outcome = state().publicState.outcome;
    expect(state().flow.currentPhase).toBe("gameOver");
    expect(outcome?.reason.code).toBe("EIGHT_ROUNDS_COMPLETE");
    expect(outcome?.standings).toHaveLength(1);
    expect(outcome?.standings[0]).toMatchObject({
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 14,
    });
  },
});
