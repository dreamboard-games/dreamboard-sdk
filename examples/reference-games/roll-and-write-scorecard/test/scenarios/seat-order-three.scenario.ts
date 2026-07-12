import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.seat-order-three",
  description: "Three crews cannot skip an earlier seat on a shared reading.",
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
  ],
  when: [
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
  ],
  then: ({ expect, state, view }) => {
    expect(state().publicState.round).toBe(2);
    expect(view({ seat: 2 }).activePlayerId).toBe("player-1");
    expect(Object.keys(state().publicState.marks)).toHaveLength(3);
  },
});
