import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.legality-probes",
  description:
    "Clone-only probes reject wrong actors, wrong personal boards, occupied cells, and non-matching targets.",
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
  when: [],
  then: async ({ expect, probe, state }) => {
    const sourceRound = state().publicState.round;
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
    await expect(
      await probe({
        actor: { seat: 0 },
        interactionId: "markCell",
        params: {
          cell: {
            boardId: "survey-grid",
            playerId: { seat: 1 },
            spaceId: "cell-1-1",
          },
        },
      }),
    ).toRejectWith({ errorCode: "PLAYER_NOT_ACTIVE" });
    await expect(
      await probe({
        actor: { seat: 0 },
        interactionId: "markCell",
        params: {
          cell: {
            boardId: "survey-grid",
            playerId: { seat: 0 },
            spaceId: "cell-0-0",
          },
        },
      }),
    ).toRejectWith({ errorCode: "CELL_DOES_NOT_MATCH_ROLL" });
    await expect(
      await probe({
        actor: { seat: 0 },
        interactionId: "markCell",
        params: {
          cell: {
            boardId: "survey-grid",
            playerId: { seat: 0 },
            spaceId: "cell-1-0",
          },
        },
      }),
    ).toRejectWith({ errorCode: "CELL_ALREADY_MARKED" });
    expect(state().publicState.round).toBe(sourceRound);
  },
});
