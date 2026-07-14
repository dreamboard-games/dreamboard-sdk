import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "cloudline.seat-order-one",
  description: "A solo round immediately advances to the next weather reading.",
  setup: { players: 1, seed: 3, setupProfileId: "standard" },
  given: [],
  when: [
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
  then: ({ expect, state, view }) => {
    expect(state().publicState.round).toBe(2);
    expect(view({ seat: 0 }).activePlayerId).toBe("player-1");
    expect(Object.keys(view({ seat: 0 }).myMarks)).toHaveLength(1);
  },
});
