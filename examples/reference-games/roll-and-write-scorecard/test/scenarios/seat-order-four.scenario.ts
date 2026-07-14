import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.seat-order-four",
  description: "Four crews resolve one shared reading in fixed seat order.",
  setup: { players: 4, seed: 3, setupProfileId: "standard" },
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
  ],
  when: [
    {
      actor: { seat: 3 },
      interactionId: "markCell",
      params: {
        cell: {
          boardId: "survey-grid",
          playerId: { seat: 3 },
          spaceId: "cell-2-3",
        },
      },
    },
  ],
  then: ({ expect, state, view }) => {
    expect(state().publicState.round).toBe(2);
    expect(view({ seat: 3 }).activePlayerId).toBe("player-1");
    expect(Object.keys(state().publicState.marks)).toHaveLength(4);
  },
});
