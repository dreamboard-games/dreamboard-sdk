import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.no-match-fallback",
  description:
    "A repeated eight with its only target occupied accepts an arbitrary empty cell as a failed survey.",
  setup: { players: 1, seed: 1, setupProfileId: "standard" },
  given: [
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-0-2",
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
  ],
  when: [
    {
      actor: { seat: 0 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 0 },
          spaceId: "cell-0-0",
        },
      },
    },
  ],
  then: ({ expect, state }) => {
    expect(state().publicState.marks["player-1"]?.["cell-0-0"]).toEqual({
      kind: "failed",
      round: 4,
    });
    expect(state().publicState.round).toBe(5);
  },
});
