import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "draft-one-pick",
  description: "After setup, four players can submit one drafting pick each",
  from: "initial-turn",
  phase: "drafting",
  when: async ({ game, seat, view }) => {
    const pick = (playerIndex: number) => {
      const hand = view(seat(playerIndex)).hand;
      const cardId = hand[0]?.id;
      if (!cardId) throw new Error(`No card in hand for seat ${playerIndex}`);
      return game.submit(seat(playerIndex), "submit", {
        useChopsticks: "no",
        cardIds: [cardId],
      });
    };
    await pick(0);
    await pick(1);
    await pick(2);
    await pick(3);
  },
  then: ({ expect, state, view, seat }) => {
    expect(state()).toBe("drafting");
    expect(view(seat(0)).handCount).toBe(7);
  },
});
