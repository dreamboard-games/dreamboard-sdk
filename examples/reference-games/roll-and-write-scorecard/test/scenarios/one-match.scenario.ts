import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.one-match",
  description: "After one six is marked, the later six has exactly one target.",
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
  ],
  when: [],
  then: ({ expect, view }) => {
    expect(view({ seat: 0 }).round).toBe(6);
    expect(view({ seat: 0 }).roll?.total).toBe(6);
    expect(view({ seat: 0 }).legalSpaceIds).toEqual(["cell-2-3"]);
  },
});
