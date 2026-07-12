import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.seat-order-two",
  description: "Two crews resolve one shared reading in fixed seat order.",
  setup: { players: 2, seed: 3, setupProfileId: "standard" },
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
  ],
  when: [
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
  then: async ({ expect, probe, state, view }) => {
    expect(state().publicState.round).toBe(2);
    expect(view({ seat: 0 }).activePlayerId).toBe("player-1");
    expect(view({ seat: 0 }).legalSpaceIds.length > 0).toBe(true);
    expect(view({ seat: 1 }).legalSpaceIds).toEqual([]);
    await expect(
      await probe({
        actor: { seat: 1 },
        interactionId: "markCell",
        params: {
          cell: {
            boardId: "survey-grid",
            playerId: { seat: 1 },
            spaceId: "cell-1-1",
          },
        },
      }),
    ).toRejectWith({ errorCode: "NOT_YOUR_TURN" });
  },
});
